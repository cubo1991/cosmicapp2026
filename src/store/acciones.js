const { useStore } = require("./useStore");

const setCodigoPartida = (codigo) => {
  useStore.getState().setCodigoPartida(codigo);
};

const setAliensPartida = (aliens) => {
    const currentAliens = useStore.getState().aliensPartida || [];
    useStore.getState().setAliensPartida([...currentAliens, ...aliens]);
}

const resetAliensStore = () => {
    useStore.getState().setAliensPartida([]);
}

export { setCodigoPartida, setAliensPartida, resetAliensStore };