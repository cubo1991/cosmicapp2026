'use client';
import React, { useState, useEffect } from 'react';
import codigoColores from '../utils/colors';

import Jugador from '../models/jugador';
import { addMatch } from '@/firebase/db';
import asignadorAliens from '../utils/asignadorAliens';

import { useStore } from '@/store/useStore';

function NewMatch() {
  const [coloresSeleccionados, setColoresSeleccionados] = useState([]);
  const [partidaCreada, setPartidaCreada] = useState(false);

  const codigoPartida = useStore(state => state.codigoPartida);
const resetAliensPartida = useStore(state => state.setAliensPartida);

  useEffect(() => {
    resetAliensPartida([]);
  }, [resetAliensPartida]);
  const toggleColor = (name, code) => {
    setColoresSeleccionados(prev => {
      const existe = prev.find(c => c.name === name);
      if (existe) {
        return prev.filter(c => c.name !== name);
      } else {
        return [...prev, { name, code }];
      }
    });
  };

  const crearPartida = async (e) => {
    e.preventDefault();

    if (coloresSeleccionados.length === 0) {
      alert('Selecciona al menos un color');
      return;
    }

    const jugadores = coloresSeleccionados.map(
      ({ name, code }) => new Jugador(name, code)
    );

    await asignadorAliens(jugadores);

    await addMatch({
      jugadores: jugadores.map(j => j.toJSON())
    });

    setPartidaCreada(true);
  };

  useEffect(() => {
    if (codigoPartida) {
      console.log('Código desde Zustand:', codigoPartida);
    }
  }, [codigoPartida]);

  return (
    <div className="newMatchContainer">
      <h1 className="newMatchTitle">Crear Nueva Partida</h1>

      <form className="newMatchForm" onSubmit={crearPartida}>
        <div className="colorGrid">
          {Object.entries(codigoColores).map(([name, code]) => {
            const seleccionado = coloresSeleccionados.some(c => c.name === name);
            return (
              <div
                key={name}
                onClick={() => toggleColor(name, code)}
                className={`colorBox ${seleccionado ? 'colorBoxSelected' : ''}`}
                style={{
                  backgroundColor: code,
                }}
              >
              </div>
            );
          })}
        </div>

        {!partidaCreada ? (
          <button type="submit" className="createMatchButton">
            Crear Partida
          </button>
        ) : (
          <p className="matchCreatedMessage">
            Partida Creada! Código: {codigoPartida}
          </p>
        )}

        {partidaCreada && (
          <div className="shareSection">
            <p>Compartí esta partida</p>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Mira esta partida: ${window.location.origin}/cargarPartida/${codigoPartida}\nHaz clic en el enlace de arriba para unirte a la partida!`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shareWhatsappButton"
            >
              Compartir por WhatsApp
            </a>
           
            <a
              href={`/cargarPartida/${codigoPartida}`}
              className="goToMatchButton"
            >
              Ir a la Partida
            </a>
          </div>
        )}
      </form>
    </div>
  );
}

export default NewMatch;
