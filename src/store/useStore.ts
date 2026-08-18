import { create } from 'zustand'

// ponytail: campos en any hasta que existan modelos reales de Firestore
// (partida, jugador, copa, liga). Lo que importa acá es que useStore
// tenga forma fija para que TS la propague a quien lo consuma.
interface StoreState {
  codigoPartida: string | null;
  codigoCorto: string | null;
  aliensPartida: any[];
  matchActual: any | null;
  usuarioActual: any | null;
  jugadores: any[];
  copas: any[];
  ligas: any[];
  copaActual: any | null;
  ligaActual: any | null;

  setAliensPartida: (aliens: any[]) => void;
  addAliensPartida: (newAliens: any[]) => void;
  setCodigoPartida: (codigo: string | null) => void;
  setCodigoCorto: (codigo: string | null) => void;
  setMatchActual: (match: any) => void;
  setUsuarioActual: (usuario: any) => void;
  setJugadores: (jugadores: any[]) => void;
  addJugador: (jugador: any) => void;
  setCopas: (copas: any[]) => void;
  setCopaActual: (copa: any) => void;
  addCopa: (copa: any) => void;
  setLigas: (ligas: any[]) => void;
  setLigaActual: (liga: any) => void;
  addLiga: (liga: any) => void;
  reset: () => void;
}

export const useStore = create<StoreState>((set) => ({
  // Partidas
  codigoPartida: null,   // Firestore document ID (used in URLs)
  codigoCorto: null,     // Short human-readable code (6 chars, for display/entry)
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
  setCodigoCorto: (codigo) => set({ codigoCorto: codigo }),
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
    codigoCorto: null,
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
