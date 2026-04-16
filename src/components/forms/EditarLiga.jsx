"use client";

import { useState, useEffect } from "react";
import { useLiga } from "@/hooks/useLiga";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";

export default function EditarLiga({ ligaId, onSuccess }) {
  const { liga } = useLiga(ligaId);
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    estado: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  useEffect(() => {
    if (liga) {
      setFormData({
        nombre: liga.nombre || "",
        descripcion: liga.descripcion || "",
        estado: liga.estado || "activa",
      });
    }
  }, [liga]);

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

    if (formData.nombre.trim().length === 0) {
      setMensaje({ tipo: "error", texto: "El nombre es requerido" });
      return;
    }

    setIsLoading(true);
    try {
      const docRef = doc(db, "ligas", ligaId);
      await updateDoc(docRef, {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
      });

      setMensaje({ tipo: "exito", texto: "¡Liga actualizada!" });
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (error) {
      setMensaje({ tipo: "error", texto: error.message });
    }
    setIsLoading(false);
  };

  if (!liga) {
    return (
      <div className="p-6 text-center text-gray-600">Cargando liga...</div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Editar Liga</h2>

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
            htmlFor="nombre"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Nombre
          </label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>

        <div>
          <label
            htmlFor="descripcion"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Descripción
          </label>
          <textarea
            id="descripcion"
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition"
        >
          {isLoading ? "Guardando..." : "Guardar Cambios"}
        </button>
      </form>
    </div>
  );
}
