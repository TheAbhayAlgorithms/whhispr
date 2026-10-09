import React from 'react';

export interface BubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'muted';
  className?: string;
  children?: React.ReactNode;
}

export function Bubble({
  variant = 'default',
  className = '',
  children,
  ...props
}: BubbleProps) {
  const variantStyles =
    variant === 'muted'
      ? 'bg-slate-100 text-slate-900 dark:bg-[#27272a] dark:text-zinc-100 border border-slate-200/50 dark:border-zinc-700/40 shadow-xs'
      : 'bg-blue-600 text-white shadow-xs';

  return (
    <div
      className={`relative inline-block w-fit max-w-full rounded-[1.25rem] px-4.5 py-2.5 sm:px-5 sm:py-3 text-[14px] leading-relaxed transition-all duration-150 ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export interface BubbleContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
}

export function BubbleContent({ className = '', children, ...props }: BubbleContentProps) {
  return (
    <div className={`break-words text-[14px] leading-relaxed ${className}`} {...props}>
      {children}
    </div>
  );
}

export interface BubbleGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
}

export function BubbleGroup({ className = '', children, ...props }: BubbleGroupProps) {
  return (
    <div className={`flex flex-col gap-2 w-full ${className}`} {...props}>
      {children}
    </div>
  );
}
