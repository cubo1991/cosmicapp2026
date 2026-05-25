"use client";
import { useState } from "react";
import Link from "next/link";

const FD = "var(--font-display, 'Bebas Neue', Impact, sans-serif)";
const FB = "var(--font-body, 'Exo 2', sans-serif)";
const FM = "var(--font-mono, 'Space Mono', monospace)";

export function ShareMatchCode({ code }) {
  const [copied, setCopied] = useState(false);

  const origin   = typeof window !== "undefined" ? window.location.origin : "";
  const matchUrl = `${origin}/cargarPartida/${code}`;
  const waLink   = `https://wa.me/?text=${encodeURIComponent(
    `🎮 Únete a mi partida de CosmicAPP\n\nCódigo: ${code}\n\n${matchUrl}`
  )}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(matchUrl)}&size=180x180&bgcolor=110d1e&color=c8992a&margin=8`;

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2200); }
    catch {}
  };

  return (
    <div>
      {/* Success header */}
      <div className="text-center" style={{ marginBottom: "32px" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: "64px", height: "64px", borderRadius: "50%",
          background: "rgba(38,198,195,0.12)", border: "1px solid rgba(38,198,195,0.3)",
          fontSize: "28px", marginBottom: "16px",
        }}>
          ✓
        </div>
        <h2 style={{ fontFamily: FD, fontSize: "clamp(28px, 6vw, 40px)", color: "#f0e8d6", letterSpacing: "0.06em", lineHeight: 1 }}>
          PARTIDA CREADA
        </h2>
        <p style={{ fontFamily: FB, color: "#8a7a9a", fontSize: "13px", marginTop: "8px" }}>
          Comparte el código con los jugadores
        </p>
      </div>

      {/* Code card */}
      <div className="game-panel" style={{ padding: "28px 24px", marginBottom: "16px", textAlign: "center" }}>
        <p style={{ fontFamily: FM, fontSize: "10px", letterSpacing: "0.3em", color: "#4a3a5a", marginBottom: "12px" }}>
          CÓDIGO DE PARTIDA
        </p>
        <div style={{
          fontFamily: FM, fontSize: "clamp(32px, 8vw, 48px)", fontWeight: 700,
          color: "#c8992a", letterSpacing: "0.15em", marginBottom: "18px",
          textShadow: "0 0 30px rgba(200,153,42,0.4)",
        }}>
          {code}
        </div>
        <button
          onClick={copyCode}
          style={{
            padding: "9px 28px",
            background: copied ? "rgba(38,198,195,0.12)" : "rgba(200,153,42,0.1)",
            border: `1px solid ${copied ? "rgba(38,198,195,0.35)" : "rgba(200,153,42,0.3)"}`,
            borderRadius: "6px",
            color: copied ? "#26c6c3" : "#c8992a",
            fontFamily: FM, fontSize: "12px", letterSpacing: "0.15em",
            cursor: "pointer", transition: "all 0.25s",
          }}>
          {copied ? "✓ COPIADO" : "COPIAR CÓDIGO"}
        </button>
      </div>

      {/* QR + share */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "14px", marginBottom: "14px" }}>
        {/* QR */}
        <div className="game-panel" style={{ padding: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt="QR de la partida"
            width={100}
            height={100}
            style={{ borderRadius: "4px", imageRendering: "pixelated" }}
          />
        </div>

        {/* Share buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <a href={waLink} target="_blank" rel="noopener noreferrer"
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              padding: "12px", background: "rgba(37,211,102,0.1)",
              border: "1px solid rgba(37,211,102,0.3)", borderRadius: "8px",
              color: "#25d366", fontFamily: FB, fontSize: "14px", fontWeight: 600,
              textDecoration: "none", transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(37,211,102,0.18)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(37,211,102,0.1)"; }}>
            📱 WhatsApp
          </a>
          <a href={`sms:?body=${encodeURIComponent(`CosmicAPP — Código: ${code}`)}`}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              padding: "12px", background: "rgba(100,130,255,0.08)",
              border: "1px solid rgba(100,130,255,0.2)", borderRadius: "8px",
              color: "#8899ff", fontFamily: FB, fontSize: "14px", fontWeight: 600,
              textDecoration: "none", transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(100,130,255,0.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(100,130,255,0.08)"; }}>
            💬 SMS
          </a>
        </div>
      </div>

      {/* Go to match */}
      <Link href={`/cargarPartida/${code}`}
        style={{ display: "block", width: "100%" }}>
        <button
          style={{
            width: "100%", padding: "14px",
            background: "linear-gradient(135deg, rgba(168,85,247,0.6), rgba(139,92,246,0.75))",
            border: "1px solid rgba(168,85,247,0.4)", borderRadius: "8px",
            color: "#f0e8d6", fontFamily: FD, fontSize: "20px", letterSpacing: "0.1em",
            cursor: "pointer", transition: "all 0.25s",
          }}
          onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.15)"; }}
          onMouseLeave={e => { e.currentTarget.style.filter = ""; }}>
          IR A LA PARTIDA 🎮
        </button>
      </Link>
    </div>
  );
}

export default ShareMatchCode;
