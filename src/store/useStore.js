import { create } from 'zustand'

export const useStore = create((set) => ({
  // Partidas
  codigoPartida: null,
  aliensPartida: [],
  matchActual: null,
  
  // Usuarios
  usuarioActual: null,
  jugadores: [],
  
  // Copas y Ligas
  copas: [],
  ligas: [],
  copaActual: null,
  ligaActual: null,
  
  // Métodos para Aliens y Partidas
  setAliensPartida: (aliens) => set({ aliensPartida: aliens }),
  addAliensPartida: (newAliens) => set(state => ({
    aliensPartida: [...state.aliensPartida, ...newAliens]
  })),
  setCodigoPartida: (codigo) => set({ codigoPartida: codigo }),
  setMatchActual: (match) => set({ matchActual: match }),
  
  // Métodos para Usuarios
  setUsuarioActual: (usuario) => set({ usuarioActual: usuario }),
  setJugadores: (jugadores) => set({ jugadores }),
  addJugador: (jugador) => set(state => ({
    jugadores: [...state.jugadores, jugador]
  })),
  
  // Métodos para Copas
  setCopas: (copas) => set({ copas }),
  setCopaActual: (copa) => set({ copaActual: copa }),
  addCopa: (copa) => set(state => ({
    copas: [...state.copas, copa]
  })),
  
  // Métodos para Ligas
  setLigas: (ligas) => set({ ligas }),
  setLigaActual: (liga) => set({ ligaActual: liga }),
  addLiga: (liga) => set(state => ({
    ligas: [...state.ligas, liga]
  })),
  
  // Limpiar
  reset: () => set({
    codigoPartida: null,
    aliensPartida: [],
    matchActual: null,
    usuarioActual: null,
    jugadores: [],
    copas: [],
    ligas: [],
    copaActual: null,
    ligaActual: null,
  })
}))
