"use client";
import { useEffect, useRef } from "react";

/**
 * Fondo fijo con nebulosa y campo de estrellas.
 * Se renderiza una sola vez en el layout, detrás de todo el contenido.
 */
export default function NebulaBackground() {
  const ref = useRef(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const frag = document.createDocumentFragment();

    // ── Estrellas blancas ─────────────────────────────────────────────
    for (let i = 0; i < 200; i++) {
      const s = document.createElement("div");
      const size = Math.random() < 0.75 ? 1 : Math.random() * 1.5 + 1;
      const dur = (Math.random() * 4 + 2).toFixed(1);
      const delay = (Math.random() * 10).toFixed(1);
      s.style.cssText = `
        position:absolute;
        left:${(Math.random() * 100).toFixed(2)}%;
        top:${(Math.random() * 100).toFixed(2)}%;
        width:${size}px;height:${size}px;
        border-radius:50%;
        background:white;
        opacity:${(Math.random() * 0.55 + 0.2).toFixed(2)};
        animation:star-twinkle ${dur}s ${delay}s ease-in-out infinite;
      `;
      frag.appendChild(s);
    }

    // ── Estrellas de colores (toque FFG) ──────────────────────────────
    const colors = ["#e8c547", "#c8992a", "#26c6c3", "#a855f7", "#f0e8d6"];
    for (let i = 0; i < 22; i++) {
      const s = document.createElement("div");
      const c = colors[Math.floor(Math.random() * colors.length)];
      const dur = (Math.random() * 3 + 2).toFixed(1);
      const delay = (Math.random() * 8).toFixed(1);
      s.style.cssText = `
        position:absolute;
        left:${(Math.random() * 100).toFixed(2)}%;
        top:${(Math.random() * 100).toFixed(2)}%;
        width:2px;height:2px;
        border-radius:50%;
        background:${c};
        opacity:0.7;
        box-shadow:0 0 5px ${c};
        animation:star-twinkle ${dur}s ${delay}s ease-in-out infinite;
      `;
      frag.appendChild(s);
    }

    container.appendChild(frag);
    return () => {
      container.innerHTML = "";
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
        /* Nebulosa multicapa — inspirada en las ilustraciones FFG */
        background: `
          radial-gradient(ellipse at 12% 22%, rgba(147,51,234,0.32) 0%, transparent 52%),
          radial-gradient(ellipse at 88% 60%, rgba(219,39,119,0.22) 0%, transparent 48%),
          radial-gradient(ellipse at 52% 88%, rgba(37,99,235,0.18) 0%, transparent 44%),
          radial-gradient(ellipse at 72% 12%, rgba(168,85,247,0.14) 0%, transparent 38%),
          radial-gradient(ellipse at 35% 55%, rgba(200,153,42,0.06) 0%, transparent 40%),
          #09060f
        `,
      }}
    />
  );
}
