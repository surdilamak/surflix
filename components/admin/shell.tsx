/**
 * AdminShell — kerangka admin: sidebar (desktop) dan bilah atas + menu (telepon).
 * Satu navigasi untuk semua halaman, lencana angka dari AdminProvider.
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Icons } from '@/components/ui/icons';
import { AdminProvider, useAdmin } from './context';

const NAV = [
  { href: '/admin', label: 'Overview', icon: Icons.LayoutDashboard, count: null },
  { href: '/admin/requests', label: 'Requests', icon: Icons.Inbox, count: 'pendingRequests' as const },
  { href: '/admin/connections', label: 'Reference', icon: Icons.Network, count: 'reviewQueue' as const },
  { href: '/admin/settings', label: 'Settings', icon: Icons.Settings, count: null },
];

function isActive(pathname: string, href: string) {
  return href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`);
}

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { counts } = useAdmin();
  return (
    <nav className="ad-nav" aria-label="Admin">
      {NAV.map((it) => {
        const n = it.count ? counts[it.count] : 0;
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={isActive(pathname, it.href) ? 'page' : undefined}
            onClick={onNavigate}
          >
            <it.icon />
            {it.label}
            {n > 0 && <span className="ad-count" aria-label={`${n} waiting`}>{n}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function Foot({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/login');
  }
  return (
    <div className="ad-side-foot">
      <Link href="/" className="ad-sidelink" onClick={onNavigate}>
        <Icons.ArrowUpRight /> View as guest
      </Link>
      <button type="button" className="ad-sidelink" onClick={logout}>
        <Icons.LogOut /> Log out
      </button>
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = NAV.find((n) => isActive(pathname, n.href))?.label ?? 'Admin';

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="ad-shell">
      <aside className="ad-side">
        <div className="ad-brand">
          <Image src="/logo-mark.png" alt="" width={28} height={28} />
          <span>
            Surflix
            <small>Admin</small>
          </span>
        </div>
        <Nav />
        <Foot />
      </aside>

      <header className="ad-top">
        <Image src="/logo-mark.png" alt="" width={28} height={28} />
        <span className="ad-top-title">{current}</span>
        <button type="button" className="ad-burger" aria-expanded={open} aria-label="Menu" onClick={() => setOpen((o) => !o)}>
          {open ? <Icons.X width={20} height={20} /> : <Icons.Menu width={20} height={20} />}
        </button>
      </header>

      {open && (
        <div className="ad-sheet" onClick={() => setOpen(false)}>
          <div className="ad-sheet-panel" onClick={(e) => e.stopPropagation()}>
            <div className="ad-top" style={{ position: 'static', padding: '0 4px 8px' }}>
              <Image src="/logo-mark.png" alt="" width={28} height={28} />
              <span className="ad-top-title">Surflix Admin</span>
              <button type="button" className="ad-burger" aria-label="Close menu" onClick={() => setOpen(false)}>
                <Icons.X width={20} height={20} />
              </button>
            </div>
            <Nav onNavigate={() => setOpen(false)} />
            <div style={{ marginTop: 12 }}>
              <Foot onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <main className="ad-main">{children}</main>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <Frame>{children}</Frame>
    </AdminProvider>
  );
}
