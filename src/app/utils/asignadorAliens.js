const { getAliens } = require("@/firebase/db");

const setAliensPartida = require("@/store/acciones").setAliensPartida;

const asignadorAliens = async (jugadores) => {


  let aliens = await getAliens()
    .then((aliens) => aliens)
    .catch((error) => {
      console.error("Error al obtener los aliens:", error);
      return [];
    });




  let aliensDisponibles = [...aliens];

  jugadores.forEach((jugador) => {


    for (let i = 0; i < 2; i++) {
      const indice = Math.floor(Math.random() * aliensDisponibles.length);
      const alienSeleccionado = aliensDisponibles.splice(indice, 1)[0];
      jugador.aliens.push(alienSeleccionado?.Nombre);
      console.log('Alien asignado:', alienSeleccionado?.Nombre);
      setAliensPartida([alienSeleccionado]);
    }

  });
};

export default asignadorAliens;
