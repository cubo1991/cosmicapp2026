'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';


export default function CargarPartida() {
    const [id, setId] = useState('');
    const router = useRouter();

    const handleSubmit = (e) => {
        e.preventDefault();
        if (id.trim()) {
            router.push(`/cargarPartida/${id}`);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <h1 className="text-2xl font-bold mb-6">Cargar Partida</h1>
            <form onSubmit={handleSubmit} className="w-full max-w-md">
                <input
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="Ingresa el ID de la partida"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                />
                <button
                    type="submit"
                    className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
                >
                    Cargar
                </button>
            </form>
        </div>
    );
}