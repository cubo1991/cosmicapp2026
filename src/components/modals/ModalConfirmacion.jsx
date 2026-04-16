"use client";

import { useState } from "react";

/**
 * Modal de confirmación reutilizable
 */
export default function ModalConfirmacion({
  isOpen,
  titulo,
  mensaje,
  textoConfirmar = "Confirmar",
  textoCancel = "Cancelar",
  onConfirm,
  onCancel,
  isDanger = false,
  isLoading = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
        <h2 className="text-xl font-bold text-gray-800 mb-4">{titulo}</h2>
        <p className="text-gray-600 mb-6">{mensaje}</p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded transition disabled:bg-gray-200"
          >
            {textoCancel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded transition disabled:opacity-50 ${
              isDanger
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {isLoading ? "Procesando..." : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
