"use client";

import { useEffect, useRef } from "react";

const PALETTES = [
  ["#fbbf24", "#f59e0b", "#fde68a", "#fcd34d"], // gold
  ["#22c55e", "#4ade80", "#86efac", "#bbf7d0"], // green
  ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"], // blue
  ["#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"], // purple
  ["#ec4899", "#f472b6", "#f9a8d4", "#fbcfe8"], // pink
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
  decay: number;
  trail: { x: number; y: number; alpha: number }[];
}

interface Firework {
  x: number;
  y: number;
  targetY: number;
  vy: number;
  color: string;
  palette: string[];
  exploded: boolean;
  trail: { x: number; y: number; alpha: number }[];
  alpha: number;
}

export function FireworksCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const particles: Particle[] = [];
    const fireworks: Firework[] = [];
    let animId: number;
    let done = false;

    function spawnFirework() {
      const paletteIdx = Math.floor(Math.random() * PALETTES.length);
      const palette = PALETTES[paletteIdx];
      fireworks.push({
        x: w * 0.1 + Math.random() * w * 0.8,
        y: h,
        targetY: h * 0.15 + Math.random() * h * 0.35,
        vy: -(8 + Math.random() * 4),
        color: palette[0],
        palette,
        exploded: false,
        trail: [],
        alpha: 1,
      });
    }

    // Stagger 7 fireworks over ~3s
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < 7; i++) {
      timers.push(setTimeout(spawnFirework, i * 420 + Math.random() * 200));
    }

    function explode(fw: Firework) {
      const count = 80 + Math.floor(Math.random() * 40);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
        const speed = 2 + Math.random() * 5;
        particles.push({
          x: fw.x,
          y: fw.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          color: fw.palette[Math.floor(Math.random() * fw.palette.length)],
          size: 1.5 + Math.random() * 2,
          decay: 0.012 + Math.random() * 0.008,
          trail: [],
        });
      }
    }

    function animate() {
      if (done) return;
      ctx!.globalCompositeOperation = "source-over";
      ctx!.fillStyle = "rgba(0, 0, 0, 0.15)";
      ctx!.fillRect(0, 0, w, h);
      ctx!.globalCompositeOperation = "lighter";

      // Update fireworks (rising phase)
      for (let i = fireworks.length - 1; i >= 0; i--) {
        const fw = fireworks[i];
        if (fw.exploded) {
          fireworks.splice(i, 1);
          continue;
        }

        fw.trail.push({ x: fw.x, y: fw.y, alpha: 0.8 });
        if (fw.trail.length > 6) fw.trail.shift();

        fw.y += fw.vy;
        fw.vy *= 0.98;

        // Draw trail
        for (const t of fw.trail) {
          ctx!.beginPath();
          ctx!.arc(t.x, t.y, 2, 0, Math.PI * 2);
          ctx!.fillStyle = fw.color;
          ctx!.globalAlpha = t.alpha;
          ctx!.fill();
          t.alpha *= 0.8;
        }
        ctx!.globalAlpha = 1;

        // Draw firework dot
        ctx!.beginPath();
        ctx!.arc(fw.x, fw.y, 3, 0, Math.PI * 2);
        ctx!.fillStyle = fw.color;
        ctx!.fill();

        if (fw.y <= fw.targetY) {
          fw.exploded = true;
          explode(fw);
        }
      }

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        p.trail.push({ x: p.x, y: p.y, alpha: p.alpha * 0.5 });
        if (p.trail.length > 3) p.trail.shift();

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06; // gravity
        p.vx *= 0.985;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        // Draw trail
        for (const t of p.trail) {
          ctx!.beginPath();
          ctx!.arc(t.x, t.y, p.size * 0.6, 0, Math.PI * 2);
          ctx!.fillStyle = p.color;
          ctx!.globalAlpha = t.alpha * 0.4;
          ctx!.fill();
        }

        // Draw particle
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = p.color;
        ctx!.globalAlpha = p.alpha;
        ctx!.fill();
      }

      ctx!.globalAlpha = 1;

      if (particles.length === 0 && fireworks.length === 0) {
        // All done — clear canvas and stop
        ctx!.clearRect(0, 0, w, h);
        done = true;
        return;
      }

      animId = requestAnimationFrame(animate);
    }

    // Start after a brief delay so the banner entrance plays first
    const startTimer = setTimeout(() => {
      animId = requestAnimationFrame(animate);
    }, 300);

    return () => {
      done = true;
      cancelAnimationFrame(animId);
      clearTimeout(startTimer);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-50 pointer-events-none"
      aria-hidden="true"
    />
  );
}
