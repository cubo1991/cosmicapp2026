/**
 * Calculo de puntos: logica pura, sin Firestore.
 *
 * Es un port textual de scoringService.procesarResultadosPartida() de la web.
 * Se mantiene identico a proposito: cualquier diferencia entre este archivo y
 * el de la web cambia puntajes historicos. Hay un test de paridad que compara
 * las dos implementaciones sobre las mismas entradas (npm run test:paridad).
 *
 * Formula:
 *   puntos colonias = (internas x 1) + (externas x 2)
 *   puntos victoria = participantes / ganadores   (solo si gano)
 *   total           = colonias + victoria
 */

/**
 * Procesa el formulario de resultados y devuelve los puntos de cada jugador.
 *
 * Entrada: { [id]: { nombre, CI, CE, ganador, participó, color, playerId, aliens } }
 *
 * Distingue a quien participo de quien no: los que no participaron quedan
 * igual registrados, con todo en cero, para que la partida sirva de auditoria.
 */
function procesarResultadosPartida(datosFormulario) {
  // PASO 1: participa quien tiene el flag, o quien cargo alguna colonia.
  const participantes = Object.entries(datosFormulario)
    .filter(([, datos]) => {
      return datos["participó"] === true || (datos.CI || 0) > 0 || (datos.CE || 0) > 0;
    })
    .map(([id, datos]) => ({
      id,
      nombre: datos.nombre,
      color: datos.color || null,
      playerId: datos.playerId || null,
      aliens: datos.aliens || [],
      CI: datos.CI || 0,
      CE: datos.CE || 0,
      ganador: datos.ganador || false,
      puntosColonias: ((datos.CI || 0) * 1) + ((datos.CE || 0) * 2),
    }));

  if (participantes.length === 0) {
    throw new Error("Debe haber al menos 1 jugador participante");
  }

  // PASO 2: los ganadores se cuentan entre los participantes, no sobre el total.
  const ganadores = participantes.filter((p) => p.ganador).length;
  if (ganadores === 0) {
    throw new Error("Debe haber al menos un ganador");
  }

  // PASO 3
  const puntosVictoria = participantes.length / ganadores;

  // PASO 4
  const resultados = {};
  participantes.forEach((p) => {
    const puntosTotales = p.puntosColonias + (p.ganador ? puntosVictoria : 0);
    resultados[p.id] = {
      nombre: p.nombre,
      color: p.color,
      playerId: p.playerId,
      aliens: p.aliens,
      coloniasInternas: p.CI,
      coloniasExternas: p.CE,
      esGanador: p.ganador,
      "participó": true,
      puntos: {
        colonias: p.puntosColonias,
        victoria: p.ganador ? puntosVictoria : 0,
        total: puntosTotales,
      },
    };
  });

  // PASO 5: los que no participaron quedan registrados en cero.
  Object.entries(datosFormulario).forEach(([id, datos]) => {
    if (!resultados[id]) {
      resultados[id] = {
        nombre: datos.nombre,
        color: datos.color || null,
        playerId: datos.playerId || null,
        aliens: datos.aliens || [],
        coloniasInternas: 0,
        coloniasExternas: 0,
        esGanador: false,
        "participó": false,
        puntos: { colonias: 0, victoria: 0, total: 0 },
      };
    }
  });

  return {
    resultados,
    resumen: {
      totalParticipantes: participantes.length,
      totalGanadores: ganadores,
      puntosVictoria: parseFloat(puntosVictoria.toFixed(2)),
    },
  };
}

module.exports = { procesarResultadosPartida };
