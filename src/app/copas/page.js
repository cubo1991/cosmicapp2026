'use client';

import { useState } from 'react';
import { useCopas } from '@/hooks/useCopa';
import CrearCopa from '@/components/forms/CrearCopa';
import BotónEliminar from '@/components/buttons/BotónEliminar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CopasPage() {
  const { copas, loading, error } = useCopas();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('');
  const router = useRouter();

  const copasFiltradas = filtroEstado
    ? copas.filter(c => c.estado === filtroEstado)
    : copas;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">🏆 Copas</h1>
          <button
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-md transition"
          >
            {mostrarFormulario ? '❌ Cancelar' : '➕ Crear Copa'}
          </button>
        </div>

        {mostrarFormulario && (
          <div className="mb-8 bg-white rounded-lg shadow-md p-6">
            <CrearCopa />
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            Error: {error}
          </div>
        )}

        {/* Filtros */}
        {copasFiltradas.length > 0 && (
          <div className="mb-6 flex gap-4">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Todas las copas</option>
              <option value="planificada">Planificadas</option>
              <option value="activa">Activas</option>
              <option value="finalizada">Finalizadas</option>
            </select>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-600">Cargando copas...</div>
        ) : copasFiltradas.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            {copas.length === 0 ? 'No hay copas. Crea una para comenzar.' : 'No se encontraron copas.'}
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Mostrando {copasFiltradas.length} de {copas.length} copas
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {copasFiltradas.map(copa => (
                <div key={copa.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-semibold text-gray-800">
                      {copa.nombre}
                    </h3>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      copa.estado === 'activa'
                        ? 'bg-green-100 text-green-800'
                        : copa.estado === 'planificada'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {copa.estado}
                    </span>
                  </div>

                  {copa.descripcion && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{copa.descripcion}</p>
                  )}

                  <div className="bg-gray-50 p-3 rounded mb-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Partidas:</span>
                      <span className="font-semibold">{copa.partidas?.length || 0}</span>
                    </div>
                    {copa.reglas?.cantidadRondas && (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Rondas:</span>
                        <span className="font-semibold">{copa.reglas.cantidadRondas}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/copas/${copa.id}`} className="flex-1">
                      <button className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition">
                        👁️ Ver
                      </button>
                    </Link>
                    <Link href={`/copas/${copa.id}/edit`} className="flex-1">
                      <button className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition">
                        ✏️ Editar
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
          </>
        )}
      </div>
    </div>
  );
}
