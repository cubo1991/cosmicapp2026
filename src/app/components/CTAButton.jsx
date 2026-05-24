"use client";
import Link from "next/link";

const FD = "var(--font-display, 'Bebas Neue', Impact, sans-serif)";
const FB = "var(--font-body, 'Exo 2', sans-serif)";

export function CTAButton({ href, icon, title, description }) {
  return (
    <Link href={href} className="group block h-full">
      <div
        className="game-panel game-panel-hover h-full p-6 cursor-pointer"
        style={{ textAlign: "left" }}
      >
        {/* Ícono */}
        <div
          style={{ fontSize: "38px", marginBottom: "14px", lineHeight: 1 }}
          className="transition-transform duration-300 group-hover:scale-110"
        >
          {icon}
        </div>

        {/* Título */}
        <h3
          style={{
            fontFamily: FD,
            fontSize: "22px",
            letterSpacing: "0.1em",
            color: "#c8992a",
            marginBottom: "6px",
            lineHeight: 1.1,
          }}
          className="group-hover:text-[#e8c547] transition-colors duration-200"
        >
          {title}
        </h3>

        {/* Descripción */}
        <p
          style={{
            fontFamily: FB,
            color: "#8a7a9a",
            fontSize: "13px",
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>

        {/* Línea inferior que se expande al hover */}
        <div
          style={{
            marginTop: "16px",
            height: "1px",
            background: "linear-gradient(to right, #c8992a, rgba(200,153,42,0.1))",
            width: "0",
            transition: "width 0.4s ease",
          }}
          className="group-hover:!w-full"
        />
      </div>
    </Link>
  );
}

export default CTAButton;
