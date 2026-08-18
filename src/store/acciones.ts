import { useStore } from "./useStore";

const setCodigoPartida = (codigo: string) => {
  useStore.getState().setCodigoPartida(codigo);
};

const setAliensPartida = (aliens: unknown[]) => {
    const currentAliens = useStore.getState().aliensPartida || [];
    useStore.getState().setAliensPartida([...currentAliens, ...aliens]);
}

const resetAliensStore = () => {
    useStore.getState().setAliensPartida([]);
}

export { setCodigoPartida, setAliensPartida, resetAliensStore };