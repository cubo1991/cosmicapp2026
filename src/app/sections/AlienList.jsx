"use client";
import React, { useState, useEffect } from "react";
import { getAliens } from "@/firebase/db";
import { AlienCard } from "../components/alienCard";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { ErrorState } from "../components/ErrorState";

const AlienList = () => {
  const [aliens, setAliens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState("Todos");

  useEffect(() => {
    const fetchAliens = async () => {
      try {
        setLoading(true);
        const aliensList = await getAliens();
        setAliens(aliensList);
        setError(null);
      } catch (err) {
        setError({
          title: "Error al cargar aliens",
          message:
            "No pudimos cargar la lista de aliens. Por favor intenta más tarde.",
          action: { href: "/", label: "Volver al inicio" },
        });
        console.error("Error fetching aliens:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAliens();
  }, []);

  const dificultades = ["Todos", "Green", "Yellow", "Red"];
  const alienesFiltrados =
    filtro === "Todos" ? aliens : aliens.filter((a) => a.Dificultad === filtro);

  if (loading) return <LoadingOverlay message="Cargando aliens..." />;

  if (error) return <ErrorState {...error} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            👽 Todos los Aliens
          </h1>
          <p className="text-purple-200 text-lg">
            Explora los {aliens.length} personajes disponibles
          </p>
        </div>

        {/* Filtros */}
        <div className="mb-12">
          <p className="text-white font-semibold mb-4 text-center">
            Filtrar por dificultad:
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {dificultades.map((dif) => (
              <button
                key={dif}
                onClick={() => setFiltro(dif)}
                className={`px-6 py-2 rounded-full font-bold transition-all ${
                  filtro === dif
                    ? "bg-white text-gray-900 shadow-lg scale-110"
                    : "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                }`}
              >
                {dif === "Todos" && "✨"}
                {dif === "Green" && "🟢"} {dif === "Green" && "Fácil"}
                {dif === "Yellow" && "🟡"} {dif === "Yellow" && "Medio"}
                {dif === "Red" && "🔴"} {dif === "Red" && "Difícil"}
                {dif === "Todos" && "Todos"}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de aliens */}
        {alienesFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-purple-300 text-lg">
              No hay aliens con esa dificultad
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {alienesFiltrados.map((alien) => (
              <div key={alien.id}>
                <AlienCard alien={alien} simple={false} />
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="mt-12 text-center text-purple-300 text-sm">
          <p>
            Mostrando {alienesFiltrados.length} de {aliens.length} aliens
          </p>
        </div>
      </div>
    </div>
  );
};

export default AlienList;
