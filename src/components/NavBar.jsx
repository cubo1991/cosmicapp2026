"use client";

import Link from "next/link";

export default function NavBar() {
  return (
    <nav className="bg-gray-900 text-white p-4 flex justify-between items-center flex-wrap gap-4">
      <Link href="/">
        <p className="text-xl font-bold hover:text-gray-300 transition cursor-pointer">
          🚀 CosmicAPP
        </p>
      </Link>

      <div className="flex gap-4 flex-wrap items-center">
        {/* Juego Original */}
        <div className="hidden md:flex gap-4">
          <Link href="/cargarPartida">
            <p className="hover:text-gray-300 transition cursor-pointer text-sm">
              Jugar
            </p>
          </Link>
          <Link href="/nuevaPartida">
            <p className="hover:text-gray-300 transition cursor-pointer text-sm">
              Nueva Partida
            </p>
          </Link>
          <Link href="/alienList">
            <p className="hover:text-gray-300 transition cursor-pointer text-sm">
              Aliens
            </p>
          </Link>
        </div>

        {/* Sistema de Torneos */}
        <div className="border-l border-gray-700 pl-4 flex gap-3 flex-wrap">
          <Link href="/players">
            <p className="hover:text-blue-400 transition cursor-pointer text-sm">
              👥 Jugadores
            </p>
          </Link>
          <Link href="/matches">
            <p className="hover:text-green-400 transition cursor-pointer text-sm">
              ⚔️ Partidas
            </p>
          </Link>
          <Link href="/copas">
            <p className="hover:text-orange-400 transition cursor-pointer text-sm">
              🏆 Copas
            </p>
          </Link>
          <Link href="/ligas">
            <p className="hover:text-indigo-400 transition cursor-pointer text-sm">
              📊 Ligas
            </p>
          </Link>
        </div>

        {/* Administrador */}
        <div className="border-l border-gray-700 pl-4">
          <Link href="/admin">
            <p className="hover:text-yellow-400 transition cursor-pointer text-sm font-semibold">
              ⚙️ Admin
            </p>
          </Link>
        </div>
      </div>
    </nav>
  );
}
