/** Alamat lama: History sekarang tab di /admin/requests. */
import { redirect } from 'next/navigation';

export default function HistoryRedirect() {
  redirect('/admin/requests?view=history');
}
