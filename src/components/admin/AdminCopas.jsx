"use client";

import { useState } from "react";
import Link from "next/link";
import { useCopas } from "@/hooks/useCopa";
import BotónEliminar from "@/components/buttons/BotónEliminar";
import { useRouter } from "next/navigation";

export default function AdminCopas() {
  const { copas, loading } = useCopas();
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const router = useRouter();

  const copasFiltradas = copas.filter((c) => {
    const coincideEstado = !filtroEstado || c.estado === filtroEstado;
    const coincideBusqueda = c.nombre?.toLowerCase()
      .toLowerCase()
      .includes(busqueda.toLowerCase());
    return coincideEstado && coincideBusqueda;
  });

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case "activa":
        return "bg-green-100 text-green-800";
      case "planificada":
        return "bg-yellow-100 text-yellow-800";
      case "finalizada":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando copas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">
          🏆 Gestión de Copas
        </h2>
        <Link href="/copas">
          <button className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md transition">
            ➕ Nueva Copa
          </button>
        </Link>
      </div>

      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Buscar copa..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">Todos</option>
          <option value="planificada">Planificadas</option>
          <option value="activa">Activas</option>
          <option value="finalizada">Finalizadas</option>
        </select>
      </div>

      <div className="grid gap-4">
        {copasFiltradas.map((copa) => (
          <div
            key={copa.id}
            className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">
                  {copa.nombre}
                </h3>
                {copa.descripcion && (
                  <p className="text-sm text-gray-600 line-clamp-1">
                    {copa.descripcion}
                  </p>
                )}
              </div>
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${getEstadoBadge(copa.estado)}`}
              >
                {copa.estado}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4 bg-gray-50 p-3 rounded text-sm">
              <div>
                <span className="text-gray-600">Partidas:</span>
                <p className="font-semibold">{copa.partidas?.length || 0}</p>
              </div>
              {copa.reglas?.cantidadRondas && (
                <div>
                  <span className="text-gray-600">Rondas:</span>
                  <p className="font-semibold">{copa.reglas.cantidadRondas}</p>
                </div>
              )}
              {copa.estadisticas?.jugadoresUnicos && (
                <div>
                  <span className="text-gray-600">Jugadores:</span>
                  <p className="font-semibold">
                    {copa.estadisticas.jugadoresUnicos}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Link href={`/copas/${copa.id}`} className="flex-1">
                <button className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition">
                  Ver Ranking
                </button>
              </Link>
              <Link href={`/copas/${copa.id}/edit`} className="flex-1">
                <button className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition">
                  Editar
                </button>
              </Link>
              <div className="flex-1">
                <BotónEliminar
                  tipo="copa"
                  id={copa.id}
                  nombre={copa.nombre}
                  onSuccess={() => router.refresh()}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-sm text-gray-600 text-center">
        Mostrando {copasFiltradas.length} de {copas.length} copas
      </div>
    </div>
  );
}
