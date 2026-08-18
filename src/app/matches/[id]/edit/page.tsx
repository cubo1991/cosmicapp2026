'use client';

import { useState } from 'react';
import EditarPartida from '@/components/forms/EditarPartida';
import BotónEliminar from '@/components/buttons/BotónEliminar';
import { useParams, useRouter } from 'next/navigation';
 

export default function EditarPartidaPage() {
  const { id } = useParams();
  const router = useRouter();

  const handleSuccessEditar = () => {
    router.push(`/matches/${id}`);
  };

  const handleSuccessEliminar = () => {
    router.push('/matches');
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
            <h1 className="text-3xl font-bold text-gray-800">Editar Partida</h1>
            <BotónEliminar
              tipo="partida"
              id={id}
              nombre={`Partida ${id}`}
              onSuccess={handleSuccessEliminar}
            />
          </div>

          <EditarPartida matchId={id} onSuccess={handleSuccessEditar} />
        </div>
      </div>
    </div>
  );
}
