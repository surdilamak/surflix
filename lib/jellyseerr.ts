/**
 * Jellyseerr API Client
 *
 * Wrapper for communicating with the Jellyseerr API.
 * Internal Docker network, so HTTPS is not needed.
 *
 * Reference: https://api-docs.overseerr.dev (Jellyseerr is a fork of Overseerr)
 */

import axios, { AxiosInstance } from 'axios';

const JELLYSEERR_URL = process.env.JELLYSEERR_URL!;
const JELLYSEERR_API_KEY = process.env.JELLYSEERR_API_KEY!;

if (!JELLYSEERR_URL || !JELLYSEERR_API_KEY) {
  console.warn('[Jellyseerr] Missing env vars. Pastikan JELLYSEERR_URL dan JELLYSEERR_API_KEY di-set.');
}

// Map Jellyseerr mediaInfo.status to our status
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
  title?: string;          // for movie
  name?: string;            // for tv
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
    status: number;         // 1-5, see JELLYSEERR_STATUS
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

    // Logger for debugging
    this.client.interceptors.response.use(
      (res) => res,
      (err) => {
        console.error('[Jellyseerr API Error]', err.response?.status, err.response?.data || err.message);
        return Promise.reject(err);
      }
    );
  }

  /**
   * Search movie/TV/person via Jellyseerr.
   * URLSearchParams encodes spaces as `+` which Jellyseerr rejects — must use %20 via encodeURIComponent.
   */
  async search(query: string, page = 1): Promise<JellyseerrSearchResult> {
    const url = `/search?query=${encodeURIComponent(query.trim())}&page=${page}&language=en`;
    const { data } = await this.client.get(url);
    return data;
  }

  /**
   * Get trending media (weekly)
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
   *
   * Jellyseerr no longer accepts the `year` query param — uses TMDB-style
   * `primaryReleaseDateGte`/`Lte` (ISO date range) instead. Caller still passes
   * `year: number` for convenience; we expand to a 1-year date range internally.
   */
  async discoverMovies(params: {
    page?: number;
    genre?: number;
    year?: number;
    studio?: number;     // production company (e.g. 2=Disney, 420=Marvel)
    network?: number;    // streaming network for TV (n/a for movies but kept consistent)
    sortBy?: string;
  } = {}): Promise<JellyseerrSearchResult> {
    const { year, ...rest } = params;
    const apiParams: Record<string, any> = { language: 'en', ...rest };
    if (year) {
      apiParams.primaryReleaseDateGte = `${year}-01-01`;
      apiParams.primaryReleaseDateLte = `${year}-12-31`;
    }
    const { data } = await this.client.get('/discover/movies', { params: apiParams });
    return data;
  }

  /**
   * Discover TV (filter by genre, year, network)
   *
   * Same year-param refactor as discoverMovies — converts to
   * `firstAirDateGte`/`Lte` for the TV endpoint.
   */
  async discoverTv(params: {
    page?: number;
    genre?: number;
    year?: number;
    network?: number;    // streaming network (e.g. 213=Netflix, 49=HBO)
    sortBy?: string;
  } = {}): Promise<JellyseerrSearchResult> {
    const { year, ...rest } = params;
    const apiParams: Record<string, any> = { language: 'en', ...rest };
    if (year) {
      apiParams.firstAirDateGte = `${year}-01-01`;
      apiParams.firstAirDateLte = `${year}-12-31`;
    }
    const { data } = await this.client.get('/discover/tv', { params: apiParams });
    return data;
  }

  /**
   * Get detail for movie/TV (more complete than search)
   */
  async getMediaDetail(mediaType: 'movie' | 'tv', tmdbId: number) {
    const { data } = await this.client.get(`/${mediaType}/${tmdbId}`);
    return data;
  }

  /**
   * Fetch combined movie + TV credits for a person (director/actor lookup).
   * Returns both `cast` (acting credits) and `crew` (directing/writing/producing).
   */
  async getPersonCombinedCredits(personId: number): Promise<{
    cast: JellyseerrMediaItem[];
    crew: Array<JellyseerrMediaItem & { job?: string }>;
  }> {
    const { data } = await this.client.get(`/person/${personId}/combined_credits`);
    return data;
  }

  /**
   * Create a request in Jellyseerr.
   * Because the admin in Surflix has already approved, we send it with the auto-approve flag
   * (assuming the API key in use has admin privilege in Jellyseerr).
   */
  async createRequest(params: {
    mediaType: 'movie' | 'tv';
    mediaId: number;        // TMDB ID
    seasons?: number[] | 'all'; // for TV
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
   * Get request detail (for polling status)
   */
  async getRequest(requestId: number) {
    const { data } = await this.client.get(`/request/${requestId}`);
    return data;
  }

  /**
   * Get all requests (for the admin dashboard, optional)
   */
  async getRequests(params: { take?: number; skip?: number; filter?: string } = {}) {
    const { data } = await this.client.get('/request', { params });
    return data;
  }

  /**
   * Get media library counts with a multiple fallback strategy.
   * 1. Try /media endpoint
   * 2. Fallback to /request with filter=available
   * 3. Final fallback to local DB
   */
  async getMediaCount(): Promise<{ movies: number; tv: number; total: number }> {
    // Strategy 1: /media endpoint (needs admin)
    try {
      const [movies, tv] = await Promise.all([
        this.client.get('/media', { params: { filter: 'available', mediaType: 'movie', take: 1 } }),
        this.client.get('/media', { params: { filter: 'available', mediaType: 'tv', take: 1 } }),
      ]);
      const moviesCount = movies.data?.pageInfo?.results || 0;
      const tvCount = tv.data?.pageInfo?.results || 0;
      if (moviesCount > 0 || tvCount > 0) {
        return { movies: moviesCount, tv: tvCount, total: moviesCount + tvCount };
      }
    } catch (err: any) {
      console.warn('[getMediaCount] /media failed:', err.response?.status || err.message);
    }

    // Strategy 2: /request endpoint
    try {
      const [movies, tv] = await Promise.all([
        this.client.get('/request', { params: { filter: 'available', mediaType: 'movie', take: 1 } }),
        this.client.get('/request', { params: { filter: 'available', mediaType: 'tv', take: 1 } }),
      ]);
      const moviesCount = movies.data?.pageInfo?.results || 0;
      const tvCount = tv.data?.pageInfo?.results || 0;
      return { movies: moviesCount, tv: tvCount, total: moviesCount + tvCount };
    } catch (err: any) {
      console.warn('[getMediaCount] /request failed:', err.response?.status || err.message);
    }

    return { movies: 0, tv: 0, total: 0 };
  }

  /**
   * True if this API key belongs to an admin (may read /settings/main). A user-level key gets 403.
   */
  async hasAdminKey(): Promise<boolean> {
    try {
      await this.client.get('/settings/main');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Health check, useful for validation at startup
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
