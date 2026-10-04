import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  actionIcon?: React.ReactNode;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionText,
  actionIcon,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto select-none ${className}`}
      role="status"
    >
      <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 shadow-sm">
        {icon}
      </div>

      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 tracking-tight">
        {title}
      </h3>

      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
        {description}
      </p>

      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition active:scale-95 focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          {actionIcon}
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
}
