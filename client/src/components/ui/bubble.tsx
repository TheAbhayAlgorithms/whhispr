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
      ? 'bg-[#F3F3F2] text-[#191A1A] dark:bg-[#202222] dark:text-[#EDEDED] border border-[#E5E5E3] dark:border-[#2D3030] shadow-xs'
      : 'bg-[#E6F7F6] text-[#191A1A] dark:bg-[#1D2B29] dark:text-[#EDEDED] border border-[#B2E5E2] dark:border-[#25423E] shadow-xs';

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
