"use client";
import React, { useState } from "react";
import { getAliens } from "@/firebase/db";
import { useStore } from "@/store/useStore";

const RandomAlien = () => {
  const [randomAlien, setRandomAlien] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const aliensAsignados = useStore((state) => state.aliensPartida);

  const getRandomAlien = async () => {
    try {
      setLoading(true);
      setError(null);
      const aliensList = await getAliens();

      // Filtrar aliens que ya están asignados
      const availableAliens = aliensList.filter(
        (alien) => !aliensAsignados.some((assigned) => assigned.id === alien.id)
      );

      if (availableAliens.length === 0) {
        setError("No hay aliens disponibles");
        return;
      }

      const randomIndex = Math.floor(Math.random() * availableAliens.length);
      setRandomAlien(availableAliens[randomIndex]);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching random alien:", err);
    } finally {
      setLoading(false);
    }
  };
  console.log("Aliens asignados desde Zustand:", aliensAsignados);

  return (
    <div className="random-alien">
      <button
        onClick={getRandomAlien}
        disabled={loading}
        className="random-button"
      >
        {loading ? "Cargando..." : "Dame un alien aleatorio"}
      </button>

      {error && <div className="error">Error: {error}</div>}

      {randomAlien && (
        <div className="alien-card">
          <h3>{randomAlien.Nombre}</h3>
          <p>{randomAlien.description}</p>
        </div>
      )}
    </div>
  );
};

export default RandomAlien;
