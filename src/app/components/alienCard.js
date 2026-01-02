import React, { useState } from 'react'


export const AlienCard = ({ alien }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const difficultyColor = {
    Green: 'bg-green-500',
    Yellow: 'bg-yellow-500',
    Red: 'bg-red-500'
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 shadow-lg w-full overflow-hidden">
      {alien && (
        <>
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-2xl font-bold break-words">
              {alien.Nombre}
            </h2>

            <span
              className={`h-4 w-4 shrink-0 rounded-full ${difficultyColor[alien.Dificultad]}`}
            />
          </div>

          {/* Body */}
          <h3 className="font-bold text-lg mt-2 break-words">
            {alien.Poder}
          </h3>

          <p
            className={`break-words overflow-hidden ${
              isExpanded ? '' : 'max-h-14'
            }`}
          >
            {alien.Descripción || 'Chupala, no me voy a poner a llenar manualmente este poder'}
          </p>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-500 mt-2"
          >
            {isExpanded ? 'Ver menos' : 'Ver más'}
          </button>
        </>
      )}
    </div>
  )
}
export default AlienCard