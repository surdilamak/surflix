/** Bagian kecil yang dipakai bersama halaman admin: lencana, poster, kerangka muat, judul halaman. */
'use client';

import { Icons } from '@/components/ui/icons';
import type { Tone } from '@/lib/admin-format';

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className="ad-badge" data-tone={tone === 'neutral' ? undefined : tone}>{children}</span>;
}

export function Poster({ src, size = 'md', alt = '' }: { src?: string | null; size?: 'md' | 'lg'; alt?: string }) {
  return (
    <div className={size === 'lg' ? 'ad-poster ad-poster--lg' : 'ad-poster'}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" />
      ) : (
        <Icons.Film width={20} height={20} />
      )}
    </div>
  );
}

export function PageHead({ title, sub, children }: { title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="ad-page-head">
      <div>
        <h1 className="ad-h1">{title}</h1>
        {sub && <p className="ad-small ad-muted">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Skeletons({ n = 3, h = 96 }: { n?: number; h?: number }) {
  return (
    <div className="grid gap-2" aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="ad-skel" style={{ height: h }} />
      ))}
    </div>
  );
}

export function Empty({ icon = 'CheckCircle2', title, body, children }: { icon?: keyof typeof Icons; title: string; body?: string; children?: React.ReactNode }) {
  const Icon = Icons[icon];
  return (
    <div className="ad-tile" style={{ textAlign: 'center', padding: '48px 16px' }}>
      <Icon width={28} height={28} style={{ color: 'var(--ad-accent)', margin: '0 auto 12px' }} />
      <p className="ad-h2">{title}</p>
      {body && <p className="ad-small ad-muted" style={{ margin: '6px auto 0', maxWidth: '24rem' }}>{body}</p>}
      {children && <div style={{ marginTop: 16 }}>{children}</div>}
    </div>
  );
}
