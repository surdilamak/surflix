/**
 * Verify Page (/verify?token=...)
 *
 * User klik magic link dari email → redirect ke sini.
 * Page ini verify token, simpan session, redirect ke /requests
 */
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Icons } from '@/components/ui/icons';
import { useLang } from '@/components/connections/lang-provider';

// Wrap inner component dengan Suspense karena useSearchParams butuh suspense boundary
export default function VerifyPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <VerifyInner />
    </Suspense>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4">
      <Icons.Loader2 className="h-10 w-10 animate-spin text-rq-muted" />
    </div>
  );
}

function VerifyInner() {
  const { t } = useLang();
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg(t('hub.verify.noToken'));
      return;
    }
    verify(token);
  }, [token]);

  async function verify(tok: string) {
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tok }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error || t('hub.verify.expired'));
        return;
      }

      sessionStorage.setItem('surflix_guest_token', data.token);
      localStorage.setItem(
        'surflix_guest_info',
        JSON.stringify({ name: data.guest.name, email: data.guest.email })
      );

      setStatus('success');
      setTimeout(() => router.push('/requests'), 1000);
    } catch {
      setStatus('error');
      setErrorMsg(t('hub.verify.network'));
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center"
      >
        {status === 'verifying' && (
          <>
            <Icons.Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-rq-muted" />
            <h1 className="rq-h2">{t('hub.verify.verifying')}</h1>
            <p className="rq-small mt-2 text-rq-muted">{t('hub.verify.wait')}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-rq bg-rq-surface">
              <Icons.CheckCircle2 className="h-8 w-8 text-ios-green" />
            </div>
            <h1 className="rq-h2">{t('hub.verify.done')}</h1>
            <p className="rq-small mt-2 text-rq-muted">{t('hub.verify.redirect')}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-rq bg-rq-surface">
              <Icons.XCircle className="h-8 w-8 text-ios-red" />
            </div>
            <h1 className="rq-h2">{t('hub.verify.invalid')}</h1>
            <p className="rq-small mt-2 text-rq-muted">{errorMsg}</p>
            <button
              onClick={() => router.push('/requests')}
              className="btn-primary mt-6"
            >
              {t('hub.verify.new')}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
