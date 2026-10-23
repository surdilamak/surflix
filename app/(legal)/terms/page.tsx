import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Use · Surflix',
  description: 'The rules for using Surflix: who it is for, what you may ask for, and what it does not promise.',
  alternates: { canonical: 'https://surflix.my.id/terms' },
};

export default function TermsPage() {
  return (
    <main className="lg-wrap">
      <Link href="/" className="lg-back">← Surflix</Link>
      <h1>Terms of Use</h1>
      <p className="lg-lede">
        Surflix is a private media server run by one person for friends and family. It is not a
        company and not a commercial service. These terms are short because the arrangement is
        simple.
      </p>

      <p className="lg-updated">Last updated 23 October 2026</p>

      <h2>1. Who this is for</h2>
      <p>
        Access is by invitation. If someone you know gave you the address, you are welcome to use
        it. You may not resell access, share credentials publicly, or pass the address on to people
        the operator has not invited.
      </p>

      <h2>2. What you can ask for</h2>
      <p>
        The Request Hub lets you ask for a film or series. A request is a request, not an order.
        Every one is reviewed by hand and may be declined without a reason. Nothing is guaranteed to
        appear, and nothing is guaranteed to stay.
      </p>

      <h2>3. No payment, no subscription</h2>
      <p>
        Surflix is free. There is no plan, no billing, and nothing to cancel. If a &ldquo;buy me a
        coffee&rdquo; link appears anywhere on the site, it is a voluntary gift to the operator and
        buys you nothing — not priority, not storage, not a guarantee.
      </p>

      <h2>4. The Reference portal</h2>
      <p>
        <a href="https://reference.surflix.my.id">Surflix Reference</a> is a map of how films and
        series connect. Much of it is written by hand and some of it is an opinion rather than a
        fact — where a link rests on a critic&apos;s reading rather than a filmmaker&apos;s
        statement, the page says so. Treat it as a well-researched guide, not an authority. Posters
        and metadata come from TMDB.
      </p>

      <h2>5. Content and copyright</h2>
      <p>
        The operator does not claim ownership of any film, series, artwork, or metadata shown here.
        All of it belongs to its rightful rights holders. The Reference portal&apos;s own writing —
        the curated saga notes, tips, and connection descriptions — is the operator&apos;s work.
      </p>
      <p>
        If you hold rights to something shown here and want it removed, write to{' '}
        <a href="mailto:admin@surflix.my.id">admin@surflix.my.id</a> and it will be taken down.
      </p>

      <h2>6. Acceptable use</h2>
      <ul>
        <li>Do not attempt to break, overload, or probe the server.</li>
        <li>Do not automate requests or scrape the site at volume.</li>
        <li>Do not use another person&apos;s name when requesting.</li>
        <li>Do not redistribute anything you obtain through it.</li>
      </ul>

      <h2>7. No warranty</h2>
      <div className="lg-note">
        <p>
          Surflix is provided as-is. It is one machine in one house. It will go down for
          maintenance, power cuts, and mistakes. There is no uptime promise, no backup promise, and
          no promise that anything you requested last month is still there this month. The operator
          is not liable for anything you lose by relying on it.
        </p>
      </div>

      <h2>8. Ending access</h2>
      <p>
        The operator may remove anyone&apos;s access at any time, usually by simply saying so. You
        can stop using Surflix whenever you like; see the{' '}
        <Link href="/privacy">Privacy Notice</Link> for how to have your data deleted.
      </p>

      <h2>9. Changes</h2>
      <p>
        These terms may change. The date at the top is the version in force. Continuing to use
        Surflix after a change means you accept it.
      </p>

      <h2>10. Contact</h2>
      <p>
        <a href="mailto:admin@surflix.my.id">admin@surflix.my.id</a>
      </p>

      <nav className="lg-foot">
        <Link href="/">Surflix</Link>
        <Link href="/privacy">Privacy Notice</Link>
        <a href="mailto:admin@surflix.my.id">admin@surflix.my.id</a>
      </nav>
    </main>
  );
}
