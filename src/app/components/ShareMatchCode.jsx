"use client";
import { useState } from "react";
import Link from "next/link";

export function ShareMatchCode({ code }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Error al copiar:", err);
    }
  };

  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(
    `🎮 Únete a mi partida de CosmicAPP\n\nCódigo: ${code}\n\n${typeof window !== "undefined" ? window.location.origin : ""}/cargarPartida/${code}`,
  )}`;

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-lg p-8 border-2 border-green-300 dark:border-green-600">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">
        ✅ Partida Creada Exitosamente
      </h2>

      {/* Código */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-6 mb-6 text-center border-2 border-green-400">
        <p className="text-gray-600 dark:text-gray-300 text-sm font-medium mb-2">
          Código de la partida
        </p>
        <p className="text-4xl font-mono font-bold text-green-600 dark:text-green-400 mb-4 tracking-wider">
          {code}
        </p>
        <button
          onClick={copyToClipboard}
          className={`px-6 py-2 rounded font-bold transition-all duration-300 ${
            copied
              ? "bg-green-600 text-white"
              : "bg-green-500 hover:bg-green-600 text-white"
          }`}
        >
          {copied ? "✓ Copiado al portapapeles" : "Copiar código"}
        </button>
      </div>

      {/* Instrucciones */}
      <p className="text-center text-gray-700 dark:text-gray-300 mb-6 font-medium">
        Comparte este código con tus amigos:
      </p>

      {/* Botones de compartir */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Link
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-bold transition-colors"
        >
          📱 WhatsApp
        </Link>
        <a
          href={`sms:?body=${encodeURIComponent(`Únete a mi partida de CosmicAPP - Código: ${code}`)}`}
          className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-bold transition-colors"
        >
          💬 SMS
        </a>
      </div>

      {/* Ir a partida */}
      <Link
        href={`/cargarPartida/${code}`}
        className="block w-full text-center bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-bold transition-colors"
      >
        🎮 Ir a la Partida
      </Link>
    </div>
  );
}

export default ShareMatchCode;
