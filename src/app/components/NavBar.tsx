"use client";
import Link from "next/link";
import { useState } from "react";
import TickerBar from "@/components/TickerBar";
import { useLigaActiva } from "@/hooks/useLigaActiva";

const LINKS = [
  { href: "/cargarPartida", label: "Jugar" },
  { href: "/nuevaPartida", label: "Nueva Partida" },
  { href: "/alienList", label: "Aliens" },
  { href: "/ranking", label: "Ranking" },
  { href: "/players", label: "Jugadores" },
  { href: "/copas", label: "Copas" },
];

const FONT_DISPLAY = "var(--font-display, 'Bebas Neue', Impact, sans-serif)";
const FONT_BODY = "var(--font-body, 'Exo 2', sans-serif)";

/** Solo aparece si hay más de una liga activa — ver docs/PLAN_MULTI_LIGA.md Fase 5. */
function SelectorLiga({ className = "" }) {
  const { ligaActivaId, ligasActivas, mostrarSelector, cambiarLiga } = useLigaActiva();
  if (!mostrarSelector) return null;

  return (
    <select
      value={ligaActivaId}
      onChange={(e) => cambiarLiga(e.target.value)}
      className={className}
      style={{
        fontFamily: FONT_BODY,
        fontSize: "12px",
        background: "rgba(200,153,42,0.1)",
        border: "1px solid rgba(200,153,42,0.3)",
        borderRadius: "6px",
        color: "#c8992a",
        padding: "4px 8px",
        cursor: "pointer",
      }}
      title="Liga activa"
    >
      {ligasActivas.map((l) => (
        <option key={l.id} value={l.id} style={{ background: "#1a1330", color: "#f0e8d6" }}>
          {l.nombre}
        </option>
      ))}
    </select>
  );
}

export default function NavBar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav
        className="fixed top-0 inset-x-0 z-50"
        style={{
          background: "rgba(9, 6, 15, 0.92)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderBottom: "1px solid rgba(200, 153, 42, 0.22)",
          boxShadow: "0 2px 30px rgba(0,0,0,0.6)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-xl">🌌</span>
            <span
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: "22px",
                letterSpacing: "0.12em",
                color: "#f0e8d6",
                lineHeight: 1,
              }}
            >
              COSMIC
              <span style={{ color: "#c8992a" }}>APP</span>
            </span>
            {/* Indicador de estado */}
            <span
              className="w-1.5 h-1.5 rounded-full ml-1"
              style={{
                background: "#26c6c3",
                boxShadow: "0 0 6px #26c6c3",
                animation: "star-twinkle 2s ease-in-out infinite",
              }}
            />
          </Link>

          {/* ── Desktop links ── */}
          <div className="hidden md:flex items-center gap-6">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href}>
                <span
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: "13px",
                    fontWeight: 500,
                    letterSpacing: "0.07em",
                    color: "#8a7a9a",
                    cursor: "pointer",
                    transition: "color 0.2s",
                  }}
                  className="hover:text-[#f0e8d6]"
                >
                  {l.label}
                </span>
              </Link>
            ))}

            <SelectorLiga />

            {/* Admin separado con acento */}
            <Link href="/admin">
              <span
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: "13px",
                  fontWeight: 600,
                  letterSpacing: "0.07em",
                  color: "#c8992a",
                  cursor: "pointer",
                  transition: "color 0.2s",
                  paddingLeft: "16px",
                  borderLeft: "1px solid rgba(200,153,42,0.3)",
                }}
                className="hover:text-[#e8c547]"
              >
                ⚙ Admin
              </span>
            </Link>
          </div>

          {/* ── Hamburger ── */}
          <button
            className="md:hidden p-2 flex flex-col gap-1.5"
            onClick={() => setOpen(!open)}
            aria-label="Menú"
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block w-5 h-0.5 transition-all duration-300"
                style={{
                  background: "#c8992a",
                  transformOrigin: "center",
                  transform:
                    i === 0 && open
                      ? "rotate(45deg) translate(3px, 3px)"
                      : i === 1 && open
                      ? "scaleX(0)"
                      : i === 2 && open
                      ? "rotate(-45deg) translate(3px, -3px)"
                      : "none",
                  opacity: i === 1 && open ? 0 : 1,
                }}
              />
            ))}
          </button>
        </div>

        {/* ── Mobile dropdown ── */}
        <div
          className="md:hidden overflow-hidden transition-all duration-300"
          style={{
            maxHeight: open ? "320px" : "0",
            borderTop: open ? "1px solid rgba(200,153,42,0.12)" : "none",
          }}
        >
          <div className="px-5 py-4 flex flex-col gap-4">
            {[...LINKS, { href: "/admin", label: "⚙ Admin" }].map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
                <span
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: "15px",
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    color: l.href === "/admin" ? "#c8992a" : "#8a7a9a",
                  }}
                >
                  {l.label}
                </span>
              </Link>
            ))}
            <SelectorLiga className="w-full" />
          </div>
        </div>

        <TickerBar />
      </nav>

      {/* Espaciador para el nav fijo (h-14 del header + 28px del ticker) */}
      <div style={{ height: "calc(3.5rem + 28px)" }} />
    </>
  );
}
