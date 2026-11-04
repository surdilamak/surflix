/**
 * WatchLink: a link that opens the title in Jellyfin, only for a signed-in viewer.
 *
 * Anonymous visitors (and visitors while the session is still loading) never get the Jellyfin URL
 * in the page: the same element looks identical but opens the sign-in dialog instead. For a text
 * button pass `signInText` ("Sign in to watch"); for a poster, leave it out and only the click changes.
 */
'use client';

import { useLang } from './lang-provider';
import { useViewer } from './viewer-provider';

export function WatchLink({
  href,
  className,
  children,
  signInText,
  ...rest
}: Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
  signInText?: string;
}) {
  const viewer = useViewer();
  if (viewer.status === 'in') {
    return (
      <a {...rest} className={className} href={href} target="_blank" rel="noopener">
        {children}
      </a>
    );
  }
  return (
    <a
      {...rest}
      className={className}
      href="#"
      role="button"
      onClick={(e) => {
        e.preventDefault();
        viewer.openLogin();
      }}
    >
      {viewer.status === 'out' ? (signInText ?? children) : children}
    </a>
  );
}

/** Convenience for text buttons: translated "Sign in to watch" while signed out. */
export function WatchButton({ href, className = 'ref-btn', children }: { href: string; className?: string; children: React.ReactNode }) {
  const { t } = useLang();
  return (
    <WatchLink href={href} className={className} signInText={t('viewer.watchSignin')}>
      {children}
    </WatchLink>
  );
}
