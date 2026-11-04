/**
 * Notification message templates for status changes, in two languages.
 * Used in hooks/use-request-polling.ts (in-page) + web push (server, lib/push.ts).
 * The payload carries text in two languages in `i18n`; the sender chooses via pickNotifLang().
 */

export type NotifLang = 'en' | 'id';

export interface NotifPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  /** text per language; title/body above = Indonesian (old behavior) */
  i18n?: Record<NotifLang, { title: string; body: string }>;
}

type Text = { title: string; body: string };

export function buildStatusChangeNotif(opts: {
  title: string;
  status: string;
  previousStatus?: string;
  adminNote?: string | null;
}): NotifPayload | null {
  const { title, status, adminNote } = opts;

  let en: Text;
  let id: Text;
  switch (status) {
    case 'AVAILABLE':
      en = { title: `🎬 ${title} is ready`, body: 'It is ready to watch on Surflix now.' };
      id = { title: `🎬 ${title} sudah siap`, body: 'Siap ditonton di Surflix sekarang.' };
      break;
    case 'PARTIALLY_AVAILABLE':
      en = { title: `${title} is partly ready`, body: 'Some episodes are ready to watch.' };
      id = { title: `${title} sebagian siap`, body: 'Beberapa episode sudah bisa ditonton.' };
      break;
    case 'PROCESSING':
      en = { title: `${title} is downloading`, body: 'We will notify you again when it is ready.' };
      id = { title: `${title} sedang diunduh`, body: 'Kamu akan diberi tahu lagi saat siap ditonton.' };
      break;
    case 'ON_SCHEDULE':
      en = { title: `${title} was approved`, body: 'It is queued for download.' };
      id = { title: `${title} disetujui`, body: 'Sedang antre untuk diunduh.' };
      break;
    case 'REJECTED':
      en = { title: `${title} was declined`, body: adminNote ? `Note: ${adminNote}` : 'See the details under My Requests.' };
      id = { title: `${title} ditolak admin`, body: adminNote ? `Catatan: ${adminNote}` : 'Lihat detailnya di Request Saya.' };
      break;
    case 'FAILED':
      en = { title: `${title} could not be processed`, body: 'An admin will retry later.' };
      id = { title: `${title} gagal diproses`, body: 'Admin akan mencoba lagi nanti.' };
      break;
    default:
      return null;
  }
  return { title: id.title, body: id.body, url: '/requests', tag: `status-${status}`, i18n: { en, id } };
}

/** Pick the text for the language; without i18n it falls back to the default title/body. */
export function pickNotifLang(p: NotifPayload, lang: NotifLang): NotifPayload {
  const t = p.i18n?.[lang];
  const { i18n: _drop, ...rest } = p;
  return t ? { ...rest, title: t.title, body: t.body } : rest;
}
