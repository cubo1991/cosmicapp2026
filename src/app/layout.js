import { Bebas_Neue, Exo_2, Space_Mono } from "next/font/google";
import "./globals.css";
import NavBar from "./components/NavBar";
import NebulaBackground from "@/components/NebulaBackground";
import AuthBootstrap from "@/components/AuthBootstrap";

const bebasNeue = Bebas_Neue({
  weight: "400",
  variable: "--font-display",
  subsets: ["latin"],
});

const exo2 = Exo_2({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const spaceMono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata = {
  title: "CosmicAPP — Battle Interface",
  description:
    "Sistema de torneos para Cosmic Encounter. Gestiona partidas, copas y el ranking de la Liga Cósmica.",
  keywords: "cosmic encounter, aliens, torneos, ligas, estrategia",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body
        className={`${bebasNeue.variable} ${exo2.variable} ${spaceMono.variable} antialiased`}
      >
        <AuthBootstrap />
        <NebulaBackground />
        <NavBar />
        <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
      </body>
    </html>
  );
}
