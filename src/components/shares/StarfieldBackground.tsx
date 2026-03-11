"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  speed: number;
  phase: number;
}

export default function StarfieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);

    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;

    // 星のデータをランダムに生成
    const STAR_COUNT = 140;
    const stars: Star[] = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      size: Math.random() * 1.6 + 0.4,
      baseOpacity: Math.random() * 0.55 + 0.2,
      speed: (Math.random() * 0.8 + 0.3) * 0.001, // twinkle周期: ~1.2–5s
      phase: Math.random() * Math.PI * 2,
    }));

    const makeGradient = (
      cx: number,
      cy: number,
      r: number,
      color: string,
      alpha: number,
    ) => {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(
        0,
        color.replace(")", `, ${alpha})`).replace("rgb", "rgba"),
      );
      g.addColorStop(1, "rgba(0,0,0,0)");
      return g;
    };

    let lastTs = 0;
    const draw = (ts: number) => {
      const dt = ts - lastTs;
      lastTs = ts;

      ctx.clearRect(0, 0, W, H);

      ctx.fillStyle = makeGradient(
        W * 0.18,
        H * 0.18,
        W * 0.38,
        "rgb(129,140,248)",
        0.15,
      );
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = makeGradient(
        W * 0.82,
        H * 0.82,
        W * 0.35,
        "rgb(168,85,247)",
        0.12,
      );
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = makeGradient(
        W * 0.5,
        H * 0.5,
        W * 0.4,
        "rgb(236,72,153)",
        0.05,
      );
      ctx.fillRect(0, 0, W, H);

      // 星を描画
      for (const star of stars) {
        // 星の点滅を更新
        star.phase += star.speed * dt;
        const flicker = Math.sin(star.phase) * 0.5 + 0.5; // 0~1
        const opacity = star.baseOpacity * (0.55 + 0.45 * flicker);

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${opacity})`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafRef.current);
      resize();
      // サイズ変更後は星を再配置
      const nW = canvas.offsetWidth;
      const nH = canvas.offsetHeight;
      for (const star of stars) {
        star.x = Math.random() * nW;
        star.y = Math.random() * nH;
      }
      rafRef.current = requestAnimationFrame(draw);
    });
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        display: "block",
      }}
    />
  );
}
