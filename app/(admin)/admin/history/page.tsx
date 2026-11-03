/** Old address: History is now a tab at /admin/requests. */
import { redirect } from 'next/navigation';

export default function HistoryRedirect() {
  redirect('/admin/requests?view=history');
}
