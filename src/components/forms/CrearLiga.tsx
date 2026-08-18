"use client";

import { useState } from "react";
import { useLigas } from "@/hooks/useLiga";
import { usePlayer } from "@/hooks/usePlayer";

export default function CrearLiga() {
  const { crear, loading, error } = useLigas();
  const { player: usuarioActual } = usePlayer();

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
  });

  const [mensajeExito, setMensajeExito] = useState("");
  const [mensajeError, setMensajeError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensajeError("");
    setMensajeExito("");

    if (!usuarioActual) {
      setMensajeError("Debes ser un usuario para crear una liga");
      return;
    }

    if (formData.nombre.trim().length === 0) {
      setMensajeError("El nombre de la liga es requerido");
      return;
    }

    const resultado = await crear(
      formData.nombre,
      formData.descripcion,
      usuarioActual.id,
    );

    if (resultado.success) {
      setMensajeExito("¡Liga creada exitosamente!");
      setFormData({ nombre: "", descripcion: "" });
      setTimeout(() => setMensajeExito(""), 3000);
    } else {
      setMensajeError(resultado.error || "Error al crear liga");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Crear Liga</h2>

      {mensajeError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {mensajeError}
        </div>
      )}

      {mensajeExito && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {mensajeExito}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="nombre"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Nombre de la Liga
          </label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            placeholder="Ej: Liga de Amigos"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label
            htmlFor="descripcion"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Descripción (Opcional)
          </label>
          <textarea
            id="descripcion"
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            placeholder="Describe la liga..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 p-3 rounded">
          <p className="text-sm text-gray-700">
            Serás el creador y primer miembro de la liga. Podrás invitar otros
            jugadores después.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition"
        >
          {loading ? "Creando..." : "Crear Liga"}
        </button>
      </form>
    </div>
  );
}
