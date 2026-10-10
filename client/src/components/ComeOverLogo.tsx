import React from 'react';

interface ComeOverLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const ComeOverLogo: React.FC<ComeOverLogoProps> = ({
  className = 'w-9 h-9 sm:w-10 sm:h-10',
  size,
  showText = false,
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 ${showText ? '' : ''}`}>
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={size ? { width: size, height: size } : undefined}
      >
        <defs>
          <linearGradient id="co-grad-1" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#20B2AA" />
            <stop offset="50%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id="co-grad-2" x1="16" y1="48" x2="48" y2="16" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#20B2AA" stopOpacity="0.9" />
          </linearGradient>
          <filter id="co-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background squircle */}
        <rect width="64" height="64" rx="18" fill="#141515" />
        <rect width="62" height="62" x="1" y="1" rx="17" stroke="#2C2E2E" strokeWidth="1.5" />

        {/* Outer 'C' Ribbon */}
        <path
          d="M42 18 C30 14, 16 22, 16 32 C16 42, 28 50, 42 46 C34 44, 25 39, 25 32 C25 25, 33 20, 42 18 Z"
          fill="url(#co-grad-1)"
          filter="url(#co-glow)"
        />

        {/* Intersecting 'O' / Portal Ring */}
        <circle
          cx="38"
          cy="32"
          r="13"
          stroke="url(#co-grad-1)"
          strokeWidth="4.5"
          strokeLinecap="round"
        />

        {/* Dynamic ComeOver bridge core */}
        <circle cx="38" cy="32" r="4" fill="url(#co-grad-2)" />
      </svg>

      {showText && (
        <div className="flex flex-col text-left">
          <span className="text-base font-bold tracking-tight text-[#EDEDED] leading-tight">
            ComeOver
          </span>
          <span className="text-[10px] font-medium text-[#9EA3A3]">
            Secure Messaging
          </span>
        </div>
      )}
    </div>
  );
};

export default ComeOverLogo;
