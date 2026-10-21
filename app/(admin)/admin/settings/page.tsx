/**
 * Admin Settings (/admin/settings)
 *
 * Status semua integrasi dalam satu layar (database, Jellyfin, Jellyseerr dan jenis key-nya, Telegram,
 * Web Push, secret webhook, email), snapshot library dan sinkronisasinya, plus kontrol webhook Telegram.
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icons } from '@/components/ui/icons';
import { useAdmin } from '@/components/admin/context';
import { PageHead, Skeletons } from '@/components/admin/ui';
import { ago } from '@/lib/admin-format';

interface Health {
  database: { ok: boolean; ms: number };
  jellyfin: { configured: boolean; hasKey: boolean; ok: boolean; name?: string; version?: string; error?: string; ms?: number };
  jellyseerr: { configured: boolean; ok: boolean; adminKey: boolean; error?: string; ms?: number };
  telegram: { configured: boolean };
  push: { configured: boolean };
  webhookSecret: boolean;
  email: { configured: boolean };
  library: { titles: number; lastSync: string | null };
}

interface TelegramStatus {
  configured: boolean;
  webhookInfo?: { url: string; pending_update_count?: number; last_error_message?: string };
}

type Tone = 'green' | 'yellow' | 'red' | 'muted';

function Row({ tone, title, detail, children }: { tone: Tone; title: string; detail: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2" style={{ padding: '14px 16px' }}>
      <span className="ad-dot" data-tone={tone === 'muted' ? undefined : tone} aria-hidden="true" />
      <div className="min-w-0 flex-1" style={{ minWidth: '12rem' }}>
        <p className="ad-text" style={{ fontWeight: 600 }}>{title}</p>
        <p className="ad-small ad-muted">{detail}</p>
      </div>
      {children}
    </div>
  );
}

export default function AdminSettingsPage() {
  const { api, toast, refreshCounts } = useAdmin();
  const [health, setHealth] = useState<Health | null>(null);
  const [tg, setTg] = useState<TelegramStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [webhookBusy, setWebhookBusy] = useState(false);

  const load = useCallback(async () => {
    setChecking(true);
    const [h, t] = await Promise.all([api('/api/admin/health'), api('/api/telegram/setup')]);
    if (h.res.ok) setHealth(h.data);
    if (t.res.ok) setTg(t.data);
    setChecking(false);
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  async function sync() {
    setSyncing(true);
    const { res, data } = await api('/api/admin/library/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    setSyncing(false);
    if (!res.ok) return toast(data.error || 'Sync failed', 'error');
    toast(`Library synced: ${data.created} new, ${data.updated} updated`);
    load();
    refreshCounts();
  }

  async function registerWebhook() {
    setWebhookBusy(true);
    const { data } = await api('/api/telegram/setup', { method: 'POST' });
    setWebhookBusy(false);
    if (data.success) {
      toast('Telegram webhook registered');
      load();
    } else {
      toast(data.error || 'Could not register the webhook', 'error');
    }
  }

  if (!health) {
    return (
      <>
        <PageHead title="Settings" />
        <Skeletons n={3} h={120} />
      </>
    );
  }

  const jf = health.jellyfin;
  const js = health.jellyseerr;

  return (
    <>
      <PageHead title="Settings" sub="Integration status and library tools.">
        <button type="button" className="ad-btn ad-btn--sm" onClick={load} disabled={checking}>
          <Icons.RefreshCw className={checking ? 'animate-spin' : ''} /> {checking ? 'Checking…' : 'Check again'}
        </button>
      </PageHead>

      <h2 className="ad-h2" style={{ marginBottom: 10 }}>Integrations</h2>
      <div className="ad-tile ad-tile--flush">
        <Row
          tone={health.database.ok ? 'green' : 'red'}
          title="Database"
          detail={health.database.ok ? `Responding in ${health.database.ms} ms` : 'Not responding'}
        />
        <Row
          tone={!jf.configured ? 'muted' : jf.ok && jf.hasKey ? 'green' : jf.ok ? 'yellow' : 'red'}
          title="Jellyfin"
          detail={
            !jf.configured
              ? 'JELLYFIN_URL is not set'
              : jf.ok
                ? `${jf.name ?? 'Server'} ${jf.version ? `v${jf.version}` : ''} · ${jf.ms} ms${jf.hasKey ? '' : ' · JELLYFIN_API_KEY missing, library sync will not work'}`
                : `Unreachable${jf.error ? `: ${jf.error}` : ''}`
          }
        />
        <Row
          tone={!js.configured ? 'muted' : js.ok && js.adminKey ? 'green' : js.ok ? 'yellow' : 'red'}
          title="Jellyseerr"
          detail={
            !js.configured
              ? 'JELLYSEERR_URL or JELLYSEERR_API_KEY is not set'
              : !js.ok
                ? `Unreachable${js.error ? `: ${js.error}` : ''}`
                : js.adminKey
                  ? `Connected with an admin key · ${js.ms} ms`
                  : 'Connected, but the key is not an admin key. Use the key under Jellyseerr Settings → General.'
          }
        />
        <Row
          tone={health.push.configured ? 'green' : 'muted'}
          title="Web Push"
          detail={health.push.configured ? 'VAPID keys are set. Guests can turn on notifications.' : 'VAPID keys are not set'}
        />
        <Row
          tone={health.webhookSecret ? 'green' : 'yellow'}
          title="Webhook secret"
          detail={health.webhookSecret ? 'Jellyseerr and Telegram webhooks are protected.' : 'WEBHOOK_SECRET is not set. Webhooks are rejected until it is.'}
        />
        <Row
          tone={health.email.configured ? 'green' : 'muted'}
          title="Email (Resend)"
          detail={health.email.configured ? 'Guests can get email notifications.' : 'RESEND_API_KEY is not set. Email notifications are off.'}
        />
      </div>

      <h2 className="ad-h2 ad-section-title">Library</h2>
      <div className="ad-tile">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1" style={{ minWidth: '12rem' }}>
            <p className="ad-text" style={{ fontWeight: 600 }}>{health.library.titles.toLocaleString('en-US')} titles in the snapshot</p>
            <p className="ad-small ad-muted">
              {health.library.lastSync ? `Last updated ${ago(health.library.lastSync)}` : 'Never synced'}. New Jellyfin titles show up on Reference and in search after a sync; it also runs by itself when Jellyseerr reports a title as available.
            </p>
          </div>
          <button type="button" className="ad-btn" onClick={sync} disabled={syncing || !jf.configured || !jf.hasKey}>
            <Icons.RefreshCw className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Syncing…' : 'Sync library'}
          </button>
        </div>
      </div>

      <h2 className="ad-h2 ad-section-title">Telegram</h2>
      <div className="ad-tile">
        {!tg?.configured ? (
          <>
            <p className="ad-text" style={{ fontWeight: 600 }}>Not configured</p>
            <p className="ad-small ad-muted" style={{ marginTop: 4 }}>
              Set TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID in the server environment to get new requests in Telegram and approve them from there.{' '}
              <a href="https://core.telegram.org/bots/tutorial" target="_blank" rel="noopener" style={{ color: 'var(--ad-accent)' }}>
                How to create a bot
              </a>
            </p>
          </>
        ) : (
          <>
            <div className="ad-kv"><span>Bot token</span><span>Set</span></div>
            <div className="ad-kv"><span>Admin chat</span><span>Set</span></div>
            <div className="ad-kv"><span>Webhook</span><span>{tg.webhookInfo?.url ? 'Registered' : 'Not registered'}</span></div>
            {(tg.webhookInfo?.pending_update_count ?? 0) > 0 && (
              <div className="ad-kv"><span>Pending updates</span><span>{tg.webhookInfo?.pending_update_count}</span></div>
            )}
            {tg.webhookInfo?.last_error_message && (
              <div className="ad-kv"><span>Last error</span><span style={{ color: 'var(--ad-red)' }}>{tg.webhookInfo.last_error_message}</span></div>
            )}
            <button type="button" className="ad-btn" style={{ marginTop: 8 }} onClick={registerWebhook} disabled={webhookBusy}>
              {webhookBusy ? 'Working…' : tg.webhookInfo?.url ? 'Re-register webhook' : 'Register webhook'}
            </button>
          </>
        )}
      </div>
    </>
  );
}
