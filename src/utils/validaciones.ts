'use client';

/**
 * Validaciones para la aplicación
 * Centraliza la lógica de validación en un solo lugar
 */

export const validaciones = {
  /**
   * Validar creación de partida
   */
  validarCreacionPartida: (nombre, jugadores, copId = null) => {
    const errores = [];
    
    if (!nombre || nombre.trim().length === 0) {
      errores.push('El nombre de la partida es requerido');
    }
    
    if (nombre && nombre.trim().length > 100) {
      errores.push('El nombre no puede exceder 100 caracteres');
    }
    
    if (!jugadores || jugadores.length < 2) {
      errores.push('Mínimo 2 jugadores requeridos');
    }
    
    if (jugadores && new Set(jugadores).size !== jugadores.length) {
      errores.push('No se pueden repetir jugadores');
    }
    
    return { valido: errores.length === 0, errores };
  },

  /**
   * Validar resultados de partida
   */
  validarResultados: (jugadores: Record<string, any>) => {
    const errores = [];
    
    if (!jugadores || Object.keys(jugadores).length === 0) {
      errores.push('Debe haber jugadores en la partida');
    }
    
    const ganadores = Object.values(jugadores || {})
      .filter(j => j.esGanador).length;
    
    if (ganadores === 0) {
      errores.push('Debe haber al menos un ganador');
    }
    
    // Validar colonias
    Object.entries(jugadores || {}).forEach(([id, jugador]) => {
      if ((jugador.coloniasInternas || 0) < 0) {
        errores.push('Las colonias internas no pueden ser negativas');
      }
      
      if ((jugador.coloniasExternas || 0) < 0) {
        errores.push('Las colonias externas no pueden ser negativas');
      }
    });
    
    return { valido: errores.length === 0, errores };
  },

  /**
   * Validar creación de jugador
   */
  validarJugador: (nombre, email) => {
    const errores = [];
    
    if (!nombre || nombre.trim().length < 2) {
      errores.push('Nombre debe tener al menos 2 caracteres');
    }
    
    if (nombre && nombre.trim().length > 100) {
      errores.push('Nombre no puede exceder 100 caracteres');
    }
    
    if (!email || !email.includes('@')) {
      errores.push('Email inválido');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      errores.push('Email inválido');
    }
    
    return { valido: errores.length === 0, errores };
  },

  /**
   * Validar creación de copa
   */
  validarCopa: (nombre, fechaInicio, fechaFin) => {
    const errores = [];
    
    if (!nombre || nombre.trim().length === 0) {
      errores.push('El nombre de la copa es requerido');
    }
    
    if (!fechaInicio || !fechaFin) {
      errores.push('Ambas fechas son requeridas');
    }
    
    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      
      if (inicio >= fin) {
        errores.push('La fecha de inicio debe ser anterior a la fecha de fin');
      }
    }
    
    return { valido: errores.length === 0, errores };
  },

  /**
   * Validar creación de liga
   */
  validarLiga: (nombre) => {
    const errores = [];
    
    if (!nombre || nombre.trim().length === 0) {
      errores.push('El nombre de la liga es requerido');
    }
    
    if (nombre && nombre.trim().length > 100) {
      errores.push('El nombre no puede exceder 100 caracteres');
    }
    
    return { valido: errores.length === 0, errores };
  }
};
