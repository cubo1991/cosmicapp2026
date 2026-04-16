import { create } from 'zustand'

export const useStore = create((set) => ({
codigoPartida: null,
aliensPartida: [],

setAliensPartida: (aliens) => set({ aliensPartida: aliens }),
addAliensPartida: (newAliens) => set(state => ({
  aliensPartida: [...state.aliensPartida, ...newAliens]
})),
setCodigoPartida: (codigo) => set({ codigoPartida: codigo }),

}))
