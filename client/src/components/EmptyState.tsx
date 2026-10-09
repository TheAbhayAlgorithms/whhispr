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
      <div className="w-16 h-16 rounded-2xl bg-[#1D2B29] border border-[#25423E] text-[#20B2AA] flex items-center justify-center mb-4 shadow-sm">
        {icon}
      </div>

      <h3 className="text-base font-bold text-[#EDEDED] mb-1 tracking-tight">
        {title}
      </h3>

      <p className="text-xs text-[#9EA3A3] leading-relaxed mb-5">
        {description}
      </p>

      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#20B2AA] hover:bg-[#1CA099] text-black text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
        >
          {actionIcon}
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
}
