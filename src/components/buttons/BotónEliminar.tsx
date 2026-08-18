"use client";

import { useState } from "react";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { deleteMatchService } from "@/services/deleteMatchService";
import ModalConfirmacion from "@/components/modals/ModalConfirmacion";

export default function BotónEliminar({
  tipo = "jugador",
  id,
  nombre,
  estadoPartida = null,   // only used when tipo === "partida"
  onSuccess,
  className = "",
}) {
  const [mostrarModal, setMostrarModal] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [errorMsg,     setErrorMsg]     = useState(null);

  const colecciones = { jugador: "players", copa: "copas", liga: "ligas" };

  const esPartidaFinalizada = tipo === "partida" && estadoPartida === "finalizada";

  const labelBoton = esPartidaFinalizada ? "↩️ Anular" : "🗑️ Eliminar";

  const titulo  = esPartidaFinalizada ? "Anular partida finalizada" : `Eliminar ${tipo}`;

  const mensaje = esPartidaFinalizada
    ? `¿Anular la partida "${nombre}"?\n\nEsto revertirá:\n• Los puntos del ranking de la copa\n• Las estadísticas de cada jugador\n• El last10Score de cada jugador\n\nLa partida quedará eliminada como si nunca hubiera existido.`
    : tipo === "partida"
    ? `¿Eliminar la partida "${nombre}"?\n\nEl slot en la copa quedará libre automáticamente.`
    : `¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`;

  const handleEliminar = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (tipo === "partida") {
        if (esPartidaFinalizada) {
          await deleteMatchService.anularPartidaFinalizada(id);
        } else {
          await deleteMatchService.eliminarPartidaActiva(id);
        }
      } else {
        await deleteDoc(doc(db, colecciones[tipo], id));
      }
      setMostrarModal(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error:", error);
      setErrorMsg(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const colorBoton = esPartidaFinalizada
    ? "bg-orange-600 hover:bg-orange-700"
    : "bg-red-600 hover:bg-red-700";

  return (
    <>
      <button
        onClick={() => { setErrorMsg(null); setMostrarModal(true); }}
        className={`px-3 py-1 ${colorBoton} text-white text-sm rounded transition ${className}`}
      >
        {labelBoton}
      </button>

      <ModalConfirmacion
        isOpen={mostrarModal}
        titulo={titulo}
        mensaje={mensaje}
        textoConfirmar={esPartidaFinalizada ? "Sí, anular" : "Eliminar"}
        textoCancel="Cancelar"
        isDanger={true}
        isLoading={isLoading}
        errorMsg={errorMsg}
        onConfirm={handleEliminar}
        onCancel={() => { setMostrarModal(false); setErrorMsg(null); }}
      />
    </>
  );
}
