"use client";
import Link from "next/link";
import { CTAButton } from "./components/CTAButton";
import RandomAlien from "./sections/RandomAlien";
import GlobalRanking from "@/components/GlobalRanking";

const FD = "var(--font-display, 'Bebas Neue', Impact, sans-serif)";
const FB = "var(--font-body, 'Exo 2', sans-serif)";
const FM = "var(--font-mono, 'Space Mono', monospace)";

export default function Home() {
  return (
    <div style={{ position: "relative", zIndex: 1 }}>

      {/* ═══════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════ */}
      <section
        className="scan-section cosmic-grid"
        style={{
          minHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 16px 60px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Halos decorativos */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "8%",
              left: "3%",
              width: 380,
              height: 380,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "5%",
              right: "4%",
              width: 300,
              height: 300,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(38,198,195,0.09) 0%, transparent 70%)",
            }}
          />
        </div>

        {/* Badge de estado */}
        <div
          className="inline-flex items-center gap-2 mb-8"
          style={{
            padding: "8px 20px",
            borderRadius: "24px",
            background: "rgba(38,198,195,0.06)",
            border: "1px solid rgba(38,198,195,0.25)",
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: "#26c6c3",
              boxShadow: "0 0 8px #26c6c3",
              animation: "star-twinkle 2s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontFamily: FM,
              fontSize: "11px",
              letterSpacing: "0.28em",
              color: "#26c6c3",
            }}
          >
            SISTEMA EN LÍNEA
          </span>
        </div>

        {/* Título principal */}
        <div style={{ lineHeight: 1, marginBottom: "6px" }}>
          <h1
            style={{
              fontFamily: FD,
              fontSize: "clamp(72px, 14vw, 140px)",
              letterSpacing: "0.06em",
              color: "#f0e8d6",
              textShadow:
                "0 0 60px rgba(200,153,42,0.25), 0 0 120px rgba(200,153,42,0.08)",
              margin: 0,
              lineHeight: 0.95,
            }}
          >
            COSMIC
          </h1>
          <h1
            style={{
              fontFamily: FD,
              fontSize: "clamp(72px, 14vw, 140px)",
              letterSpacing: "0.06em",
              color: "#c8992a",
              textShadow:
                "0 0 40px rgba(200,153,42,0.55), 0 0 100px rgba(200,153,42,0.2)",
              margin: 0,
              lineHeight: 0.95,
            }}
          >
            APP
          </h1>
        </div>

        {/* Divisor ornamental */}
        <div
          className="flex items-center gap-3 my-6"
          style={{ width: "min(280px, 80vw)" }}
        >
          <div
            style={{
              flex: 1,
              height: 1,
              background: "linear-gradient(to right, transparent, rgba(200,153,42,0.4))",
            }}
          />
          <span style={{ color: "#c8992a", fontSize: "12px" }}>◆</span>
          <div
            style={{
              flex: 1,
              height: 1,
              background: "linear-gradient(to left, transparent, rgba(200,153,42,0.4))",
            }}
          />
        </div>

        {/* Subtítulo */}
        <p
          style={{
            fontFamily: FB,
            fontSize: "14px",
            letterSpacing: "0.22em",
            color: "#8a7a9a",
            marginBottom: "52px",
          }}
        >
          SISTEMA DE TORNEOS · LIGA CÓSMICA DE ENCUENTROS
        </p>

        {/* CTA Buttons */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full"
          style={{ maxWidth: "820px" }}
        >
          <CTAButton
            href="/nuevaPartida"
            icon="🚀"
            title="Crear Partida"
            description="Configura colores, invita alienígenas y empieza la batalla"
          />
          <CTAButton
            href="/cargarPartida"
            icon="⚡"
            title="Unirse"
            description="Ingresa el código de acceso y únete a la contienda"
          />
          <CTAButton
            href="/alienList"
            icon="👽"
            title="Alienígenas"
            description="Explora todos los poderes y razas disponibles"
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          ALIEN ALEATORIO
      ═══════════════════════════════════════════════ */}
      <section
        style={{
          background: "rgba(17,13,30,0.75)",
          borderTop: "1px solid rgba(200,153,42,0.14)",
          borderBottom: "1px solid rgba(200,153,42,0.14)",
          padding: "72px 16px",
          backdropFilter: "blur(4px)",
        }}
      >
        <div className="max-w-lg mx-auto text-center">
          <p className="cosmic-label mb-3">ORÁCULO CÓSMICO</p>
          <h2
            style={{
              fontFamily: FD,
              fontSize: "36px",
              letterSpacing: "0.08em",
              color: "#f0e8d6",
              marginBottom: "28px",
            }}
          >
            GENERA UN ALIEN ALEATORIO
          </h2>
          <RandomAlien />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          CÓMO FUNCIONA
      ═══════════════════════════════════════════════ */}
      <section style={{ padding: "80px 16px" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="cosmic-label mb-3">PROTOCOLO DE BATALLA</p>
            <h2
              style={{
                fontFamily: FD,
                fontSize: "44px",
                letterSpacing: "0.06em",
                color: "#f0e8d6",
              }}
            >
              ¿CÓMO FUNCIONA?
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StepCard
              num="01"
              color="#26c6c3"
              title="Crea o Únete"
              text="Inicia una nueva partida o únete a la contienda con un código de acceso galáctico."
            />
            <StepCard
              num="02"
              color="#c8992a"
              title="Elige tu Alien"
              text="Selecciona estratégicamente entre decenas de razas con poderes únicos e impredecibles."
            />
            <StepCard
              num="03"
              color="#a855f7"
              title="¡Conquista!"
              text="Expande tus colonias, gana encuentros cósmicos y domina la galaxia conocida."
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SISTEMA DE TORNEOS
      ═══════════════════════════════════════════════ */}
      <section
        style={{
          background: "rgba(17,13,30,0.7)",
          borderTop: "1px solid rgba(200,153,42,0.14)",
          borderBottom: "1px solid rgba(200,153,42,0.14)",
          padding: "80px 16px",
          backdropFilter: "blur(4px)",
        }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="cosmic-label mb-3">PLATAFORMA</p>
            <h2
              style={{
                fontFamily: FD,
                fontSize: "44px",
                letterSpacing: "0.06em",
                color: "#f0e8d6",
              }}
            >
              SISTEMA DE TORNEOS
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <TournamentCard href="/players" icon="👥" title="Jugadores" />
            <TournamentCard href="/matches" icon="⚔️" title="Partidas" />
            <TournamentCard href="/copas" icon="🏆" title="Copas" />
            <TournamentCard href="/ligas" icon="🌌" title="Ligas" />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          RANKING GLOBAL
      ═══════════════════════════════════════════════ */}
      <section style={{ padding: "80px 16px" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="cosmic-label mb-3">CLASIFICACIÓN GALÁCTICA</p>
            <h2
              style={{
                fontFamily: FD,
                fontSize: "44px",
                letterSpacing: "0.06em",
                color: "#f0e8d6",
                marginBottom: "8px",
              }}
            >
              🌟 RANKING GLOBAL
            </h2>
            <p style={{ fontFamily: FB, color: "#8a7a9a", fontSize: "14px" }}>
              Suma de las últimas 10 partidas por jugador
            </p>
          </div>
          <GlobalRanking />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          ADMIN
      ═══════════════════════════════════════════════ */}
      <section style={{ padding: "20px 16px 80px" }}>
        <div className="max-w-3xl mx-auto">
          <div
            className="game-panel game-panel-ornate"
            style={{ padding: "40px 32px" }}
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3
                  style={{
                    fontFamily: FD,
                    fontSize: "30px",
                    letterSpacing: "0.08em",
                    color: "#f0e8d6",
                    marginBottom: "8px",
                  }}
                >
                  ⚙️ COMANDO CENTRAL
                </h3>
                <p style={{ fontFamily: FB, color: "#8a7a9a", fontSize: "14px" }}>
                  Administra jugadores, partidas, copas y estadísticas del torneo
                </p>
              </div>
              <Link href="/admin">
                <button
                  className="group"
                  style={{
                    fontFamily: FD,
                    fontSize: "17px",
                    letterSpacing: "0.18em",
                    padding: "13px 36px",
                    background: "rgba(200,153,42,0.1)",
                    border: "1px solid rgba(200,153,42,0.45)",
                    color: "#e8c547",
                    borderRadius: "6px",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(200,153,42,0.2)";
                    e.currentTarget.style.borderColor = "#c8992a";
                    e.currentTarget.style.boxShadow =
                      "0 0 20px rgba(200,153,42,0.25)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(200,153,42,0.1)";
                    e.currentTarget.style.borderColor = "rgba(200,153,42,0.45)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  ACCEDER
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── Componentes internos ───────────────────────────────────────── */

function StepCard({ num, color, title, text }) {
  return (
    <div className="game-panel game-panel-hover" style={{ padding: "28px 24px" }}>
      <div
        style={{
          fontFamily: FM,
          fontSize: "42px",
          fontWeight: 700,
          color,
          opacity: 0.55,
          lineHeight: 1,
          marginBottom: "14px",
        }}
      >
        {num}
      </div>
      <h3
        style={{
          fontFamily: FD,
          fontSize: "22px",
          letterSpacing: "0.08em",
          color: "#f0e8d6",
          marginBottom: "10px",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontFamily: FB,
          color: "#8a7a9a",
          fontSize: "13px",
          lineHeight: 1.65,
        }}
      >
        {text}
      </p>
    </div>
  );
}

function TournamentCard({ href, icon, title }) {
  return (
    <Link href={href}>
      <div
        className="game-panel game-panel-hover text-center cursor-pointer"
        style={{ padding: "28px 16px" }}
      >
        <div style={{ fontSize: "36px", marginBottom: "12px" }}>{icon}</div>
        <h3
          style={{
            fontFamily: FD,
            fontSize: "18px",
            letterSpacing: "0.1em",
            color: "#f0e8d6",
          }}
        >
          {title}
        </h3>
      </div>
    </Link>
  );
}
