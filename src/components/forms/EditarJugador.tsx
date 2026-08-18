"use client";

import { useState, useEffect } from "react";
import { usePlayer } from "@/hooks/usePlayer";

export default function EditarJugador({ playerId, onSuccess }) {
  const { player, actualizar } = usePlayer(playerId);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    avatar: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  // Llenar formulario cuando carga el jugador
  useEffect(() => {
    if (player) {
      setFormData({
        name: player.name || "",
        email: player.email || "",
        avatar: player.avatar || "",
      });
    }
  }, [player]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje({ tipo: "", texto: "" });

    // Validaciones
    if (formData.name.trim().length < 2) {
      setMensaje({
        tipo: "error",
        texto: "El nombre debe tener al menos 2 caracteres",
      });
      return;
    }

    if (!formData.email.includes("@")) {
      setMensaje({ tipo: "error", texto: "Email inválido" });
      return;
    }

    setIsLoading(true);
    const resultado = await actualizar({
      name: formData.name,
      email: formData.email,
      avatar: formData.avatar,
    });

    if (resultado.success) {
      setMensaje({
        tipo: "exito",
        texto: "¡Jugador actualizado correctamente!",
      });
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
    } else {
      setMensaje({
        tipo: "error",
        texto: resultado.error || "Error al actualizar",
      });
    }
    setIsLoading(false);
  };

  if (!player) {
    return (
      <div className="p-6 text-center text-gray-600">Cargando jugador...</div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Editar Jugador</h2>

      {mensaje.texto && (
        <div
          className={`mb-4 p-3 rounded border ${
            mensaje.tipo === "error"
              ? "bg-red-100 border-red-400 text-red-700"
              : "bg-green-100 border-green-400 text-green-700"
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Nombre
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label
            htmlFor="avatar"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Avatar URL
          </label>
          <input
            type="url"
            id="avatar"
            name="avatar"
            value={formData.avatar}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition"
        >
          {isLoading ? "Guardando..." : "Guardar Cambios"}
        </button>
      </form>
    </div>
  );
}
