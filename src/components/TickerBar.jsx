'use client';

import { useEffect, useState } from 'react';
import { matchService } from '@/services/matchService';

const listaGanadores = (nombres) => {
  if (nombres.length === 1) return nombres[0];
  if (nombres.length === 2) return `${nombres[0]} y ${nombres[1]}`;
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
};

/**
 * Ticker tipo noticias debajo del navbar. Hoy solo muestra el ganador de la
 * última partida; a futuro, sumar más datos es agregar entradas a `items`.
 */
export default function TickerBar() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;

    matchService.obtenerUltimoGanador().then((ultimoGanador) => {
      if (cancelled || !ultimoGanador) return;

      const etiqueta = ultimoGanador.nombres.length > 1 ? 'Ganadores' : 'Ganador';
      setItems([
        `🏆  ${etiqueta} de la última partida: ${listaGanadores(ultimoGanador.nombres).toUpperCase()}`,
      ]);
    }).catch((err) => {
      console.error('Error cargando ticker:', err);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (items.length === 0) return null;

  // Repetimos el set para que el track sea más ancho que la pantalla: si no,
  // el loop entero cabe en una franja angosta y nunca "entra" por la derecha.
  // Duplicamos ese set una vez más para que la animación (translateX -50%)
  // no tenga salto.
  // ponytail: repetición fija en 6, alcanza de sobra para textos cortos en
  // pantallas anchas. Si a futuro los items son muchos/largos, medir el
  // ancho real con ResizeObserver en vez de este número fijo.
  const baseSet = Array.from({ length: 6 }, () => items).flat();
  const track = [...baseSet, ...baseSet];

  return (
    <div className="ticker-bar">
      <div className="ticker-track">
        {track.map((text, i) => (
          <span key={i} className="ticker-item">{text}</span>
        ))}
      </div>
    </div>
  );
}
