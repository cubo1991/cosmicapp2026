class Jugador {
  constructor(nombre, color) {
    this.nombre = nombre;
    this.color = color;
    this.aliens = [];
  }

  toJSON() {
    return {
      nombre: this.nombre,
      color: this.color,
      aliens: this.aliens
    };
  }
}

export default Jugador;
