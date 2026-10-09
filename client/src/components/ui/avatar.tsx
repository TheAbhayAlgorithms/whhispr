import React, { useState } from 'react';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Avatar({ className = '', size = 'md', children, ...props }: AvatarProps) {
  const sizeClass =
    size === 'sm'
      ? 'h-7 w-7'
      : size === 'lg'
      ? 'h-10 w-10'
      : 'h-8 w-8 sm:h-9 sm:w-9';

  return (
    <div
      className={`relative flex ${sizeClass} shrink-0 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700/60 shadow-xs select-none ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
  className?: string;
}

export function AvatarImage({ src, alt = '', className = '', ...props }: AvatarImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return null;
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className={`h-full w-full object-cover rounded-full ${className}`}
      {...props}
    />
  );
}

export interface AvatarFallbackProps extends React.HTMLAttributes<HTMLSpanElement> {
  className?: string;
}

export function AvatarFallback({ className = '', children, ...props }: AvatarFallbackProps) {
  return (
    <span
      className={`flex h-full w-full items-center justify-center rounded-full bg-slate-200 dark:bg-zinc-800 text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-zinc-200 ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
