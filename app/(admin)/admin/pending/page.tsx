/** Alamat lama: Pending sekarang tab di /admin/requests. */
import { redirect } from 'next/navigation';

export default function PendingRedirect() {
  redirect('/admin/requests');
}
