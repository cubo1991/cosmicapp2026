"use client";

import { useState } from "react";
import Link from "next/link";
import { useMatch } from "@/hooks/useMatch";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useEffect } from "react";
import BotónEliminar from "@/components/buttons/BotónEliminar";
import { useRouter } from "next/navigation";

export default function AdminPartidas() {
  const [partidas, setPartidas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const router = useRouter();

  useEffect(() => {
    const cargarPartidas = async () => {
      try {
        const q = query(collection(db, "matches"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // Más nuevas primero, ordenando acá y no con orderBy: Firestore descarta
        // los documentos que no tienen el campo, y las ~110 partidas de la Copa
        // Histórica no traen fechaCreacion. Quedan al final, que es donde van.
        data.sort((a, b) => (b.fechaCreacion?.toMillis() ?? 0) - (a.fechaCreacion?.toMillis() ?? 0));
        setPartidas(data);
      } catch (error) {
        console.error("Error cargando partidas:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarPartidas();
  }, []);

  const partidasFiltradas = partidas.filter((p) => {
    const coincideEstado = !filtroEstado || p.estado === filtroEstado;
    const coincideBusqueda = (p.nombre || "")
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
        return "bg-yellow-100 text-yellow-800";
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando partidas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">
          🎮 Gestión de Partidas
        </h2>
        <Link href="/matches">
          <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition">
            ➕ Nueva Partida
          </button>
        </Link>
      </div>

      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Buscar partida..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Todos</option>
          <option value="activa">Activas</option>
          <option value="finalizada">Finalizadas</option>
        </select>
      </div>

      <div className="grid gap-4">
        {partidasFiltradas.map((partida) => (
          <div
            key={partida.id}
            className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">
                  {partida.nombre || `Partida ${partida.id.slice(0, 8)}`}
                </h3>
                <p className="text-sm text-gray-500">
                  {partida.fechaCreacion &&
                    new Date(
                      partida.fechaCreacion.seconds * 1000,
                    ).toLocaleDateString("es-ES")}
                </p>
              </div>
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${getEstadoBadge(partida.estado)}`}
              >
                {partida.estado}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4 bg-gray-50 p-3 rounded text-sm">
              <div>
                <span className="text-gray-600">Jugadores:</span>
                <p className="font-semibold">
                  {Object.keys(partida.jugadores || {}).length}
                </p>
              </div>
              {partida.copId && (
                <div>
                  <span className="text-gray-600">Copa:</span>
                  <p className="font-semibold truncate">{partida.copId}</p>
                </div>
              )}
              {partida.ligaId && (
                <div>
                  <span className="text-gray-600">Liga:</span>
                  <p className="font-semibold truncate">{partida.ligaId}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Link href={`/matches/${partida.id}`} className="flex-1">
                <button className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition">
                  Ver Detalles
                </button>
              </Link>
              {partida.estado !== "finalizada" && (
                <Link href={`/matches/${partida.id}/edit`} className="flex-1">
                  <button className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition">
                    Editar
                  </button>
                </Link>
              )}
              <div className="flex-1">
                <BotónEliminar
                  tipo="partida"
                  id={partida.id}
                  nombre={partida.codigo || partida.nombre || `Partida ${partida.id.slice(0, 6)}`}
                  estadoPartida={partida.estado}
                  onSuccess={() => setPartidas(prev => prev.filter(p => p.id !== partida.id))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-sm text-gray-600 text-center">
        Mostrando {partidasFiltradas.length} de {partidas.length} partidas
      </div>
    </div>
  );
}
