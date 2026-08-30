"use client";

import { useState } from "react";
import { useLiga } from "@/hooks/useLiga";
import { usePlayers } from "@/hooks/usePlayer";

/**
 * Alta manual de miembros de una liga (Fase 4 de docs/PLAN_MULTI_LIGA.md):
 * el admin busca un jugador existente por nombre y lo agrega, o comparte el
 * código de invitación para que la persona se sume sola desde /unirse.
 */
export default function GestionMiembrosLiga({ ligaId }) {
  const { liga, agregarMiembro, loading, error } = useLiga(ligaId);
  const { players } = usePlayers();
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
  const [agregando, setAgregando] = useState(null);

  if (loading || !liga) {
    return <div className="p-6 text-center text-gray-600">Cargando miembros...</div>;
  }

  const miembros = liga.miembros || [];
  const nombreDe = (playerId) => players.find((p) => p.id === playerId)?.name || playerId;

  const candidatos = busqueda.trim()
    ? players.filter(
        (p) =>
          !miembros.includes(p.id) &&
          p.name?.toLowerCase().includes(busqueda.trim().toLowerCase())
      )
    : [];

  const handleAgregar = async (playerId) => {
    setMensaje({ tipo: "", texto: "" });
    setAgregando(playerId);
    const resultado = await agregarMiembro(playerId);
    setAgregando(null);
    if (resultado.success) {
      setBusqueda("");
      setMensaje({ tipo: "exito", texto: `${nombreDe(playerId)} se agregó a la liga.` });
    } else {
      setMensaje({ tipo: "error", texto: resultado.error });
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Miembros</h2>

      {liga.codigoInvitacion && (
        <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-md p-3">
          <p className="text-sm text-gray-700 mb-1">
            Código de invitación (compartilo para que se unan solos desde{" "}
            <span className="font-mono">/unirse</span>):
          </p>
          <p className="text-2xl font-mono font-bold tracking-widest text-indigo-700">
            {liga.codigoInvitacion}
          </p>
        </div>
      )}

      {(mensaje.texto || error) && (
        <div
          className={`mb-4 p-3 rounded border text-sm ${
            mensaje.tipo === "error" || error
              ? "bg-red-100 border-red-400 text-red-700"
              : "bg-green-100 border-green-400 text-green-700"
          }`}
        >
          {mensaje.texto || error}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Agregar por nombre
        </label>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar jugador..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
        {candidatos.length > 0 && (
          <ul className="mt-2 border border-gray-200 rounded-md divide-y">
            {candidatos.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-gray-800">{p.name}</span>
                <button
                  onClick={() => handleAgregar(p.id)}
                  disabled={agregando === p.id}
                  className="text-sm px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded"
                >
                  {agregando === p.id ? "Agregando..." : "Agregar"}
                </button>
              </li>
            ))}
          </ul>
        )}
        {busqueda.trim() && candidatos.length === 0 && (
          <p className="mt-2 text-sm text-gray-500">Sin resultados.</p>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Miembros actuales ({miembros.length})
        </h3>
        {miembros.length === 0 ? (
          <p className="text-sm text-gray-500">Todavía no tiene miembros.</p>
        ) : (
          <ul className="divide-y border border-gray-200 rounded-md">
            {miembros.map((playerId) => (
              <li key={playerId} className="px-3 py-2 text-sm text-gray-800">
                {nombreDe(playerId)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
