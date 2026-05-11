import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { randomBytes } from 'crypto';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate magic link token (URL-safe, 32 bytes)
 */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Get TMDB image URL dari poster_path
 */
export function tmdbImage(path: string | null | undefined, size: 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w342') {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

/**
 * Format release date jadi tahun aja
 */
export function getYear(date: string | null | undefined): string {
  if (!date) return '';
  return date.split('-')[0];
}

/**
 * Map Jellyseerr status (1-5) ke label kita
 */
export function jellyseerrStatusLabel(status: number | undefined): {
  label: string;
  variant: 'available' | 'processing' | 'pending' | 'none';
} {
  switch (status) {
    case 5:
      return { label: 'In Library', variant: 'available' };
    case 4:
      return { label: 'Partial', variant: 'available' };
    case 3:
      return { label: 'Downloading', variant: 'processing' };
    case 2:
      return { label: 'Pending', variant: 'pending' };
    default:
      return { label: '', variant: 'none' };
  }
}

/**
 * Validate email format (RFC 5322 simplified)
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
