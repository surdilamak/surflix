/** Old address: Pending is now a tab at /admin/requests. */
import { redirect } from 'next/navigation';

export default function PendingRedirect() {
  redirect('/admin/requests');
}
