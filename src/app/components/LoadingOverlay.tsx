"use client";

export function LoadingOverlay({ message = "Cargando..." }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-8 text-center">
        <div className="animate-spin text-4xl mb-4">🌌</div>
        <p className="text-gray-700 dark:text-gray-300 font-semibold">
          {message}
        </p>
      </div>
    </div>
  );
}

export default LoadingOverlay;
