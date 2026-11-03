/**
 * AccountMenu: the Jellyfin account entry of the Reference portal, at the far right of the top bar
 * (like most sites), set apart from the page links. `inline` is the version inside the phone menu.
 */
'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useLang } from './lang-provider';
import { useViewer } from './viewer-provider';

export function AccountMenu({ inline = false }: { inline?: boolean }) {
  const { t } = useLang();
  const viewer = useViewer();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  // reserve the space while the session is being read, so the bar does not jump
  if (viewer.status === 'loading') return <span className="pb-account pb-account--wait" aria-hidden="true" />;

  if (viewer.status === 'out') {
    return (
      <div className={`pb-account${inline ? ' pb-account--inline' : ''}`}>
        <button type="button" className="pb-account-btn" onClick={viewer.openLogin}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M3.5 17c.7-3 3.2-4.5 6.5-4.5s5.8 1.5 6.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span>{inline ? t('viewer.signin') : t('viewer.signinShort')}</span>
        </button>
      </div>
    );
  }

  const name = viewer.name ?? '';
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  if (inline) {
    return (
      <div className="pb-account pb-account--inline">
        <p className="pb-account-who">{t('viewer.signedInAs', { name })}</p>
        <button type="button" className="pb-account-btn" onClick={viewer.logout}>
          {t('viewer.signout')}
        </button>
      </div>
    );
  }

  return (
    <div className="pb-account" ref={rootRef}>
      <button
        type="button"
        className="pb-account-btn pb-account-btn--user"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="pb-account-avatar" aria-hidden="true">{initial}</span>
        <span className="pb-account-name">{name}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="pb-account-pop" id={menuId} role="menu">
          <p className="pb-account-who">{t('viewer.signedInAs', { name })}</p>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              viewer.logout();
            }}
          >
            {t('viewer.signout')}
          </button>
        </div>
      )}
    </div>
  );
}
