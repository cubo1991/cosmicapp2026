"use client";

import { useState } from "react";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import ModalConfirmacion from "@/components/modals/ModalConfirmacion";

export default function BotónEliminar({
  tipo = "jugador",
  id,
  nombre,
  onSuccess,
  className = "",
}) {
  const [mostrarModal, setMostrarModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const colecciones = {
    jugador: "players",
    partida: "matches",
    copa: "copas",
    liga: "ligas",
  };

  const handleEliminar = async () => {
    setIsLoading(true);
    try {
      const coleccion = colecciones[tipo];
      await deleteDoc(doc(db, coleccion, id));

      setMostrarModal(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error eliminando:", error);
      alert(`Error al eliminar: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setMostrarModal(true)}
        className={`px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition ${className}`}
      >
        🗑️ Eliminar
      </button>

      <ModalConfirmacion
        isOpen={mostrarModal}
        titulo={`Eliminar ${tipo}`}
        mensaje={`¿Estás seguro de que deseas eliminar "${nombre}"? Esta acción no se puede deshacer.`}
        textoConfirmar="Eliminar"
        textoCancel="Cancelar"
        isDanger={true}
        isLoading={isLoading}
        onConfirm={handleEliminar}
        onCancel={() => setMostrarModal(false)}
      />
    </>
  );
}
