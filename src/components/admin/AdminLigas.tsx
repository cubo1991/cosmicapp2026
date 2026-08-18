"use client";

import { useState } from "react";
import Link from "next/link";
import { useLigas } from "@/hooks/useLiga";
import BotónEliminar from "@/components/buttons/BotónEliminar";
import { useRouter } from "next/navigation";

export default function AdminLigas() {
  const { ligas, loading } = useLigas();
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const router = useRouter();

  const ligasFiltradas = ligas.filter((l) => {
    const coincideEstado = !filtroEstado || l.estado === filtroEstado;
    const coincideBusqueda = l.nombre
      .toLowerCase()
      .includes(busqueda.toLowerCase());
    return coincideEstado && coincideBusqueda;
  });

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case "activa":
        return "bg-green-100 text-green-800";
      case "finalizada":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando ligas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">
          ⚽ Gestión de Ligas
        </h2>
        <Link href="/ligas">
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition">
            ➕ Nueva Liga
          </button>
        </Link>
      </div>

      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Buscar liga..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos</option>
          <option value="activa">Activas</option>
          <option value="finalizada">Finalizadas</option>
        </select>
      </div>

      <div className="grid gap-4">
        {ligasFiltradas.map((liga) => (
          <div
            key={liga.id}
            className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">
                  {liga.nombre}
                </h3>
                <p className="text-sm text-gray-500">
                  Propietario: {liga.propietario || "N/A"}
                </p>
                {liga.descripcion && (
                  <p className="text-sm text-gray-600 line-clamp-1 mt-1">
                    {liga.descripcion}
                  </p>
                )}
              </div>
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${getEstadoBadge(liga.estado)}`}
              >
                {liga.estado}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-4 bg-gray-50 p-3 rounded text-sm">
              <div>
                <span className="text-gray-600">Miembros:</span>
                <p className="font-semibold">{liga.miembros?.length || 0}</p>
              </div>
              <div>
                <span className="text-gray-600">Partidas:</span>
                <p className="font-semibold">{liga.partidas?.length || 0}</p>
              </div>
              {liga.estadisticas?.juegosPorJugador && (
                <div>
                  <span className="text-gray-600">Promedio:</span>
                  <p className="font-semibold">
                    {liga.estadisticas.juegosPorJugador.toFixed(1)}
                  </p>
                </div>
              )}
              {liga.estadisticas?.puntosPorJugador && (
                <div>
                  <span className="text-gray-600">Puntos Avg:</span>
                  <p className="font-semibold">
                    {liga.estadisticas.puntosPorJugador.toFixed(0)}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Link href={`/ligas/${liga.id}`} className="flex-1">
                <button className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition">
                  Ver Ranking
                </button>
              </Link>
              <Link href={`/ligas/${liga.id}/edit`} className="flex-1">
                <button className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition">
                  Editar
                </button>
              </Link>
              <div className="flex-1">
                <BotónEliminar
                  tipo="liga"
                  id={liga.id}
                  nombre={liga.nombre}
                  onSuccess={() => router.refresh()}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-sm text-gray-600 text-center">
        Mostrando {ligasFiltradas.length} de {ligas.length} ligas
      </div>
    </div>
  );
}
