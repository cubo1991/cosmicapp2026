"use client";

import { useState, useEffect } from "react";
import { useCrearMatch } from "@/hooks/useMatch";
import { usePlayers } from "@/hooks/usePlayer";
import { useCopas } from "@/hooks/useCopa";
import { useLigas } from "@/hooks/useLiga";
import { generarNombrePartida } from "@/utils/generadorNombres";

export default function CrearPartida() {
  const { crear, loading, error } = useCrearMatch();
  const { players } = usePlayers();
  const { copas } = useCopas();
  const { ligas } = useLigas();

  const [formData, setFormData] = useState({
    nombre: "",
    jugadores: [],
    copId: "",
    ligaId: "",
  });

  const [mensajeExito, setMensajeExito] = useState("");
  const [mensajeError, setMensajeError] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const generarNombreEnFormulario = async () => {
    const nombre = await generarNombrePartida();
    setFormData((prev) => ({ ...prev, nombre }));
  };

  // Sugiere un nombre automáticamente al abrir el formulario
  useEffect(() => {
    let cancelled = false;
    generarNombrePartida().then((nombre) => {
      if (!cancelled) setFormData((prev) => ({ ...prev, nombre }));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleJugador = (playerId) => {
    setFormData((prev) => ({
      ...prev,
      jugadores: prev.jugadores.includes(playerId)
        ? prev.jugadores.filter((id) => id !== playerId)
        : [...prev.jugadores, playerId],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensajeError("");
    setMensajeExito("");

    // Validaciones
    if (formData.nombre.trim().length === 0) {
      setMensajeError("El nombre de la partida es requerido");
      return;
    }

    if (formData.jugadores.length < 2) {
      setMensajeError("Selecciona al menos 2 jugadores");
      return;
    }

    const resultado = await crear(
      formData.nombre,
      formData.jugadores,
      formData.copId || null,
      formData.ligaId || null,
    );

    if (resultado.success) {
      setMensajeExito(`¡Partida creada! ID: ${resultado.matchId}`);
      setFormData({ nombre: "", jugadores: [], copId: "", ligaId: "" });
      generarNombreEnFormulario();
      setTimeout(() => setMensajeExito(""), 3000);
    } else {
      setMensajeError(resultado.error || "Error al crear partida");
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Crear Partida</h2>

      {mensajeError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {mensajeError}
        </div>
      )}

      {mensajeExito && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {mensajeExito}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nombre */}
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
            onChange={handleInputChange}
            placeholder="Ej: Partida Casual"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Jugadores */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Selecciona Jugadores ({formData.jugadores.length})
          </label>
          <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto border border-gray-200 p-3 rounded">
            {players.length === 0 ? (
              <p className="text-gray-500 col-span-2">
                No hay jugadores. Crea uno primero.
              </p>
            ) : (
              players.map((player) => (
                <label key={player.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.jugadores.includes(player.id)}
                    onChange={() => toggleJugador(player.id)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">{player.name}</span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Copa (opcional) */}
        <div>
          <label
            htmlFor="copId"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Copa (Opcional)
          </label>
          <select
            id="copId"
            name="copId"
            value={formData.copId}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Sin copa --</option>
            {copas
              .filter((c) => c.estado !== "finalizada")
              .map((copa) => (
                <option key={copa.id} value={copa.id}>
                  {copa.nombre}
                </option>
              ))}
          </select>
        </div>

        {/* Liga (opcional) */}
        <div>
          <label
            htmlFor="ligaId"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Liga (Opcional)
          </label>
          <select
            id="ligaId"
            name="ligaId"
            value={formData.ligaId}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Sin liga --</option>
            {ligas
              .filter((l) => l.estado === "activa")
              .map((liga) => (
                <option key={liga.id} value={liga.id}>
                  {liga.nombre}
                </option>
              ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition"
        >
          {loading ? "Creando..." : "Crear Partida"}
        </button>
      </form>
    </div>
  );
}
