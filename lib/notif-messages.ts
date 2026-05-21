/**
 * Notification message templates untuk status change.
 * Dipake di hooks/use-request-polling.ts (in-page) + Phase 3 web push (server).
 */

export interface NotifPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export function buildStatusChangeNotif(opts: {
  title: string;
  status: string;
  previousStatus?: string;
  adminNote?: string | null;
}): NotifPayload | null {
  const { title, status, adminNote } = opts;

  switch (status) {
    case 'AVAILABLE':
      return {
        title: `🎬 ${title} udah ready!`,
        body: 'Siap ditonton di Surflix sekarang.',
        url: '/requests',
        tag: `status-${status}`,
      };
    case 'PARTIALLY_AVAILABLE':
      return {
        title: `${title} sebagian ready`,
        body: 'Beberapa episode udah bisa ditonton.',
        url: '/requests',
        tag: `status-${status}`,
      };
    case 'PROCESSING':
      return {
        title: `${title} lagi di-download`,
        body: 'Lo bakal di-notif lagi pas siap tonton.',
        url: '/requests',
        tag: `status-${status}`,
      };
    case 'ON_SCHEDULE':
      return {
        title: `${title} disetujui`,
        body: 'Lagi antri buat di-download.',
        url: '/requests',
        tag: `status-${status}`,
      };
    case 'REJECTED':
      return {
        title: `${title} di-reject admin`,
        body: adminNote ? `Catatan: ${adminNote}` : 'Cek detail di My Requests.',
        url: '/requests',
        tag: `status-${status}`,
      };
    case 'FAILED':
      return {
        title: `${title} gagal diproses`,
        body: 'Admin bakal coba retry nanti.',
        url: '/requests',
        tag: `status-${status}`,
      };
    default:
      return null;
  }
}
