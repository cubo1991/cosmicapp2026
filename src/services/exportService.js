/**
 * 📊 Servicio de Exportación de Datos
 * Genera CSV con datos de jugadores, partidas, etc.
 */

import {
  collection,
  getDocs,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '@/firebase/config';

/**
 * Generar CSV con datos de jugadores
 * 
 * Columnas:
 * - ID, Nombre, Email, Avatar, Partidas, Victorias, Promedio Puntos, 
 *   Última Partida, Rank Global, Puntos Últimas 10, Fecha Creación
 */
export const exportService = {
  /**
   * Obtener todos los jugadores con datos completos para exportación
   */
  async obtenerTodosLosJugadores() {
    try {
      const playersCollection = collection(db, 'players');
      const querySnapshot = await getDocs(
        query(playersCollection, orderBy('name', 'asc'))
      );
      
      const jugadores = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return jugadores;
    } catch (error) {
      console.error('Error obteniendo todos los jugadores:', error);
      throw error;
    }
  },
  /**
   * Convertir array de jugadores a CSV
   */
  generarCSVJugadores(jugadores) {
    const headers = [
      'ID',
      'Nombre',
      'Email',
      'Avatar',
      'Partidas',
      'Victorias',
      'Promedio Puntos',
      'Tasa Victorias %',
      'Puntos Últimas 10',
      'Rank Global',
      'Fecha Creación',
      'Última Partida'
    ];

    const rows = jugadores.map((j, index) => [
      j.id || '',
      this.escaparCSV(j.name || j.nombre || ''),
      j.email || '',
      j.avatar || '',
      j.stats?.partidas || 0,
      j.stats?.victorias || 0,
      (j.stats?.puntosPromedio || 0).toFixed(2),
      j.stats?.partidas > 0 
        ? ((j.stats.victorias / j.stats.partidas) * 100).toFixed(1)
        : '0',
      (j.last10Score || 0).toFixed(2),
      index + 1, // Rank = posición en lista
      j.createdAt 
        ? new Date(j.createdAt.toDate?.() || j.createdAt).toLocaleDateString('es-AR')
        : 'N/A',
      j.stats?.ultimaPartida
        ? new Date(j.stats.ultimaPartida.toDate?.() || j.stats.ultimaPartida).toLocaleDateString('es-AR')
        : 'N/A'
    ]);

    return this.generarCSV(headers, rows);
  },

  /**
   * Convertir array de partidas a CSV
   */
  generarCSVPartidas(partidas) {
    const headers = [
      'ID Partida',
      'Nombre',
      'Fecha',
      'Estado',
      'Jugadores',
      'Ganadores',
      'Es Manual',
      'Copa',
      'Liga'
    ];

    const rows = partidas.map(p => [
      p.id || '',
      this.escaparCSV(p.nombre || ''),
      p.fechaCreacion 
        ? new Date(p.fechaCreacion.toDate?.() || p.fechaCreacion).toLocaleDateString('es-AR')
        : 'N/A',
      p.estado || 'activa',
      Object.keys(p.jugadores || {}).length,
      Object.values(p.jugadores || {}).filter(j => j.esGanador).length,
      p.esManual ? 'Sí' : 'No',
      p.copId || '',
      p.ligaId || ''
    ]);

    return this.generarCSV(headers, rows);
  },

  /**
   * Generar CSV personalizado
   */
  generarCSV(headers, rows) {
    const headerRow = headers.map(h => this.escaparCSV(h)).join(',');
    const dataRows = rows.map(row => 
      row.map(cell => this.escaparCSV(String(cell))).join(',')
    ).join('\n');
    
    return `${headerRow}\n${dataRows}`;
  },

  /**
   * Escapar valores para CSV
   */
  escaparCSV(valor) {
    if (typeof valor !== 'string') {
      valor = String(valor);
    }
    
    // Si contiene coma, comilla o salto de línea, envolver en comillas
    if (valor.includes(',') || valor.includes('"') || valor.includes('\n')) {
      return `"${valor.replace(/"/g, '""')}"`;
    }
    return valor;
  },

  /**
   * Descargar CSV en el navegador
   */
  descargarCSV(contenido, nombre = 'datos.csv') {
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', nombre);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Exportar jugadores completo: obtener datos + generar CSV + descargar
   */
  async exportarJugadoresCompleto(jugadoresExistentes = null) {
    try {
      // Si no se pasan jugadores, obtener todos desde la base de datos
      const jugadores = jugadoresExistentes || await this.obtenerTodosLosJugadores();

      // Ordenar por rank (última 10 puntos)
      const jugadoresOrdenados = [...jugadores]
        .sort((a, b) => (b.last10Score || 0) - (a.last10Score || 0));

      const csv = this.generarCSVJugadores(jugadoresOrdenados);
      const fecha = new Date().toLocaleDateString('es-AR').replace(/\//g, '-');
      this.descargarCSV(csv, `jugadores_${fecha}.csv`);

      return {
        success: true,
        mensaje: `✓ Descargado: jugadores_${fecha}.csv (${jugadoresOrdenados.length} jugadores)`
      };
    } catch (error) {
      console.error('Error exportando jugadores:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Exportar partidas completo
   */
  async exportarPartidosCompleto(partidas) {
    try {
      // Ordenar por fecha descendente
      const partidasOrdenadas = [...partidas]
        .sort((a, b) => {
          const fechaA = a.fechaCreacion?.toDate?.() || a.fechaCreacion || new Date(0);
          const fechaB = b.fechaCreacion?.toDate?.() || b.fechaCreacion || new Date(0);
          return new Date(fechaB) - new Date(fechaA);
        });

      const csv = this.generarCSVPartidas(partidasOrdenadas);
      const fecha = new Date().toLocaleDateString('es-AR').replace(/\//g, '-');
      this.descargarCSV(csv, `partidas_${fecha}.csv`);

      return {
        success: true,
        mensaje: `✓ Descargado: partidas_${fecha}.csv`
      };
    } catch (error) {
      console.error('Error exportando partidas:', error);
      throw error;
    }
  }
};
