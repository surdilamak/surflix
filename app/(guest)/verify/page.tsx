/**
 * Verify Page (/verify?token=...)
 *
 * User klik magic link dari email → redirect ke sini.
 * Page ini verify token, simpan session, redirect ke /requests
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Icons } from '@/components/ui/icons';

export default function VerifyPage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('Token gak ditemukan');
      return;
    }
    verify(token);
  }, [token]);

  async function verify(t: string) {
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: t }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error || 'Link expired');
        return;
      }

      // Save session token
      sessionStorage.setItem('surflix_guest_token', data.token);
      // Update guest info di localStorage
      localStorage.setItem(
        'surflix_guest_info',
        JSON.stringify({ name: data.guest.name, email: data.guest.email })
      );

      setStatus('success');
      setTimeout(() => router.push('/requests'), 1000);
    } catch {
      setStatus('error');
      setErrorMsg('Network error');
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center"
      >
        {status === 'verifying' && (
          <>
            <Icons.Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-white/50" />
            <h1 className="text-lg font-semibold tracking-tight">Verifying...</h1>
            <p className="mt-1 text-sm text-white/50">Sebentar ya</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ios-green/15">
              <Icons.CheckCircle2 className="h-8 w-8 text-ios-green" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">Berhasil!</h1>
            <p className="mt-1 text-sm text-white/50">Redirecting ke requests...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ios-red/15">
              <Icons.XCircle className="h-8 w-8 text-ios-red" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">Link gak valid</h1>
            <p className="mt-1 text-sm text-white/50">{errorMsg}</p>
            <button
              onClick={() => router.push('/requests')}
              className="btn-primary mt-6"
            >
              Request link baru
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
