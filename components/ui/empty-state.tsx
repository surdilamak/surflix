/**
 * Empty State — pas gak ada data
 * Friendly + actionable
 */
'use client';

import { Icons, IconName } from './icons';

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon = 'Search', title, description, action }: EmptyStateProps) {
  const Icon = Icons[icon];

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-rq bg-rq-surface">
        <Icon className="h-7 w-7 text-rq-accent" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      {description && (
        <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-rq-muted">
          {description}
        </p>
      )}
      {action && (
        <button onClick={action.onClick} className="btn-secondary mt-5">
          {action.label}
        </button>
      )}
    </div>
  );
}
