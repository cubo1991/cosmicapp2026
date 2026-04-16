'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingOverlay } from '../components/LoadingOverlay';

export default function CargarPartida() {
    const [id, setId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const trimmedId = id.trim().toUpperCase();

        if (!trimmedId) {
            setError('Por favor ingresa un código de partida');
            return;
        }

        if (trimmedId.length < 3) {
            setError('El código debe tener al menos 3 caracteres');
            return;
        }

        try {
            setIsLoading(true);
            // Validar que la partida existe antes de navegar
            // (esto se puede mejorar verificando en Firebase)
            router.push(`/cargarPartida/${trimmedId}`);
        } catch (err) {
            setError('Error al cargar la partida');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <LoadingOverlay message="Buscando partida..." />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 border border-white/20 shadow-xl">
                    <h1 className="text-3xl font-bold text-white mb-2 text-center">
                        Unirse a Partida
                    </h1>
                    <p className="text-purple-200 text-center mb-8">
                        Ingresa el código que te compartió tu amigo
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-6">
                            <label className="block text-white font-semibold mb-2">
                                Código de Partida
                            </label>
                            <input
                                type="text"
                                value={id}
                                onChange={(e) => {
                                    setId(e.target.value);
                                    setError('');
                                }}
                                placeholder="Ej: ABC123"
                                className="w-full px-4 py-3 border-2 border-white/20 bg-white/5 text-white rounded-lg focus:outline-none focus:border-purple-500 focus:bg-white/10 transition-all placeholder-gray-400 uppercase"
                                maxLength="10"
                                autoComplete="off"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-6 text-red-200 text-sm">
                                ⚠️ {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-3 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
                        >
                            Unirse a Partida 🔗
                        </button>

                        <div className="mt-6 pt-6 border-t border-white/10">
                            <p className="text-center text-purple-300 text-sm">
                                ¿Sin código?{' '}
                                <a href="/nuevaPartida" className="text-purple-400 hover:text-purple-300 font-bold">
                                    Crea una nueva partida
                                </a>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
