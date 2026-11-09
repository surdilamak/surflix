/**
 * Request Hub page transition: a short fade-in when moving between pages inside the Hub (client-side
 * navigation). A template is mounted again on every navigation, unlike a layout. The very first load is
 * skipped because the browser already crossfades full page loads (see portal-bar.css).
 */
'use client';

import { useRef } from 'react';

let firstMount = true;

export default function GuestTemplate({ children }: { children: React.ReactNode }) {
  const animate = useRef(!firstMount).current;
  firstMount = false;
  return <div className={animate ? 'rq-page-in' : undefined}>{children}</div>;
}
