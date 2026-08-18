import React, { useState } from 'react'


export const AlienCardSimple = ({ alien }) => {
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


        </>
      )}
    </div>
  )
}
export default AlienCardSimple;