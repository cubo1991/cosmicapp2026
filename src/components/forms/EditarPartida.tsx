"use client";

import { useState, useEffect } from "react";
import { useMatch } from "@/hooks/useMatch";
import { usePlayers } from "@/hooks/usePlayer";
import { useCopas } from "@/hooks/useCopa";
import { useLigas } from "@/hooks/useLiga";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";

export default function EditarPartida({ matchId, onSuccess }) {
  const { match } = useMatch(matchId);
  const { players } = usePlayers();
  const { copas } = useCopas();
  const { ligas } = useLigas();

  const [formData, setFormData] = useState({
    nombre: "",
    copId: "",
    ligaId: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  useEffect(() => {
    if (match) {
      setFormData({
        nombre: match.nombre || "",
        copId: match.copId || "",
        ligaId: match.ligaId || "",
      });
    }
  }, [match]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje({ tipo: "", texto: "" });

    if (formData.nombre.trim().length === 0) {
      setMensaje({ tipo: "error", texto: "El nombre es requerido" });
      return;
    }

    setIsLoading(true);
    try {
      const docRef = doc(db, "matches", matchId);
      await updateDoc(docRef, {
        nombre: formData.nombre,
        copId: formData.copId || null,
        ligaId: formData.ligaId || null,
      });

      setMensaje({ tipo: "exito", texto: "¡Partida actualizada!" });
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (error) {
      setMensaje({ tipo: "error", texto: error.message });
    }
    setIsLoading(false);
  };

  if (!match) {
    return (
      <div className="p-6 text-center text-gray-600">Cargando partida...</div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Editar Partida</h2>

      {mensaje.texto && (
        <div
          className={`mb-4 p-3 rounded border ${
            mensaje.tipo === "error"
              ? "bg-red-100 border-red-400 text-red-700"
              : "bg-green-100 border-green-400 text-green-700"
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      {match.estado === "finalizada" && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          Esta partida ya está finalizada. No se puede modificar.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="nombre"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Nombre de la Partida
          </label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            disabled={match.estado === "finalizada"}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            required
          />
        </div>

        <div>
          <label
            htmlFor="copId"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Copa
          </label>
          <select
            id="copId"
            name="copId"
            value={formData.copId}
            onChange={handleChange}
            disabled={match.estado === "finalizada"}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          >
            <option value="">-- Sin copa --</option>
            {copas.map((copa) => (
              <option key={copa.id} value={copa.id}>
                {copa.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="ligaId"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Liga
          </label>
          <select
            id="ligaId"
            name="ligaId"
            value={formData.ligaId}
            onChange={handleChange}
            disabled={match.estado === "finalizada"}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          >
            <option value="">-- Sin liga --</option>
            {ligas.map((liga) => (
              <option key={liga.id} value={liga.id}>
                {liga.nombre}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={isLoading || match.estado === "finalizada"}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition"
        >
          {isLoading ? "Guardando..." : "Guardar Cambios"}
        </button>
      </form>
    </div>
  );
}
