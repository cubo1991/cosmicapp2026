import { getAliens } from "@/firebase/db";
import { setAliensPartida } from "@/store/acciones";

const asignadorAliens = async (jugadores) => {
  let aliens = await getAliens()
    .then((aliens) => aliens)
    .catch((error) => {
      console.error("Error al obtener los aliens:", error);
      return [];
    });

  if (aliens.length === 0) {
    console.error("No hay aliens disponibles en la base de datos");
    return false;
  }

  let aliensDisponibles = [...aliens];
  let aliensAsignados = [];

  jugadores.forEach((jugador) => {
    for (let i = 0; i < 2; i++) {
      if (aliensDisponibles.length === 0) {
        console.warn("Se agotaron los aliens disponibles");
        break;
      }

      const indice = Math.floor(Math.random() * aliensDisponibles.length);
      const alienSeleccionado = aliensDisponibles.splice(indice, 1)[0];

      if (alienSeleccionado) {
        jugador.aliens.push(alienSeleccionado.id);
        aliensAsignados.push(alienSeleccionado);
        console.log('Alien asignado:', alienSeleccionado.Nombre);
      }
    }
  });

  if (aliensAsignados.length > 0) {
    setAliensPartida(aliensAsignados);
  }

  return true;
};

export default asignadorAliens;
