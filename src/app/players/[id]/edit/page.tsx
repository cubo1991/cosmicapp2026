'use client';

import { useState } from 'react';
import EditarJugador from '@/components/forms/EditarJugador';
import BotónEliminar from '@/components/buttons/BotónEliminar';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';


export default function EditarJugadorPage() {
  const { id } = useParams();
  const router = useRouter();

  const handleSuccessEditar = () => {
    router.push(`/players/${id}`);
  };

  const handleSuccessEliminar = () => {
    router.push('/players');
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            ← Volver
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Editar Jugador</h1>
            <BotónEliminar
              tipo="jugador"
              id={id}
              nombre={`Jugador ${id}`}
              onSuccess={handleSuccessEliminar}
            />
          </div>

          <EditarJugador playerId={id} onSuccess={handleSuccessEditar} />
        </div>
      </div>
    </div>
  );
}
