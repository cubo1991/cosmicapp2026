"use client";

import { useEffect, useState } from "react";
import { usePlayers } from "@/hooks/usePlayer";
import { useCopas } from "@/hooks/useCopa";
import { useLigas } from "@/hooks/useLiga";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";

export default function AdminEstadisticas() {
  const { players } = usePlayers();
  const { copas } = useCopas();
  const { ligas } = useLigas();
  const [estadisticas, setEstadisticas] = useState({
    totalPartidas: 0,
    partidasActivas: 0,
    partidasFinalizadas: 0,
    jugadorConMasVictorias: null,
    maxVictorias: 0,
  });

  useEffect(() => {
    const cargarEstadisticas = async () => {
      try {
        const matchesSnap = await getDocs(collection(db, "matches"));
        const matches = matchesSnap.docs.map((doc) => doc.data());

        const activas = matches.filter((m) => m.estado === "activa").length;
        const finalizadas = matches.filter(
          (m) => m.estado === "finalizada",
        ).length;

        // Encontrar jugador con más victorias
        let maxVic = 0;
        let mejorJugador = null;

        players.forEach((player) => {
          if (player.estadisticas?.victorias > maxVic) {
            maxVic = player.estadisticas.victorias;
            mejorJugador = player;
          }
        });

        setEstadisticas({
          totalPartidas: matches.length,
          partidasActivas: activas,
          partidasFinalizadas: finalizadas,
          jugadorConMasVictorias: mejorJugador,
          maxVictorias: maxVic,
        });
      } catch (error) {
        console.error("Error cargando estadísticas:", error);
      }
    };

    cargarEstadisticas();
  }, [players]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg p-6 text-white">
        <h3 className="text-sm font-semibold text-blue-100 mb-2">
          Total Jugadores
        </h3>
        <p className="text-3xl font-bold">{players.length}</p>
      </div>

      <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-lg p-6 text-white">
        <h3 className="text-sm font-semibold text-green-100 mb-2">
          Total Partidas
        </h3>
        <p className="text-3xl font-bold">{estadisticas.totalPartidas}</p>
      </div>

      <div className="bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-lg p-6 text-white">
        <h3 className="text-sm font-semibold text-yellow-100 mb-2">
          Partidas Activas
        </h3>
        <p className="text-3xl font-bold">{estadisticas.partidasActivas}</p>
      </div>

      <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-lg p-6 text-white">
        <h3 className="text-sm font-semibold text-orange-100 mb-2">
          Partidas Finalizadas
        </h3>
        <p className="text-3xl font-bold">{estadisticas.partidasFinalizadas}</p>
      </div>

      <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg p-6 text-white">
        <h3 className="text-sm font-semibold text-purple-100 mb-2">
          Copas/Ligas
        </h3>
        <p className="text-3xl font-bold">{copas.length + ligas.length}</p>
      </div>

      {estadisticas.jugadorConMasVictorias && (
        <div className="col-span-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg p-6 text-white">
          <h3 className="text-lg font-semibold mb-3">🏅 Top Jugador</h3>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-2xl font-bold">
                {estadisticas.jugadorConMasVictorias.nombre}
              </p>
              <p className="text-pink-100">
                {estadisticas.maxVictorias} victorias
              </p>
            </div>
            <div className="text-5xl">⭐</div>
          </div>
        </div>
      )}
    </div>
  );
}
