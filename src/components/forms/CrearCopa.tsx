"use client";

import { useState, useEffect } from "react";
import { useCopas } from "@/hooks/useCopa";
import { generarNombreCopa } from "@/utils/generadorNombres";

export default function CrearCopa() {
  const { crear, loading, error } = useCopas();
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    fechaInicio: "",
    fechaFin: "",
    cantidadRondas: "",
  });

  const [mensajeExito, setMensajeExito] = useState("");
  const [mensajeError, setMensajeError] = useState("");

  const generarNombreEnFormulario = async () => {
    const nombre = await generarNombreCopa();
    setFormData((prev) => ({ ...prev, nombre }));
  };

  // Sugiere un nombre automáticamente al abrir el formulario
  useEffect(() => {
    let cancelled = false;
    generarNombreCopa().then((nombre) => {
      if (!cancelled) setFormData((prev) => ({ ...prev, nombre }));
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

    // Validaciones
    if (formData.nombre.trim().length === 0) {
      setMensajeError("El nombre de la copa es requerido");
      return;
    }

    if (!formData.fechaInicio || !formData.fechaFin) {
      setMensajeError("Ambas fechas son requeridas");
      return;
    }

    const resultado = await crear(
      formData.nombre,
      formData.descripcion,
      formData.fechaInicio,
      formData.fechaFin,
      { cantidadRondas: parseInt(formData.cantidadRondas) || 0 },
    );

    if (resultado.success) {
      setMensajeExito("¡Copa creada exitosamente!");
      setFormData({
        nombre: "",
        descripcion: "",
        fechaInicio: "",
        fechaFin: "",
        cantidadRondas: "",
      });
      generarNombreEnFormulario();
      setTimeout(() => setMensajeExito(""), 3000);
    } else {
      setMensajeError(resultado.error || "Error al crear copa");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Crear Copa</h2>

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
            Nombre de la Copa
          </label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            placeholder="Ej: Copa Primavera 2026"
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
            placeholder="Describe la copa..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="fechaInicio"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Fecha de Inicio
          </label>
          <input
            type="date"
            id="fechaInicio"
            name="fechaInicio"
            value={formData.fechaInicio}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label
            htmlFor="fechaFin"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Fecha de Fin
          </label>
          <input
            type="date"
            id="fechaFin"
            name="fechaFin"
            value={formData.fechaFin}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label
            htmlFor="cantidadRondas"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Cantidad de Rondas (Opcional)
          </label>
          <input
            type="number"
            id="cantidadRondas"
            name="cantidadRondas"
            value={formData.cantidadRondas}
            onChange={handleChange}
            min="0"
            placeholder="Ej: 8"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition"
        >
          {loading ? "Creando..." : "Crear Copa"}
        </button>
      </form>
    </div>
  );
}
