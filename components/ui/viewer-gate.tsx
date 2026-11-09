/**
 * Request Hub forms (request and remark) are for signed-in Surflix accounts only:
 *  - SignInGate replaces the form while the visitor is signed out.
 *  - ViewerNameField shows the account name, read only, instead of a free "your name" input.
 */
'use client';

import { useLang } from '@/components/connections/lang-provider';
import { useViewer } from '@/components/connections/viewer-provider';

export function SignInGate() {
  const { t } = useLang();
  const viewer = useViewer();
  if (viewer.status === 'loading') return <div className="h-32" aria-busy="true" />;
  return (
    <div className="space-y-3">
      <p className="rq-small text-white">{t('hub.form.gateTitle')}</p>
      <p className="text-xs text-rq-muted">{t('hub.form.gateBody')}</p>
      <button type="button" onClick={viewer.openLogin} className="rq-btn rq-btn-primary w-full">
        {t('hub.form.gateBtn')}
      </button>
    </div>
  );
}

export function ViewerNameField() {
  const { t } = useLang();
  const viewer = useViewer();
  return (
    <div>
      <label className="rq-small mb-2 block text-rq-muted" htmlFor="rq-viewer-name">
        {t('hub.form.name')}
      </label>
      <input
        id="rq-viewer-name"
        type="text"
        value={viewer.name ?? ''}
        readOnly
        aria-readonly="true"
        tabIndex={-1}
        className="rq-input w-full cursor-not-allowed opacity-70"
      />
      <p className="mt-1 text-xs text-rq-muted">{t('hub.form.nameLocked')}</p>
    </div>
  );
}
