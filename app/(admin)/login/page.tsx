/**
 * Admin Login (/login)
 *
 * Route group (admin), terpisah dari layout guest. Setelah login sukses langsung ke /admin.
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Icons } from '@/components/ui/icons';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(res.status === 429 ? 'Too many attempts. Wait a minute and try again.' : data.error || 'Sign in failed.');
        setLoading(false);
        return;
      }
      router.push('/admin');
    } catch {
      setError('Network error. Try again.');
      setLoading(false);
    }
  }

  return (
    <div className="ad-login">
      <div className="ad-login-card">
        <div style={{ marginBottom: 28 }}>
          <Image src="/logo-mark.png" alt="" width={48} height={48} priority style={{ marginBottom: 16 }} />
          <h1 className="ad-h1">Surflix Admin</h1>
          <p className="ad-text ad-muted" style={{ marginTop: 6 }}>Sign in to manage requests and the Reference maps.</p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-3" noValidate>
          <div>
            <label htmlFor="ad-user" className="ad-small ad-muted" style={{ display: 'block', marginBottom: 6 }}>Username</label>
            <input
              id="ad-user"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="ad-field"
              autoFocus
              autoComplete="username"
            />
          </div>
          <div>
            <label htmlFor="ad-pass" className="ad-small ad-muted" style={{ display: 'block', marginBottom: 6 }}>Password</label>
            <input
              id="ad-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="ad-field"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="ad-note flex items-start gap-2" role="alert" style={{ color: 'var(--ad-red)' }}>
              <Icons.AlertCircle width={16} height={16} style={{ flex: '0 0 auto', marginTop: 2 }} />
              <span>{error}</span>
            </p>
          )}

          <button type="submit" className="ad-btn ad-btn--primary ad-btn--block" disabled={loading}>
            {loading ? (
              <>
                <Icons.Loader2 className="animate-spin" /> Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p style={{ marginTop: 20 }}>
          <a href="/" className="ad-small ad-muted">← Back to Surflix</a>
        </p>
      </div>
    </div>
  );
}
