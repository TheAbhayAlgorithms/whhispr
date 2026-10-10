import React, { useState, useEffect } from 'react';

export interface DevicesLoadingProps {
  /** Size variant: 'sm' (inline/compact), 'md' (standard panel), 'lg' (large card), 'fullscreen' */
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
  /** Optional status text shown below the devices */
  label?: string;
  /** Custom extra classes */
  className?: string;
  /** Optional theme accent: 'teal' (default ComeOver), 'monochrome' (pure white/gray like dribbble shot) */
  accent?: 'teal' | 'monochrome';
}

type DeviceType = 'monitor' | 'laptop' | 'tablet' | 'phone' | 'watch';

const DEVICES: DeviceType[] = ['monitor', 'laptop', 'tablet', 'phone', 'watch'];

// Corresponding shadow widths for each device to match the ground reflection
const SHADOW_WIDTHS: Record<DeviceType, number> = {
  monitor: 56,
  laptop: 74,
  tablet: 48,
  phone: 32,
  watch: 28,
};

export const DevicesLoading: React.FC<DevicesLoadingProps> = ({
  size = 'md',
  label,
  className = '',
  accent = 'teal',
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % DEVICES.length);
    }, 1250);

    return () => clearInterval(interval);
  }, []);

  const currentDevice = DEVICES[currentIndex];
  const shadowWidth = SHADOW_WIDTHS[currentDevice];

  // Sizing definitions
  const dimensions = {
    sm: { box: 44, stroke: 1.8, shadowH: 3 },
    md: { box: 80, stroke: 2, shadowH: 4 },
    lg: { box: 110, stroke: 2.2, shadowH: 5 },
    fullscreen: { box: 100, stroke: 2, shadowH: 5 },
  }[size];

  const strokeColor =
    accent === 'teal'
      ? 'stroke-[#20B2AA] dark:stroke-[#20B2AA]'
      : 'stroke-white dark:stroke-white';

  const glowShadow =
    accent === 'teal'
      ? 'drop-shadow-[0_0_8px_rgba(32,178,170,0.45)]'
      : 'drop-shadow-[0_0_8px_rgba(255,255,255,0.35)]';

  const content = (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      {/* Device Animation Box */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: dimensions.box, height: dimensions.box }}
      >
        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`w-full h-full transition-all duration-300 ${glowShadow}`}
        >
          {/* Subtle gradient definitions */}
          <defs>
            <linearGradient id="device-grad-teal" x1="20" y1="20" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#20B2AA" />
              <stop offset="50%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
            <linearGradient id="ground-glow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#20B2AA" stopOpacity="0" />
              <stop offset="50%" stopColor="#20B2AA" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#20B2AA" stopOpacity="0" />
            </linearGradient>
            <filter id="soft-blur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" />
            </filter>
          </defs>

          {/* 1. DESKTOP MONITOR */}
          <g
            className={`transition-all duration-300 ease-out origin-center ${
              currentDevice === 'monitor'
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-90 pointer-events-none'
            }`}
          >
            {/* Screen */}
            <rect
              x="24"
              y="20"
              width="72"
              height="48"
              rx="6"
              className={strokeColor}
              strokeWidth={dimensions.stroke}
            />
            {/* Inner screen accent line */}
            <line
              x1="30"
              y1="61"
              x2="90"
              y2="61"
              className={`${strokeColor} opacity-20`}
              strokeWidth="1"
            />
            {/* Stand neck */}
            <line
              x1="60"
              y1="68"
              x2="60"
              y2="78"
              className={strokeColor}
              strokeWidth={dimensions.stroke}
              strokeLinecap="round"
            />
            {/* Stand base */}
            <line
              x1="44"
              y1="78"
              x2="76"
              y2="78"
              className={strokeColor}
              strokeWidth={dimensions.stroke}
              strokeLinecap="round"
            />
          </g>

          {/* 2. LAPTOP */}
          <g
            className={`transition-all duration-300 ease-out origin-center ${
              currentDevice === 'laptop'
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-90 pointer-events-none'
            }`}
          >
            {/* Screen lid */}
            <rect
              x="26"
              y="25"
              width="68"
              height="43"
              rx="5"
              className={strokeColor}
              strokeWidth={dimensions.stroke}
            />
            {/* Base platform */}
            <path
              d="M16 71 L104 71 C102 75 99 76 95 76 L25 76 C21 76 18 75 16 71 Z"
              className={strokeColor}
              strokeWidth={dimensions.stroke}
              strokeLinejoin="round"
            />
            {/* Trackpad notch */}
            <line
              x1="54"
              y1="71"
              x2="66"
              y2="71"
              className={`${strokeColor} opacity-50`}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>

          {/* 3. TABLET (iPad) */}
          <g
            className={`transition-all duration-300 ease-out origin-center ${
              currentDevice === 'tablet'
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-90 pointer-events-none'
            }`}
          >
            {/* Tablet Body */}
            <rect
              x="30"
              y="16"
              width="60"
              height="70"
              rx="8"
              className={strokeColor}
              strokeWidth={dimensions.stroke}
            />
            {/* Camera dot */}
            <circle cx="60" cy="22" r="1.5" fill="currentColor" className="text-[#20B2AA]" />
            {/* Bottom home indicator line */}
            <line
              x1="52"
              y1="78"
              x2="68"
              y2="78"
              className={`${strokeColor} opacity-50`}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>

          {/* 4. SMARTPHONE (iPhone) */}
          <g
            className={`transition-all duration-300 ease-out origin-center ${
              currentDevice === 'phone'
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-90 pointer-events-none'
            }`}
          >
            {/* Phone body */}
            <rect
              x="40"
              y="14"
              width="40"
              height="74"
              rx="10"
              className={strokeColor}
              strokeWidth={dimensions.stroke}
            />
            {/* Dynamic Island / speaker */}
            <rect
              x="52"
              y="19"
              width="16"
              height="3.5"
              rx="1.75"
              className={`${strokeColor} opacity-80`}
              fill="currentColor"
            />
            {/* Home bar */}
            <line
              x1="51"
              y1="81"
              x2="69"
              y2="81"
              className={`${strokeColor} opacity-50`}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>

          {/* 5. SMARTWATCH */}
          <g
            className={`transition-all duration-300 ease-out origin-center ${
              currentDevice === 'watch'
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-90 pointer-events-none'
            }`}
          >
            {/* Top strap */}
            <path
              d="M48 29 L48 14 C48 12 50 11 52 11 L68 11 C70 11 72 12 72 14 L72 29"
              className={`${strokeColor} opacity-60`}
              strokeWidth={dimensions.stroke}
            />
            {/* Bottom strap */}
            <path
              d="M48 73 L48 88 C48 90 50 91 52 91 L68 91 C70 91 72 90 72 88 L72 73"
              className={`${strokeColor} opacity-60`}
              strokeWidth={dimensions.stroke}
            />
            {/* Watch Case */}
            <rect
              x="42"
              y="29"
              width="36"
              height="44"
              rx="11"
              className={strokeColor}
              strokeWidth={dimensions.stroke}
            />
            {/* Digital Crown */}
            <path
              d="M78 44 C79.5 44 80.5 44.8 80.5 46 L80.5 54 C80.5 55.2 79.5 56 78 56"
              className={strokeColor}
              strokeWidth={dimensions.stroke}
              strokeLinecap="round"
            />
            {/* Inner subtle watch dial ring */}
            <circle
              cx="60"
              cy="51"
              r="10"
              className={`${strokeColor} opacity-20`}
              strokeWidth="1"
            />
          </g>
        </svg>

        {/* Dynamic Ground Shadow / Reflection (scales horizontally with each device) */}
        <div
          className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full transition-all duration-400 ease-out pointer-events-none"
          style={{
            width: `${(shadowWidth / 120) * dimensions.box}px`,
            height: dimensions.shadowH,
            background:
              accent === 'teal'
                ? 'radial-gradient(ellipse at center, rgba(32,178,170,0.55) 0%, rgba(32,178,170,0.1) 70%, transparent 100%)'
                : 'radial-gradient(ellipse at center, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.08) 70%, transparent 100%)',
            filter: 'blur(2px)',
          }}
        />
      </div>

      {/* Optional Status Label */}
      {label && (
        <span
          className={`font-medium tracking-wide transition-opacity duration-300 animate-pulse ${
            size === 'sm'
              ? 'text-[11px] mt-1 text-[#737878] dark:text-[#9EA3A3]'
              : size === 'fullscreen'
              ? 'text-sm mt-4 text-[#EDEDED]'
              : 'text-xs mt-2.5 text-[#9EA3A3]'
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );

  if (size === 'fullscreen') {
    return (
      <div className="min-h-screen min-h-dvh flex flex-col items-center justify-center bg-[#191A1A] text-[#EDEDED] p-4 transition-colors">
        {content}
      </div>
    );
  }

  return content;
};

export default DevicesLoading;
