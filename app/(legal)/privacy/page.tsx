import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Notice · Surflix',
  description: 'What Surflix stores, why, and how to have it deleted. No analytics, no ad trackers, no third-party profiling.',
  alternates: { canonical: 'https://surflix.my.id/privacy' },
};

export default function PrivacyPage() {
  return (
    <main className="lg-wrap">
      <Link href="/" className="lg-back">← Surflix</Link>
      <h1>Privacy Notice</h1>
      <p className="lg-lede">
        Surflix is a private server, not a product, and it makes no money from you — so there is
        nothing to gain from collecting much. This notice lists everything it actually stores. It
        was written by reading the database schema, not from a template.
      </p>

      <p className="lg-updated">Last updated 23 October 2026</p>

      <div className="lg-note">
        <p>
          <strong>No analytics. No ad trackers. No profiling.</strong> There is no Google Analytics,
          no Plausible, no Meta pixel, no session recorder, and no advertising network anywhere on
          any Surflix site. Nothing you do here is sold, shared for marketing, or used to build a
          profile.
        </p>
      </div>

      <h2>What is stored, and why</h2>

      <h3>When you make a request</h3>
      <ul>
        <li><strong>The name you type.</strong> Whatever you enter — a nickname is fine.</li>
        <li><strong>A random ID</strong> generated for you and kept in your browser. It is how the
          site recognises you on your next visit without a password.</li>
        <li><strong>The request itself:</strong> the title, your optional note, its status, and
          timestamps.</li>
      </ul>
      <p>
        There is no account, no password, and no email address for guests. An email column exists in
        the database for historical reasons and is filled with a placeholder value, never a real
        address.
      </p>

      <h3>In your browser</h3>
      <ul>
        <li><strong>Your name and ID</strong>, so you do not have to type them again.</li>
        <li><strong>Your language choice</strong> (English or Indonesian), so it follows you between
          the three Surflix sites.</li>
        <li><strong>Which request updates you have already seen</strong>, so the badge clears.</li>
      </ul>
      <p>
        These are functional, not tracking. Clearing your browser storage removes them and signs you
        out of your request history.
      </p>

      <h3>On the server</h3>
      <ul>
        <li><strong>Your IP address</strong>, briefly, to rate-limit requests. It is used to stop
          one visitor flooding the server and nothing else.</li>
        <li><strong>A push subscription</strong> — a browser-issued endpoint and your browser&apos;s
          user agent string — <em>only</em> if you turn on notifications. Turn them off and it is
          deleted.</li>
        <li><strong>An event log</strong> of what happened to requests, so the operator can see
          where something went wrong.</li>
      </ul>

      <h2>Who else sees it</h2>
      <ul>
        <li><strong>The operator</strong>, who reviews every request by hand and sees the name and
          note attached to it.</li>
        <li><strong>Telegram</strong>, which carries the operator&apos;s own notification that a new
          request arrived. It may include the requested title and the name you gave.</li>
        <li><strong>TMDB</strong>, which serves poster images. Loading a poster means your browser
          contacts their servers, as it would for any image on the web.</li>
      </ul>
      <p>
        Nobody else. The server is self-hosted, not on a shared cloud platform, and the database is a
        single file on that machine.
      </p>

      <h2>How long it is kept</h2>
      <p>
        Requests and their history are kept so you can look back at what you asked for. Rate-limit
        records are short-lived. There is no fixed deletion schedule — if you want your data gone,
        ask and it will be removed.
      </p>

      <h2>Your data, removed</h2>
      <p>
        Write to <a href="mailto:admin@surflix.my.id">admin@surflix.my.id</a> and say which name you
        used. Your guest record, requests, notes, and any push subscription will be deleted. There is
        no form and no waiting period — one person reads that inbox.
      </p>

      <h2>Children</h2>
      <p>
        Surflix is not aimed at children and asks for no age information. It is used within one
        household and circle of friends; supervision there is a family matter, not a technical one.
      </p>

      <h2>Changes</h2>
      <p>
        If what is stored changes, this page changes with it and the date at the top moves. Nothing
        is added quietly.
      </p>

      <h2>Contact</h2>
      <p>
        <a href="mailto:admin@surflix.my.id">admin@surflix.my.id</a>
      </p>

      <nav className="lg-foot">
        <Link href="/">Surflix</Link>
        <Link href="/terms">Terms of Use</Link>
        <a href="mailto:admin@surflix.my.id">admin@surflix.my.id</a>
      </nav>
    </main>
  );
}
