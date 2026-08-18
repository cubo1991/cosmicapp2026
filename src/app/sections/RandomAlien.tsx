"use client";
import React, { useState } from "react";
import { getAliens } from "@/firebase/db";
import { useStore } from "@/store/useStore";
import { AlienCard } from "../components/alienCard";

const RandomAlien = () => {
  const [randomAlien, setRandomAlien] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, shown: 0 });

  const aliensAsignados = useStore((state) => state.aliensPartida);

  const getRandomAlien = async () => {
    try {
      setLoading(true);
      setError(null);
      const aliensList = await getAliens();

      if (!aliensList || aliensList.length === 0) {
        setError("No hay aliens disponibles en este momento");
        return;
      }

      setStats({ total: aliensList.length, shown: aliensAsignados.length });

      // Filtrar aliens que ya están asignados
      const assignedIds = aliensAsignados.map((a) => a.id);
      const availableAliens = aliensList.filter(
        (alien) => !assignedIds.includes(alien.id),
      );

      if (availableAliens.length === 0) {
        setError("Todos los aliens han sido asignados ya");
        return;
      }

      const randomIndex = Math.floor(Math.random() * availableAliens.length);
      setRandomAlien(availableAliens[randomIndex]);
    } catch (err) {
      setError("Error al cargar alien aleatorio");
      console.error("Error fetching random alien:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4">
        {/* Botón */}
        <button
          onClick={getRandomAlien}
          disabled={loading}
          className={`w-full px-6 py-4 rounded-lg font-bold text-lg transition-all duration-300 ${
            loading
              ? "bg-gray-500 cursor-not-allowed opacity-50"
              : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">🌌</span>
              Buscando alien...
            </span>
          ) : (
            "🎲 Obtener Alien Aleatorio"
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-red-200">
            ⚠️ {error}
          </div>
        )}

        {/* Alien Card */}
        {randomAlien && (
          <div className="animate-in fade-in">
            <p className="text-sm text-purple-300 mb-3 text-center">
              Alien seleccionado (1/{stats.total})
            </p>
            <AlienCard alien={randomAlien} simple={false} />
          </div>
        )}
      </div>
    </div>
  );
};

export default RandomAlien;
