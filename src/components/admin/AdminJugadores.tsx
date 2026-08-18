"use client";

import { useState } from "react";
import Link from "next/link";
import { usePlayers } from "@/hooks/usePlayer";
import BotónEliminar from "@/components/buttons/BotónEliminar";
import { useRouter } from "next/navigation";
import { exportService } from "@/services/exportService";

export default function AdminJugadores() {
  const { players, loading } = usePlayers();
  const [busqueda, setBusqueda] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const router = useRouter();

  const jugadoresFiltrados = players.filter(
    (p) =>
      p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.email && p.email.toLowerCase().includes(busqueda.toLowerCase())),
  );

  /**
   * Exportar todos los jugadores a CSV
   */
  const exportarJugadores = async () => {
    setExportLoading(true);
    try {
      const resultado = await exportService.exportarJugadoresCompleto();
      if (resultado.success) {
        alert(resultado.mensaje);
      } else {
        alert("Error al exportar: " + resultado.error);
      }
    } catch (error) {
      console.error("Error exportando:", error);
      alert("Error al exportar los datos: " + error.message);
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando jugadores...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">
          👥 Gestión de Jugadores
        </h2>
        <div className="flex gap-3">
          <button
            onClick={exportarJugadores}
            disabled={exportLoading || loading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md transition flex items-center gap-2"
          >
            {exportLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Exportando...
              </>
            ) : (
              <>📊 Exportar CSV</>
            )}
          </button>
          <Link href="/players">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition">
              ➕ Nuevo Jugador
            </button>
          </Link>
        </div>
      </div>

      <input
        type="text"
        placeholder="Buscar jugador..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="overflow-x-auto">
        <table className="w-full bg-white rounded-lg shadow-md">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">
                Email
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">
                Partidas
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">
                Victorias
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">
                Promedio
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-600">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {jugadoresFiltrados.map((jugador) => (
              <tr
                key={jugador.id}
                className="border-b hover:bg-gray-50 transition"
              >
                <td className="px-6 py-3 font-medium text-gray-800">
                  {jugador.nombre}
                </td>
                <td className="px-6 py-3 text-gray-600 text-sm">
                  {jugador.email || "N/A"}
                </td>
                <td className="px-6 py-3 text-center">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {jugador.estadisticas?.totalPartidas || 0}
                  </span>
                </td>
                <td className="px-6 py-3 text-center">
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {jugador.estadisticas?.victorias || 0}
                  </span>
                </td>
                <td className="px-6 py-3 text-center">
                  <span className="text-gray-600 font-medium">
                    {jugador.estadisticas?.totalPartidas > 0
                      ? (
                          (jugador.estadisticas.victorias /
                            jugador.estadisticas.totalPartidas) *
                          100
                        ).toFixed(0)
                      : 0}
                    %
                  </span>
                </td>
                <td className="px-6 py-3 text-center">
                  <div className="flex gap-2 justify-center">
                    <Link href={`/players/${jugador.id}`}>
                      <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition">
                        Ver
                      </button>
                    </Link>
                    <Link href={`/players/${jugador.id}/edit`}>
                      <button className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition">
                        Editar
                      </button>
                    </Link>
                    <div className="w-auto">
                      <BotónEliminar
                        tipo="jugador"
                        id={jugador.id}
                        nombre={jugador.nombre}
                        onSuccess={() => router.refresh()}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-gray-600 text-center">
        Mostrando {jugadoresFiltrados.length} de {players.length} jugadores
      </div>
    </div>
  );
}
