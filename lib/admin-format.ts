/** Format dan peta status yang dipakai halaman admin. */

export function ago(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export type Tone = 'green' | 'blue' | 'yellow' | 'red' | 'accent' | 'neutral';

export const REQUEST_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING_ADMIN: { label: 'Pending', tone: 'yellow' },
  APPROVED: { label: 'Approved', tone: 'blue' },
  ON_SCHEDULE: { label: 'Queued', tone: 'blue' },
  PROCESSING: { label: 'Downloading', tone: 'blue' },
  PARTIALLY_AVAILABLE: { label: 'Partial', tone: 'green' },
  AVAILABLE: { label: 'Available', tone: 'green' },
  REJECTED: { label: 'Rejected', tone: 'red' },
  FAILED: { label: 'Failed', tone: 'red' },
};

export const CONNECTION_STATUS: Record<string, { label: string; tone: Tone }> = {
  APPROVED: { label: 'Live', tone: 'green' },
  PENDING_REVIEW: { label: 'Waiting', tone: 'yellow' },
  REJECTED: { label: 'Rejected', tone: 'red' },
};

export const REJECT_REASONS = [
  'Already in the library',
  'Not available right now',
  'Indonesian titles are not accepted',
  'Duplicate of another request',
];
