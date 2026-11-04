/**
 * Layout /admin/*: server-side session guard (no page flash followed by a redirect) and the navigation shell.
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
