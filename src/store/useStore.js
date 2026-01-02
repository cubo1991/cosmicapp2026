import { create } from 'zustand'

export const useStore = create((set) => ({
codigoPartida: null,
aliensPartida: [],

setAliensPartida: (aliens) => set({ aliensPartida: aliens }),
setCodigoPartida: (codigo) => set({ codigoPartida: codigo }),

}))
