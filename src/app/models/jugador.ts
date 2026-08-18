class Jugador {
  nombre: string;
  color: string;
  playerId: string | null;
  aliens: string[];

  constructor(nombre: string, color: string, playerId: string | null = null) {
    this.nombre = nombre;
    this.color = color;
    this.playerId = playerId; // ID del jugador en BD (null si es visitante)
    this.aliens = [];
  }

  toJSON() {
    return {
      nombre: this.nombre,
      color: this.color,
      playerId: this.playerId,
      aliens: this.aliens
    };
  }
}

export default Jugador;
