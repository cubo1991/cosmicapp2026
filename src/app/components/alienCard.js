import React, { useState } from 'react'

/**
 * Componente unificado de tarjeta de alien
 * @param {Object} alien - Datos del alien
 * @param {Boolean} simple - Si es true, no muestra descripción (por defecto false)
 */
export const AlienCard = ({ alien, simple = false }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const difficultyConfig = {
    Green: { bg: 'bg-green-500', label: 'Fácil' },
    Yellow: { bg: 'bg-yellow-500', label: 'Medio' },
    Red: { bg: 'bg-red-500', label: 'Difícil' }
  }

  const config = difficultyConfig[alien?.Dificultad] || {}

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow bg-white dark:bg-gray-800">
      {alien && (
        <>
          {/* Header con nombre y dificultad */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white break-words flex-1">
              {alien.Nombre}
            </h2>
            <div
              className={`h-4 w-4 rounded-full shrink-0 ${config.bg}`}
              title={config.label}
              aria-label={`Dificultad: ${config.label}`}
            />
          </div>

          {/* Poder */}
          <h3 className="font-bold text-lg text-gray-700 dark:text-gray-300 mb-2">
            {alien.Poder || 'Poder desconocido'}
          </h3>

          {/* Descripción (solo si no es simple) */}
          {!simple && alien?.Descripción && (
            <>
              <p
                className={`text-gray-600 dark:text-gray-400 transition-all ${
                  isExpanded ? '' : 'line-clamp-3'
                }`}
              >
                {alien.Descripción}
              </p>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mt-2 font-medium transition-colors"
              >
                {isExpanded ? 'Ver menos' : 'Ver más'}
              </button>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default AlienCard
