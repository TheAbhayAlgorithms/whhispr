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
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({
          width: Math.max(clientWidth, 320),
          height: Math.max(clientHeight, 320)
        });
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

    // Ambient floating star/quantum particle field
    const particles = Array.from({ length: 48 }, () => ({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      size: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.5 + 0.2,
      speed: Math.random() * 0.002 + 0.001
    }));

    const render = () => {
      time += 0.015;

      // Smooth mouse interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.06;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.06;

      const dpr = window.devicePixelRatio || 1;
      const width = dimensions.width;
      const height = dimensions.height;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.resetTransform();
      ctx.scale(dpr, dpr);

      // Deep dark void clear
      ctx.fillStyle = '#060709';
      ctx.fillRect(0, 0, width, height);

      // Subtle ambient quantum atmosphere gradient
      const atmosphere = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.55
      );
      atmosphere.addColorStop(0, 'rgba(139, 149, 246, 0.09)');
      atmosphere.addColorStop(0.4, 'rgba(18, 20, 28, 0.5)');
      atmosphere.addColorStop(0.85, 'rgba(6, 7, 9, 0.98)');
      ctx.fillStyle = atmosphere;
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.39;

      // Draw subtle drifting quantum particles in background
      particles.forEach((p) => {
        p.y -= p.speed;
        if (p.y < -1) p.y = 1;
        const px = centerX + p.x * (width * 0.45) + mouseRef.current.x * 15;
        const py = centerY + p.y * (height * 0.45) + mouseRef.current.y * 15;
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.4})`;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Rotation angles driven by auto-rotation and interactive cursor tilt
      const rotX = mouseRef.current.y * 0.75 + Math.sin(time * 0.35) * 0.12;
      const rotY = time * 0.32 + mouseRef.current.x * 1.25;

      const cosRx = Math.cos(rotX);
      const sinRx = Math.sin(rotX);

      // Render dual hemispheres (Upper Dome & Lower Bowl) matching Image 4
      const drawHemisphere = (isUpper: boolean) => {
        const ringCount = 30;
        const pointsPerRing = 130;

        for (let r = 0; r < ringCount; r++) {
          const tRing = r / (ringCount - 1); // 0 (equator gap edge) to 1 (pole)
          const phi = 0.12 + tRing * 1.38;
          const ringY = Math.sin(phi) * radius * (isUpper ? -1 : 1);
          const ringR = Math.cos(phi) * radius;

          // Gap separation offset between upper dome and lower bowl
          const gapOffset = (isUpper ? -1 : 1) * (radius * 0.17 + Math.sin(time * 1.2) * 4);

          // Determine ring accent color (crisp silver white, vibrant lime, or periwinkle)
          const isPoleRing = tRing > 0.88;
          const isAccentRing = r % 7 === 0;

          // Projected points buffer for this ring
          const pts: Array<{ x: number; y: number; z: number }> = [];

          for (let p = 0; p <= pointsPerRing; p++) {
            const theta = (p / pointsPerRing) * Math.PI * 2;

            // Undulating topographical landscape wave harmonics
            const waveFreq1 = 3;
            const waveFreq2 = 5;
            const wave1 = Math.sin(theta * waveFreq1 + time * 1.4 + r * 0.22) * 9;
            const wave2 = Math.cos(theta * waveFreq2 - time * 0.8 + (isUpper ? 1 : -1)) * 5;
            const cursorInfluence =
              Math.sin(theta + mouseRef.current.x * 2) * Math.cos(phi + mouseRef.current.y * 2) * 14;

            const localRadius = ringR + wave1 + wave2 + cursorInfluence;
            const localY = ringY + gapOffset + Math.sin(theta * 2 + time * 1.1) * 3;

            // 3D coordinates on sphere
            const x3d = localRadius * Math.cos(theta + rotY);
            const z3d = localRadius * Math.sin(theta + rotY);
            const y3d = localY;

            // Rotate around X axis (pitch)
            const yRot = y3d * cosRx - z3d * sinRx;
            const zRot = y3d * sinRx + z3d * cosRx;

            // 3D perspective projection
            const fov = radius * 3.0;
            const scale = fov / (fov + zRot);
            const projX = centerX + x3d * scale;
            const projY = centerY + yRot * scale;

            pts.push({ x: projX, y: projY, z: zRot });
          }

          // Draw ring in segments with front-facing luminosity and crisp contrast
          for (let p = 0; p < pts.length - 1; p++) {
            const p1 = pts[p];
            const p2 = pts[p + 1];
            const avgZ = (p1.z + p2.z) / 2;
            const isFront = avgZ > -radius * 0.1;

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);

            if (isPoleRing) {
              // Radiant lime pole cap
              ctx.strokeStyle = isFront
                ? 'rgba(226, 249, 82, 0.98)'
                : 'rgba(226, 249, 82, 0.35)';
              ctx.lineWidth = isFront ? 1.9 : 1.1;
            } else if (isAccentRing) {
              // Periwinkle contour accent
              ctx.strokeStyle = isFront
                ? 'rgba(139, 149, 246, 0.92)'
                : 'rgba(139, 149, 246, 0.3)';
              ctx.lineWidth = isFront ? 1.7 : 1.0;
            } else {
              // Crisp high-visibility silver / white contour
              const baseAlpha = isFront ? 0.95 : 0.22;
              ctx.strokeStyle = `rgba(255, 255, 255, ${baseAlpha})`;
              ctx.lineWidth = isFront ? 1.5 : 0.9;
            }

            ctx.stroke();
          }
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
      className={`relative w-full h-full flex items-center justify-center overflow-hidden cursor-crosshair select-none bg-[#060709] ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
    </div>
  );
};

export default WireframeGlobeAnimation;
