/**
 * Jellyseerr API Client
 *
 * Wrapper untuk komunikasi ke Jellyseerr API.
 * Internal Docker network, jadi gak perlu HTTPS.
 *
 * Reference: https://api-docs.overseerr.dev (Jellyseerr fork dari Overseerr)
 */

import axios, { AxiosInstance } from 'axios';

const JELLYSEERR_URL = process.env.JELLYSEERR_URL!;
const JELLYSEERR_API_KEY = process.env.JELLYSEERR_API_KEY!;

if (!JELLYSEERR_URL || !JELLYSEERR_API_KEY) {
  console.warn('[Jellyseerr] Missing env vars. Pastikan JELLYSEERR_URL dan JELLYSEERR_API_KEY di-set.');
}

// Map Jellyseerr mediaInfo.status ke status kita
// 1=Unknown, 2=Pending, 3=Processing, 4=Partially Available, 5=Available
export const JELLYSEERR_STATUS = {
  UNKNOWN: 1,
  PENDING: 2,
  PROCESSING: 3,
  PARTIALLY_AVAILABLE: 4,
  AVAILABLE: 5,
} as const;

export interface JellyseerrSearchResult {
  page: number;
  totalPages: number;
  totalResults: number;
  results: JellyseerrMediaItem[];
}

export interface JellyseerrMediaItem {
  id: number;
  mediaType: 'movie' | 'tv' | 'person';
  title?: string;          // untuk movie
  name?: string;            // untuk tv
  overview?: string;
  posterPath?: string;
  backdropPath?: string;
  releaseDate?: string;     // movie
  firstAirDate?: string;    // tv
  voteAverage?: number;
  voteCount?: number;
  genreIds?: number[];
  mediaInfo?: {
    id: number;
    tmdbId: number;
    status: number;         // 1-5, lihat JELLYSEERR_STATUS
    requests?: any[];
  };
}

class JellyseerrClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${JELLYSEERR_URL}/api/v1`,
      headers: {
        'X-Api-Key': JELLYSEERR_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    // Logger untuk debugging
    this.client.interceptors.response.use(
      (res) => res,
      (err) => {
        console.error('[Jellyseerr API Error]', err.response?.status, err.response?.data || err.message);
        return Promise.reject(err);
      }
    );
  }

  /**
   * Search movie/TV via Jellyseerr (yang udah include TMDB metadata + library status)
   * Pakai paramsSerializer yang benar buat encode spasi dan reserved chars
   */
async search(query: string, page = 1): Promise<JellyseerrSearchResult> {
    const encodedQuery = encodeURIComponent(query.trim());
    const url = `/search?query=${encodedQuery}&page=${page}&language=en`;
    const { data } = await this.client.get(url);
    return data;
  }

  /**
   * Get trending media (mingguan)
   */
  async getTrending(page = 1): Promise<JellyseerrSearchResult> {
    const { data } = await this.client.get('/discover/trending', {
      params: { page, language: 'en' },
    });
    return data;
  }

  /**
   * Upcoming movies — TMDB upcoming endpoint via Jellyseerr discover
   */
  async getUpcomingMovies(page = 1): Promise<JellyseerrSearchResult> {
    const { data } = await this.client.get('/discover/movies/upcoming', {
      params: { page, language: 'en' },
    });
    return data;
  }

  /**
   * Discover movies (filter by genre, year, network, etc)
   */
  async discoverMovies(params: {
    page?: number;
    genre?: number;
    year?: number;
    studio?: number;     // production company (e.g. 2=Disney, 420=Marvel)
    network?: number;    // streaming network for TV (n/a for movies but kept consistent)
    sortBy?: string;
  } = {}): Promise<JellyseerrSearchResult> {
    const { data } = await this.client.get('/discover/movies', {
      params: { language: 'en', ...params },
    });
    return data;
  }

  /**
   * Discover TV (filter by genre, year, network)
   */
  async discoverTv(params: {
    page?: number;
    genre?: number;
    year?: number;
    network?: number;    // streaming network (e.g. 213=Netflix, 49=HBO)
    sortBy?: string;
  } = {}): Promise<JellyseerrSearchResult> {
    const { data } = await this.client.get('/discover/tv', {
      params: { language: 'en', ...params },
    });
    return data;
  }

  /**
   * Get detail untuk movie/TV (lebih lengkap dari search)
   */
  async getMediaDetail(mediaType: 'movie' | 'tv', tmdbId: number) {
    const { data } = await this.client.get(`/${mediaType}/${tmdbId}`);
    return data;
  }

  /**
   * Create request di Jellyseerr.
   * Karena admin di Surflix udah approve, kita kirim dengan auto-approve flag
   * (asumsi API key yang dipakai punya privilege admin di Jellyseerr).
   */
  async createRequest(params: {
    mediaType: 'movie' | 'tv';
    mediaId: number;        // TMDB ID
    seasons?: number[] | 'all'; // untuk TV
    is4k?: boolean;
  }) {
    const payload: any = {
      mediaType: params.mediaType,
      mediaId: params.mediaId,
      is4k: params.is4k || false,
    };

    if (params.mediaType === 'tv') {
      payload.seasons = params.seasons || 'all';
    }

    const { data } = await this.client.post('/request', payload);
    return data;
  }

  /**
   * Get request detail (untuk polling status)
   */
  async getRequest(requestId: number) {
    const { data } = await this.client.get(`/request/${requestId}`);
    return data;
  }

  /**
   * Get all requests (untuk admin dashboard, optional)
   */
  async getRequests(params: { take?: number; skip?: number; filter?: string } = {}) {
    const { data } = await this.client.get('/request', { params });
    return data;
  }

  /**
   * Get media library counts (movies, series, total) dari Jellyseerr
   * Endpoint /settings/jobs gak ada, tapi /status atau /media bisa di-aggregate
   */
  async getMediaCount(): Promise<{ movies: number; tv: number; total: number }> {
    try {
      // Use /media endpoint dengan filter
      const [movies, tv] = await Promise.all([
        this.client.get('/media', { params: { filter: 'available', mediaType: 'movie', take: 1 } }),
        this.client.get('/media', { params: { filter: 'available', mediaType: 'tv', take: 1 } }),
      ]);
      const moviesCount = movies.data?.pageInfo?.results || 0;
      const tvCount = tv.data?.pageInfo?.results || 0;
      return { movies: moviesCount, tv: tvCount, total: moviesCount + tvCount };
    } catch (err: any) {
      console.error('[getMediaCount] Failed:', err.message);
      return { movies: 0, tv: 0, total: 0 };
    }
  }

  /**
   * Health check, useful untuk validation di startup
   */
  async ping(): Promise<boolean> {
    try {
      await this.client.get('/status');
      return true;
    } catch {
      return false;
    }
  }
}

export const jellyseerr = new JellyseerrClient();
