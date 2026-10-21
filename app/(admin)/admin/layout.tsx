/**
 * Layout /admin/*: guard sesi di server (tanpa kedipan halaman lalu redirect) dan kerangka navigasi.
 */
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { AdminShell } from '@/components/admin/shell';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect('/login');
  return <AdminShell>{children}</AdminShell>;
}
