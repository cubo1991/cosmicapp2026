'use client';

import { useState, useEffect } from 'react';
// import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/store/useStore';
import CrearPartida from '@/components/forms/CrearPartida';
import BotónEliminar from '@/components/buttons/BotónEliminar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, orderByChild, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';

export default function MatchesPage() {
//   const { user } = useAuth();
// 🔹 TEMP: hasta que exista useAuth
const user = null;
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [partidas, setPartidas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const router = useRouter();

  // Cargar partidas del usuario en tiempo real
  useEffect(() => {
    if (!user) return;

    try {
      const colRef = collection(db, 'partidas');
      const q = query(colRef);
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const partidasData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPartidas(partidasData);
        setLoading(false);
      });

      return unsubscribe;
    } catch (err) {
      setError('Error cargando partidas');
      setLoading(false);
    }
  }, [user]);

  const partidasFiltradas = partidas.filter(partida => {
    const coincideEstado = !filtroEstado || partida.estado === filtroEstado;
    const coincideBusqueda = 
      (partida.nombre?.toLowerCase().includes(busqueda.toLowerCase())) ||
      (partida.copa?.toLowerCase().includes(busqueda.toLowerCase())) ||
      (partida.liga?.toLowerCase().includes(busqueda.toLowerCase()));
    return coincideEstado && coincideBusqueda;
  });

  const getEstadoBadgeColor = (estado) => {
    switch(estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'en_curso': return 'bg-blue-100 text-blue-800';
      case 'finalizada': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">🎮 Partidas</h1>
          <button
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-md transition"
          >
            {mostrarFormulario ? '❌ Cancelar' : '➕ Nueva Partida'}
          </button>
        </div>

        {mostrarFormulario && (
          <div className="mb-8 bg-white rounded-lg shadow-md p-6">
            <CrearPartida />
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            Error: {error}
          </div>
        )}

        {/* Filtros y búsqueda */}
        {partidasFiltradas.length > 0 && (
          <div className="mb-6 flex gap-4">
            <input
              type="text"
              placeholder="Buscar partida por nombre, copa o liga..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="en_curso">En curso</option>
              <option value="finalizada">Finalizadas</option>
            </select>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-600">Cargando partidas...</div>
        ) : partidasFiltradas.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            {partidas.length === 0 ? 'No hay partidas. Crea una para comenzar.' : 'No se encontraron partidas.'}
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Mostrando {partidasFiltradas.length} de {partidas.length} partidas
            </div>
            <div className="space-y-4">
              {partidasFiltradas.map(partida => (
                <div key={partida.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-800">
                        {partida.nombre || `Partida ${partida.id.slice(0, 8)}`}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {partida.fecha && new Date(partida.fecha).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-3 py-1 rounded ${getEstadoBadgeColor(partida.estado)}`}>
                      {partida.estado?.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 bg-gray-50 p-3 rounded mb-4 text-sm">
                    <div>
                      <span className="text-gray-700">Jugadores:</span>
                      <p className="font-semibold">{partida.jugadores?.length || 0}</p>
                    </div>
                    {partida.copa && (
                      <div>
                        <span className="text-gray-700">Copa:</span>
                        <p className="font-semibold truncate">{partida.copa}</p>
                      </div>
                    )}
                    {partida.liga && (
                      <div>
                        <span className="text-gray-700">Liga:</span>
                        <p className="font-semibold truncate">{partida.liga}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/matches/${partida.id}`} className="flex-1">
                      <button className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition">
                        👁️ Ver
                      </button>
                    </Link>
                    {partida.estado !== 'finalizada' && (
                      <Link href={`/matches/${partida.id}/edit`} className="flex-1">
                        <button className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition">
                          ✏️ Editar
                        </button>
                      </Link>
                    )}
                    <div className={partida.estado === 'finalizada' ? 'flex-1' : ''}>
                      {partida.estado !== 'finalizada' && (
                        <BotónEliminar
                          tipo="partida"
                          id={partida.id}
                          nombre={partida.nombre || 'Partida sin nombre'}
                          onSuccess={() => router.refresh()}
                          className="w-full"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
