import React, { useEffect, useRef, useState } from 'react';

interface WireframeGlobeProps {
  className?: string;
  accentColor?: string;
}

export const WireframeGlobeAnimation: React.FC<WireframeGlobeProps> = ({
  className = '',
  accentColor = '#8B95F6'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, isHovered: false });
  const [dimensions, setDimensions] = useState({ width: 600, height: 600 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        const size = Math.min(Math.max(clientWidth, 320), Math.max(clientHeight, 320));
        setDimensions({ width: size, height: size });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const render = () => {
      time += 0.015;

      // Smooth mouse interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.06;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.06;

      const dpr = window.devicePixelRatio || 1;
      const width = dimensions.width;
      const height = dimensions.height;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.resetTransform();
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.36;

      // Rotation angles driven by auto-rotation and mouse position
      const rotX = mouseRef.current.y * 0.75 + Math.sin(time * 0.4) * 0.12;
      const rotY = time * 0.35 + mouseRef.current.x * 1.2;

      // Render dual hemispheres (Upper Dome & Lower Bowl) matching Image 4
      const drawHemisphere = (isUpper: boolean) => {
        const ringCount = 28;
        const pointsPerRing = 120;

        for (let r = 0; r < ringCount; r++) {
          const tRing = r / (ringCount - 1); // 0 (equator gap edge) to 1 (pole)
          // Latitude angle: from near equator (0.12 rad) to near pole (1.45 rad)
          const phi = 0.14 + tRing * 1.35;
          const ringY = Math.sin(phi) * radius * (isUpper ? -1 : 1);
          const ringR = Math.cos(phi) * radius;

          // Gap separation offset
          const gapOffset = (isUpper ? -1 : 1) * (radius * 0.18 + Math.sin(time * 1.2) * 4);

          ctx.beginPath();
          let firstPoint: { x: number; y: number } | null = null;

          for (let p = 0; p <= pointsPerRing; p++) {
            const theta = (p / pointsPerRing) * Math.PI * 2;

            // Undulating topographical landscape wave distortion matching Image 4
            const waveFreq1 = 3;
            const waveFreq2 = 5;
            const wave1 = Math.sin(theta * waveFreq1 + time * 1.5 + r * 0.25) * 8;
            const wave2 = Math.cos(theta * waveFreq2 - time * 0.8 + (isUpper ? 1 : -1)) * 5;
            const cursorInfluence =
              Math.sin(theta + mouseRef.current.x * 2) * Math.cos(phi + mouseRef.current.y * 2) * 12;

            const localRadius = ringR + wave1 + wave2 + cursorInfluence;
            const localY = ringY + gapOffset + Math.sin(theta * 2 + time) * 3;

            // 3D coordinates on sphere
            const x3d = localRadius * Math.cos(theta + rotY);
            const z3d = localRadius * Math.sin(theta + rotY);
            let y3d = localY;

            // Rotate around X axis (pitch)
            const cosRx = Math.cos(rotX);
            const sinRx = Math.sin(rotX);
            const yRot = y3d * cosRx - z3d * sinRx;
            const zRot = y3d * sinRx + z3d * cosRx;

            // 3D perspective projection
            const fov = radius * 2.8;
            const scale = fov / (fov + zRot);
            const projX = centerX + x3d * scale;
            const projY = centerY + yRot * scale;

            if (p === 0) {
              ctx.moveTo(projX, projY);
              firstPoint = { x: projX, y: projY };
            } else {
              ctx.lineTo(projX, projY);
            }
          }

          if (firstPoint) {
            ctx.lineTo(firstPoint.x, firstPoint.y);
          }

          // Dynamic line color opacity with subtle depth fading and gradient
          const depthAlpha = 0.25 + (1 - tRing) * 0.65;
          const isPoleGlow = tRing > 0.82;

          // Shady periwinkle / soft glow color styling matching Image 2 & 4
          if (isPoleGlow) {
            ctx.strokeStyle = `rgba(226, 249, 82, ${depthAlpha * 0.85})`; // Subtle lime accent
            ctx.lineWidth = 1.25;
          } else {
            ctx.strokeStyle = `rgba(215, 225, 255, ${depthAlpha * 0.72})`;
            ctx.lineWidth = 0.95 + (1 - tRing) * 0.4;
          }

          ctx.stroke();
        }
      };

      // Draw lower bowl then upper dome
      drawHemisphere(false);
      drawHemisphere(true);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [dimensions, accentColor]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    mouseRef.current.targetX = x;
    mouseRef.current.targetY = y;
    mouseRef.current.isHovered = true;
  };

  const handleMouseLeave = () => {
    mouseRef.current.targetX = 0;
    mouseRef.current.targetY = 0;
    mouseRef.current.isHovered = false;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full h-full flex flex-col items-center justify-center overflow-hidden cursor-crosshair select-none ${className}`}
    >
      {/* Background radial atmosphere glow matching Image 2 */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(139,149,246,0.08)_0%,rgba(22,23,27,0)_65%)]" />

      {/* Responsive Canvas */}
      <canvas
        ref={canvasRef}
        style={{ width: dimensions.width, height: dimensions.height }}
        className="relative z-10 transition-transform duration-300 ease-out"
      />

      {/* Floating subtle badge beneath sphere */}
      <div className="relative z-20 mt-2 flex flex-col items-center text-center px-4 max-w-sm pointer-events-none">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#1F2028]/80 border border-[#2B2C37] shadow-lg backdrop-blur-md mb-2">
          <span className="w-2 h-2 rounded-full bg-[#E2F952] animate-pulse" />
          <span className="text-[11px] font-semibold tracking-wide text-zinc-300">
            Interactive Quantum Space
          </span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Hover to rotate sphere • Select any conversation from the list to begin chatting
        </p>
      </div>
    </div>
  );
};

export default WireframeGlobeAnimation;
