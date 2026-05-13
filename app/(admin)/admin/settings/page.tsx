/**
 * Admin Settings Page (/admin/settings)
 *
 * Section:
 * - Telegram bot status + setup webhook button
 * - Library connection (Jellyseerr URL)
 * - Future: Email config, manage admins, rules
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icons } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

interface TelegramStatus {
  configured: boolean;
  webhookInfo?: {
    url: string;
    has_custom_certificate?: boolean;
    pending_update_count?: number;
    last_error_date?: number;
    last_error_message?: string;
  };
  message?: string;
  expectedUrl?: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [telegram, setTelegram] = useState<TelegramStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupLoading, setSetupLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const res = await fetch('/api/telegram/setup');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.ok) {
        setTelegram(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function setupWebhook() {
    setSetupLoading(true);
    setToast(null);
    try {
      const res = await fetch('/api/telegram/setup', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setToast({ message: 'Webhook registered! Lo bisa terima notif sekarang.', type: 'success' });
        await loadStatus();
      } else {
        setToast({ message: data.error || 'Gagal setup', type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Network error', type: 'error' });
    } finally {
      setSetupLoading(false);
      setTimeout(() => setToast(null), 5000);
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-black">
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-black/70 backdrop-blur-ios">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-surflix-500 to-ios-orange">
                <Icons.Waves className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-base font-semibold tracking-tighter">Surflix Admin</span>
            </div>
            <nav className="hidden gap-1 md:flex">
              <Link href="/admin" className="tab">Dashboard</Link>
              <Link href="/admin/pending" className="tab">Pending</Link>
              <Link href="/admin/history" className="tab">History</Link>
              <Link href="/admin/settings" className="tab tab-active">Settings</Link>
            </nav>
          </div>
          <button onClick={handleLogout} className="text-xs text-white/40 hover:text-white">
            <Icons.LogOut className="mr-1 inline h-3 w-3" />
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
        <h1 className="mb-1 text-2xl font-semibold tracking-tighter md:text-3xl">Settings</h1>
        <p className="mb-8 text-sm text-white/40">Integration & system configuration</p>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-ios-lg bg-white/[0.04]" />
            ))}
          </div>
        ) : (
          <>
            {/* Telegram Section */}
            <section className="mb-6 rounded-ios-lg border border-white/[0.08] bg-bg-surface p-5">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-ios-blue/10">
                  <Icons.Bell className="h-5 w-5 text-ios-blue" />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-semibold">Telegram Notifications</h2>
                  <p className="mt-0.5 text-xs text-white/50">
                    Get notified for new requests & approve directly from Telegram
                  </p>
                </div>
                <StatusBadge
                  status={
                    !telegram?.configured ? 'inactive' :
                    telegram?.webhookInfo?.url ? 'active' :
                    'pending'
                  }
                />
              </div>

              {!telegram?.configured ? (
                <div className="rounded-ios-lg border border-ios-orange/30 bg-ios-orange/5 p-3">
                  <p className="text-xs text-white/80">
                    <Icons.Info className="mr-1 inline h-3 w-3 text-ios-orange" />
                    Belum dikonfigurasi. Set <code className="rounded bg-black/30 px-1 text-[10px]">TELEGRAM_BOT_TOKEN</code> dan <code className="rounded bg-black/30 px-1 text-[10px]">TELEGRAM_ADMIN_CHAT_ID</code> di .env.
                  </p>
                  <p className="mt-2 text-[11px] text-white/50">
                    Lihat <a href="https://core.telegram.org/bots/tutorial" target="_blank" rel="noopener" className="text-ios-blue hover:underline">BotFather tutorial</a> untuk dapetin bot token.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-3 space-y-2 rounded-ios-lg bg-white/[0.03] p-3">
                    <DetailRow label="Bot Token" value="✓ Configured" />
                    <DetailRow label="Admin Chat ID" value="✓ Configured" />
                    <DetailRow
                      label="Webhook URL"
                      value={telegram.webhookInfo?.url || '(not registered)'}
                      truncate
                    />
                    {telegram.webhookInfo?.pending_update_count !== undefined && telegram.webhookInfo.pending_update_count > 0 && (
                      <DetailRow
                        label="Pending Updates"
                        value={`${telegram.webhookInfo.pending_update_count} (lagi processing)`}
                      />
                    )}
                    {telegram.webhookInfo?.last_error_message && (
                      <DetailRow
                        label="Last Error"
                        value={telegram.webhookInfo.last_error_message}
                        error
                      />
                    )}
                  </div>

                  <button
                    onClick={setupWebhook}
                    disabled={setupLoading}
                    className="btn-secondary text-xs disabled:opacity-50"
                  >
                    {setupLoading ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Icons.Loader2 className="h-3 w-3 animate-spin" />
                        Setting up...
                      </span>
                    ) : telegram.webhookInfo?.url ? (
                      'Re-register Webhook'
                    ) : (
                      'Register Webhook'
                    )}
                  </button>

                  <p className="mt-2 text-[10px] text-white/40">
                    Klik untuk register/refresh webhook ke Telegram. Cukup sekali setup.
                  </p>
                </>
              )}
            </section>

            {/* Quick Test */}
            {telegram?.configured && telegram.webhookInfo?.url && (
              <section className="mb-6 rounded-ios-lg border border-white/[0.08] bg-bg-surface p-5">
                <h2 className="mb-2 text-base font-semibold">Test Telegram Integration</h2>
                <p className="mb-3 text-xs text-white/55">
                  Submit a test request dari guest view, terus cek Telegram lo.
                  Lo akan terima message dengan tombol Approve/Reject.
                </p>
                <Link href="/" target="_blank" className="btn-secondary text-xs">
                  <span className="inline-flex items-center gap-1.5">
                    <Icons.ExternalLink className="h-3 w-3" />
                    Open Guest View
                  </span>
                </Link>
              </section>
            )}

            {/* Other Integrations (placeholder) */}
            <section className="rounded-ios-lg border border-white/[0.08] bg-bg-surface p-5 opacity-60">
              <div className="mb-2 flex items-center gap-2">
                <Icons.Mail className="h-4 w-4 text-white/40" />
                <h2 className="text-base font-semibold">Email Notifications (Coming Soon)</h2>
              </div>
              <p className="text-xs text-white/50">
                Configure Resend untuk kirim "Available" notification ke guest.
              </p>
            </section>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-bg-surface/95 px-4 py-2.5 shadow-lg backdrop-blur-ios">
            {toast.type === 'success' ? (
              <Icons.CheckCircle2 className="h-4 w-4 text-ios-green" />
            ) : (
              <Icons.XCircle className="h-4 w-4 text-ios-red" />
            )}
            <span className="text-[13px] font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: 'active' | 'pending' | 'inactive' }) {
  const config = {
    active: { label: 'Active', class: 'bg-ios-green/20 text-ios-green' },
    pending: { label: 'Configured', class: 'bg-ios-blue/20 text-ios-blue' },
    inactive: { label: 'Not Configured', class: 'bg-white/10 text-white/50' },
  }[status];

  return (
    <span className={cn('flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium', config.class)}>
      {config.label}
    </span>
  );
}

function DetailRow({ label, value, truncate, error }: {
  label: string;
  value: string;
  truncate?: boolean;
  error?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-[11px]">
      <span className="flex-shrink-0 text-white/50">{label}</span>
      <span className={cn(
        'text-right',
        truncate && 'truncate',
        error ? 'text-ios-red' : 'text-white/85'
      )}>{value}</span>
    </div>
  );
}
