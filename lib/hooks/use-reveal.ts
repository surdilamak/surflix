/**
 * useReveal — entrance saat scroll: elemen `.ref-reveal` masuk (opacity + naik 20px) sekali
 * begitu terlihat. Panggil dengan `ready=true` setelah kontennya ke-render.
 */
'use client';

import { useEffect } from 'react';

export function useReveal(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>('.ref-reveal:not(.is-in)'));
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ready]);
}
