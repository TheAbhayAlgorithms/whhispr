import React from 'react';

interface ComeOverLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  animated?: boolean;
}

export const ComeOverLogo: React.FC<ComeOverLogoProps> = ({
  className = 'w-9 h-9 sm:w-10 sm:h-10',
  size,
  showText = false,
  animated = true,
}) => {
  return (
    <div className="inline-flex items-center gap-2.5">
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

          {animated && (
            <style>{`
              @keyframes co-pulse-core {
                0%, 100% {
                  transform: scale(0.88);
                  opacity: 0.85;
                }
                50% {
                  transform: scale(1.22);
                  opacity: 1;
                  filter: drop-shadow(0 0 3px #20B2AA);
                }
              }

              @keyframes co-ring-breathe {
                0%, 100% {
                  transform: scale(1) rotate(0deg);
                  opacity: 0.92;
                }
                50% {
                  transform: scale(1.025) rotate(2deg);
                  opacity: 1;
                  filter: drop-shadow(0 0 4px rgba(32, 178, 170, 0.6));
                }
              }

              @keyframes co-ribbon-shimmer {
                0%, 100% {
                  opacity: 0.9;
                  transform: scale(1);
                }
                50% {
                  opacity: 1;
                  transform: scale(1.02);
                  filter: drop-shadow(0 0 5px rgba(52, 211, 153, 0.7));
                }
              }

              @keyframes co-border-glow {
                0%, 100% {
                  stroke: #2C2E2E;
                }
                50% {
                  stroke: rgba(32, 178, 170, 0.45);
                }
              }

              .co-anim-core {
                transform-box: fill-box;
                transform-origin: center;
                animation: co-pulse-core 2.4s ease-in-out infinite;
              }

              .co-anim-ring {
                transform-box: fill-box;
                transform-origin: center;
                animation: co-ring-breathe 4s ease-in-out infinite;
              }

              .co-anim-ribbon {
                transform-box: fill-box;
                transform-origin: center;
                animation: co-ribbon-shimmer 3.2s ease-in-out infinite;
              }

              .co-anim-border {
                animation: co-border-glow 4s ease-in-out infinite;
              }
            `}</style>
          )}
        </defs>

        {/* Background squircle */}
        <rect width="64" height="64" rx="18" fill="#141515" />
        <rect
          width="62"
          height="62"
          x="1"
          y="1"
          rx="17"
          stroke="#2C2E2E"
          strokeWidth="1.5"
          className={animated ? 'co-anim-border' : undefined}
        />

        {/* Outer 'C' Ribbon */}
        <path
          d="M42 18 C30 14, 16 22, 16 32 C16 42, 28 50, 42 46 C34 44, 25 39, 25 32 C25 25, 33 20, 42 18 Z"
          fill="url(#co-grad-1)"
          filter="url(#co-glow)"
          className={animated ? 'co-anim-ribbon' : undefined}
        />

        {/* Intersecting 'O' / Portal Ring */}
        <circle
          cx="38"
          cy="32"
          r="13"
          stroke="url(#co-grad-1)"
          strokeWidth="4.5"
          strokeLinecap="round"
          className={animated ? 'co-anim-ring' : undefined}
        />

        {/* Dynamic ComeOver bridge core */}
        <circle
          cx="38"
          cy="32"
          r="4"
          fill="url(#co-grad-2)"
          className={animated ? 'co-anim-core' : undefined}
        />
      </svg>

      {showText && (
        <span className="text-base font-bold tracking-tight text-[#EDEDED] leading-none">
          ComeOver
        </span>
      )}
    </div>
  );
};

export default ComeOverLogo;
