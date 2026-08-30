"use client";

import { useEffect, useState } from "react";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { loginWithGoogle } from "@/firebase/auth";
import { playerService } from "@/services/playerService";
import { ligaService } from "@/services/ligaService";

/**
 * Alta por invitación (Fase 4 de docs/PLAN_MULTI_LIGA.md): la persona entra
 * con una cuenta real (no sirve la sesión anónima de siempre), reclama su
 * jugador histórico si todavía no lo hizo, y se une a la liga con el código
 * que le pasó el admin.
 */
export default function UnirsePage() {
  const { user, loading: cargandoAuth, isAnonymous } = useFirebaseAuth();

  const [miJugador, setMiJugador] = useState(null);
  const [sinReclamar, setSinReclamar] = useState([]);
  const [cargandoJugador, setCargandoJugador] = useState(true);
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  useEffect(() => {
    if (!user || isAnonymous) {
      setCargandoJugador(false);
      return;
    }
    (async () => {
      const propio = await playerService.obtenerPorUid(user.uid);
      if (propio) {
        setMiJugador(propio);
      } else {
        setSinReclamar(await playerService.obtenerSinVincular());
      }
      setCargandoJugador(false);
    })();
  }, [user, isAnonymous]);

  const handleReclamar = async (playerId) => {
    setMensaje({ tipo: "", texto: "" });
    try {
      await playerService.vincularConCuenta(playerId, user.uid);
      setMiJugador(await playerService.obtenerPorUid(user.uid));
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message });
    }
  };

  const handleUnirse = async (e) => {
    e.preventDefault();
    setMensaje({ tipo: "", texto: "" });
    if (!codigo.trim()) {
      setMensaje({ tipo: "error", texto: "Ingresá el código de invitación" });
      return;
    }
    setEnviando(true);
    try {
      const res: any = await ligaService.unirsePorCodigo(codigo.trim(), miJugador.id);
      setMensaje({ tipo: "exito", texto: `¡Listo! Te uniste a ${res.ligaNombre}.` });
      setCodigo("");
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message || "No se pudo unir a la liga" });
    }
    setEnviando(false);
  };

  if (cargandoAuth || cargandoJugador) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Unirse a una liga</h1>

        {isAnonymous && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Para unirte con un código necesitás entrar con tu cuenta (no alcanza con navegar sin login).
            </p>
            <button
              onClick={loginWithGoogle}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition"
            >
              Iniciar sesión con Google
            </button>
          </div>
        )}

        {!isAnonymous && !miJugador && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Todavía no tenés un jugador vinculado a tu cuenta. Elegí cuál es el tuyo:
            </p>
            {mensaje.texto && (
              <div className="mb-4 p-3 rounded border bg-red-100 border-red-400 text-red-700 text-sm">
                {mensaje.texto}
              </div>
            )}
            {sinReclamar.length === 0 ? (
              <p className="text-sm text-gray-500">No hay jugadores sin reclamar. Pedile al admin que te cree uno.</p>
            ) : (
              <ul className="divide-y border border-gray-200 rounded-md">
                {sinReclamar.map((p: any) => (
                  <li key={p.id} className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm text-gray-800">{p.name}</span>
                    <button
                      onClick={() => handleReclamar(p.id)}
                      className="text-sm px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
                    >
                      Soy yo
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!isAnonymous && miJugador && (
          <form onSubmit={handleUnirse} className="space-y-4">
            <p className="text-sm text-gray-600">
              Jugando como <span className="font-semibold">{miJugador.name}</span>.
            </p>

            {mensaje.texto && (
              <div
                className={`p-3 rounded border text-sm ${
                  mensaje.tipo === "error"
                    ? "bg-red-100 border-red-400 text-red-700"
                    : "bg-green-100 border-green-400 text-green-700"
                }`}
              >
                {mensaje.texto}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de invitación
              </label>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="Ej: AB3XQ9"
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm font-mono tracking-widest text-center text-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={enviando}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition"
            >
              {enviando ? "Uniendo..." : "Unirme"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
