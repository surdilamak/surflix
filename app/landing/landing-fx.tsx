/**
 * Efek client buat landing: masuk saat scroll (stagger), shutter foto, hitung naik angka,
 * dan dialog QR kopi. Semua murni transform/opacity/clip-path; reduced-motion: konten langsung tampil.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { writeLangPref } from '@/lib/lang-pref';

export function LandingFx() {
  useEffect(() => {
    // Gerak masuk cuma aktif setelah hydration (tanpa script semua konten tetap terlihat).
    document.querySelector('.lp-root')?.classList.add('lp-js');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal], [data-shutter]'));
    const counters = Array.from(document.querySelectorAll<HTMLElement>('[data-count]'));

    const runCount = (el: HTMLElement) => {
      const target = Number(el.dataset.count);
      if (reduced || !Number.isFinite(target)) return;
      const t0 = performance.now();
      const dur = 1100;
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString('en-US');
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (reduced || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.classList.add('is-in');
          el.querySelectorAll<HTMLElement>('[data-count]').forEach(runCount);
          if (el.dataset.count) runCount(el);
          io.unobserve(el);
        }
      },
      { rootMargin: '0px 0px 15% 0px', threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    counters.forEach((el) => !el.closest('[data-reveal],[data-shutter]') && io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}

export interface CoffeeLabels {
  title: string;
  alt: string;
  thanks: string;
  close: string;
}

export function CoffeeButton({ className, children, labels }: { className?: string; children: React.ReactNode; labels: CoffeeLabels }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open && (
        <div className="lp-modal" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label={labels.title}>
          <div className="lp-modal-card" onClick={(e) => e.stopPropagation()}>
            <button ref={closeRef} type="button" className="lp-modal-close" onClick={() => setOpen(false)} aria-label={labels.close}>
              ×
            </button>
            {/* QR sudah membawa branding QRIS sendiri; tampil apa adanya. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/qr-coffee.png" alt={labels.alt} width={268} height={268} />
            <p>{labels.thanks}</p>
          </div>
        </div>
      )}
    </>
  );
}

/** Pilihan bahasa landing: tulis cookie bersama, lalu muat ulang HTML server dalam bahasa baru. */
export function LangToggle({ lang, label }: { lang: 'en' | 'id'; label: string }) {
  const router = useRouter();
  const pick = (l: 'en' | 'id') => {
    writeLangPref(l);
    // ?lang= di URL akan menimpa cookie; buang supaya pilihan baru berlaku
    const url = new URL(window.location.href);
    if (url.searchParams.has('lang')) {
      url.searchParams.delete('lang');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
    router.refresh();
  };
  return (
    <span className="lp-lang" role="group" aria-label={label}>
      {(['en', 'id'] as const).map((l) => (
        <button key={l} type="button" onClick={() => pick(l)} aria-pressed={lang === l}>
          {l.toUpperCase()}
        </button>
      ))}
    </span>
  );
}
