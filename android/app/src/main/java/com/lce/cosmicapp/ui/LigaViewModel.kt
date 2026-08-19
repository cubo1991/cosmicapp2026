package com.lce.cosmicapp.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lce.cosmicapp.data.Alien
import com.lce.cosmicapp.data.Copa
import com.lce.cosmicapp.data.CosmicRepository
import com.lce.cosmicapp.data.Jugador
import com.lce.cosmicapp.data.Partida
import com.lce.cosmicapp.data.PartidaDetalle
import com.lce.cosmicapp.data.Puesto
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

/**
 * Todo lo que la app muestra en modo lectura. Se carga de una sola vez al abrir
 * y se puede recargar a mano.
 *
 * ponytail: una sola carga para todas las pestañas en vez de un ViewModel por
 * pantalla. Son consultas chicas contra la base de una liga; separarlas solo
 * agregaria piezas.
 */
data class EstadoLiga(
    val copaActiva: Copa? = null,
    val rankingGlobal: List<Puesto> = emptyList(),
    val partidas: List<PartidaDetalle> = emptyList(),
    val copasCerradas: List<Copa> = emptyList(),
    val aliens: List<Alien> = emptyList(),
    val nombresPorId: Map<String, String> = emptyMap(),
    val jugadores: List<Jugador> = emptyList(),
    /** La partida en curso donde juego yo, si hay alguna. */
    val miPartida: PartidaDetalle? = null,
    val esAdmin: Boolean = false,
    val cargando: Boolean = true,
    val error: String? = null
)

/** La sala de una partida abierta desde su codigo, que se sigue en vivo. */
data class EstadoSala(
    val partida: PartidaDetalle? = null,
    val buscando: Boolean = false,
    val error: String? = null
)

/** Formulario de nueva partida. */
data class EstadoCreacion(
    val abierto: Boolean = false,
    val nombre: String = "",
    val candidatos: List<Jugador> = emptyList(),
    val seleccionados: Set<String> = emptySet(),
    val sumaALaCopa: Boolean = true,
    val cargando: Boolean = false,
    val creando: Boolean = false,
    val error: String? = null
)

/** Una fila del formulario de carga: lo que se cargo para un jugador. */
data class FilaCarga(
    val clave: String,
    val nombre: String,
    val playerId: String?,
    val participa: Boolean = true,
    val ci: Int = 0,
    val ce: Int = 0,
    val ganador: Boolean = false
)

/**
 * Formulario de carga de resultados.
 *
 * ponytail: no calcula ni previsualiza puntos. La formula vive en la Cloud
 * Function; mostrarla acá seria reimplementarla en Kotlin y volver a tener dos
 * versiones que pueden divergir. Los puntos se muestran cuando responde el
 * backend.
 */
data class EstadoCarga(
    val abierto: Boolean = false,
    val filas: List<FilaCarga> = emptyList(),
    val guardando: Boolean = false,
    val error: String? = null,
    val exito: String? = null
)

class LigaViewModel(private val miPlayerId: String) : ViewModel() {

    private val _estado = MutableStateFlow(EstadoLiga())
    val estado: StateFlow<EstadoLiga> = _estado.asStateFlow()

    private val _sala = MutableStateFlow(EstadoSala())
    val sala: StateFlow<EstadoSala> = _sala.asStateFlow()

    /** Escucha activa de la partida abierta; se corta al cerrar la sala. */
    private var escuchaSala: Job? = null

    /** Las escuchas activas. Se declara antes del init: si no, su inicializador
     * a null corre despues y se pierde la referencia. */
    private var escuchas: Job? = null

    init { escuchar() }

    /**
     * Todo se actualiza solo.
     *
     * Copas, jugadores y partidas se escuchan en vivo: cuando la Cloud Function
     * carga unos puntos, o alguien elige su alien desde otro telefono, la
     * pantalla se mueve sola. Lo unico que se lee una sola vez es el catalogo de
     * aliens —237 documentos que no cambian— y si sos admin.
     */
    fun recargar() = escuchar()

    private fun escuchar() {
        escuchas?.cancel()
        escuchas = viewModelScope.launch {
            launch {
                try {
                    // Primero se traen los datos y recien despues se escribe el
                    // estado: si se pusieran como argumentos de copy(), Kotlin
                    // evalua el receptor `_estado.value` ANTES de suspender, y al
                    // volver pisaria todo lo que los listeners hayan entregado
                    // mientras tanto.
                    val catalogo = CosmicRepository.aliens()
                    val admin = CosmicRepository.esAdmin()
                    _estado.value = _estado.value.copy(
                        aliens = catalogo,
                        esAdmin = admin,
                        cargando = false
                    )
                } catch (e: Exception) {
                    _estado.value = _estado.value.copy(error = e.message, cargando = false)
                }
            }
            launch {
                CosmicRepository.observarCopas()
                    .catch { e -> _estado.value = _estado.value.copy(error = e.message, cargando = false) }
                    .collect { copas ->
                        _estado.value = _estado.value.copy(
                            copaActiva = copas.firstOrNull { it.esActiva },
                            copasCerradas = copas.filter { !it.esActiva }
                                .sortedByDescending { it.nombre },
                            cargando = false
                        )
                    }
            }
            launch {
                CosmicRepository.observarJugadores()
                    .catch { e -> _estado.value = _estado.value.copy(error = e.message, cargando = false) }
                    .collect { jugadores ->
                        _estado.value = _estado.value.copy(
                            jugadores = jugadores,
                            nombresPorId = jugadores.associate { it.id to it.nombre },
                            rankingGlobal = jugadores
                                .map { Puesto(it.id, it.nombre, it.last10Score) }
                                .filter { it.puntos > 0 }
                                .sortedByDescending { it.puntos },
                            cargando = false
                        )
                    }
            }
            launch {
                CosmicRepository.observarPartidas()
                    .catch { e -> _estado.value = _estado.value.copy(error = e.message, cargando = false) }
                    .collect { partidas ->
                        _estado.value = _estado.value.copy(
                            partidas = partidas,
                            miPartida = partidas.firstOrNull { p ->
                                !p.finalizada && p.participantes.any { it.playerId == miPlayerId }
                            },
                            cargando = false
                        )
                    }
            }
        }
    }

    override fun onCleared() {
        escuchas?.cancel()
        escuchaSala?.cancel()
        super.onCleared()
    }

    fun abrirSalaPorCodigo(codigo: String) = viewModelScope.launch {
        if (codigo.isBlank()) return@launch
        _sala.value = EstadoSala(buscando = true)
        try {
            val encontrada = CosmicRepository.buscarPartidaPorCodigo(codigo)
            if (encontrada == null) {
                _sala.value = EstadoSala(error = "No hay ninguna partida con el código $codigo")
            } else {
                seguirEnVivo(encontrada)
            }
        } catch (e: Exception) {
            _sala.value = EstadoSala(error = e.message ?: "No se pudo buscar la partida")
        }
    }

    fun abrirSala(partida: PartidaDetalle) = viewModelScope.launch {
        _sala.value = EstadoSala(buscando = true)
        seguirEnVivo(partida)
    }

    private fun seguirEnVivo(inicial: PartidaDetalle) {
        _sala.value = EstadoSala(partida = inicial)
        escuchaSala?.cancel()
        escuchaSala = viewModelScope.launch {
            CosmicRepository.observarPartida(inicial.id)
                .catch { e -> _sala.value = EstadoSala(error = e.message) }
                .collectLatest { actualizada ->
                    if (actualizada != null) _sala.value = EstadoSala(partida = actualizada)
                }
        }
    }

    fun cerrarSala() {
        escuchaSala?.cancel()
        escuchaSala = null
        _sala.value = EstadoSala()
        _carga.value = EstadoCarga()
    }

    /** Deja registrado cual de los dos aliens voy a jugar. */
    fun elegirAlien(alienId: String) = viewModelScope.launch {
        val partida = _estado.value.miPartida ?: return@launch
        try {
            // No hace falta reflejarlo a mano: el listener de partidas lo trae.
            CosmicRepository.elegirAlien(partida.id, miPlayerId, alienId)
        } catch (e: Exception) {
            _estado.value = _estado.value.copy(error = e.message)
        }
    }

    // ---- Ficha de un jugador ----

    private val _jugadorVisto = MutableStateFlow<Jugador?>(null)
    val jugadorVisto: StateFlow<Jugador?> = _jugadorVisto.asStateFlow()

    fun verJugador(jugador: Jugador) { _jugadorVisto.value = jugador }

    /** Desde una tabla solo tenemos el id; se resuelve contra los jugadores ya cargados. */
    fun verJugadorPorId(playerId: String) {
        _jugadorVisto.value = _estado.value.jugadores.firstOrNull { it.id == playerId }
    }

    fun cerrarFicha() { _jugadorVisto.value = null }

    // ---- Creación de partidas ----

    private val _creacion = MutableStateFlow(EstadoCreacion())
    val creacion: StateFlow<EstadoCreacion> = _creacion.asStateFlow()

    fun abrirCreacion() = viewModelScope.launch {
        _creacion.value = EstadoCreacion(abierto = true, cargando = true)
        try {
            _creacion.value = EstadoCreacion(
                abierto = true,
                candidatos = CosmicRepository.todosLosJugadores()
            )
        } catch (e: Exception) {
            _creacion.value = EstadoCreacion(abierto = true, error = e.message)
        }
    }

    fun cerrarCreacion() { _creacion.value = EstadoCreacion() }

    fun editarNuevaPartida(cambio: (EstadoCreacion) -> EstadoCreacion) {
        _creacion.value = cambio(_creacion.value).copy(error = null)
    }

    fun crearPartida() = viewModelScope.launch {
        val estado = _creacion.value
        val elegidos = estado.candidatos.filter { it.id in estado.seleccionados }

        // La copa reparte puntos entre jugadores registrados: no tiene sentido
        // asociarla con menos de dos. La validación de fondo la hace la function.
        if (elegidos.size < 2) {
            _creacion.value = estado.copy(error = "Elegí al menos dos jugadores")
            return@launch
        }

        _creacion.value = estado.copy(creando = true, error = null)
        try {
            val (id, codigo) = CosmicRepository.crearPartida(
                nombre = estado.nombre.ifBlank { "Partida sin nombre" },
                jugadores = elegidos,
                asociarACopa = estado.sumaALaCopa
            )
            _creacion.value = EstadoCreacion()
            recargar()
            // Se entra derecho a la sala recién creada: es lo que sigue en la mesa.
            seguirEnVivo(PartidaDetalle(id, estado.nombre, codigo, "activa", emptyList()))
        } catch (e: Exception) {
            _creacion.value = _creacion.value.copy(
                creando = false,
                error = e.message ?: "No se pudo crear la partida"
            )
        }
    }

    // ---- Carga de resultados ----

    private val _carga = MutableStateFlow(EstadoCarga())
    val carga: StateFlow<EstadoCarga> = _carga.asStateFlow()

    fun abrirCarga(nombresPorId: Map<String, String>) {
        val participantes = _sala.value.partida?.participantes ?: return
        _carga.value = EstadoCarga(
            abierto = true,
            filas = participantes.map {
                FilaCarga(
                    clave = it.claveDeCarga(),
                    nombre = it.mostrar(nombresPorId),
                    playerId = it.playerId
                )
            }
        )
    }

    fun cerrarCarga() { _carga.value = EstadoCarga() }

    fun editarFila(clave: String, cambio: (FilaCarga) -> FilaCarga) {
        _carga.value = _carga.value.copy(
            filas = _carga.value.filas.map { if (it.clave == clave) cambio(it) else it },
            error = null
        )
    }

    fun guardarCarga() = viewModelScope.launch {
        val partidaId = _sala.value.partida?.id ?: return@launch
        val filas = _carga.value.filas

        // Validación mínima del lado del cliente, para no ir y volver por gusto.
        // La validación que manda es la de la function.
        if (filas.none { it.participa }) {
            _carga.value = _carga.value.copy(error = "Tiene que jugar al menos uno")
            return@launch
        }
        if (filas.none { it.participa && it.ganador }) {
            _carga.value = _carga.value.copy(error = "Tiene que haber al menos un ganador")
            return@launch
        }

        _carga.value = _carga.value.copy(guardando = true, error = null)
        try {
            val resultados = filas.associate { fila ->
                fila.clave to mapOf(
                    "nombre" to fila.nombre,
                    "playerId" to fila.playerId,
                    "CI" to if (fila.participa) fila.ci else 0,
                    "CE" to if (fila.participa) fila.ce else 0,
                    "ganador" to (fila.participa && fila.ganador),
                    // La clave lleva tilde: asi la lee la function y la web.
                    "participó" to fila.participa
                )
            }
            val ganadorCopa = CosmicRepository.finalizarPartida(partidaId, resultados)
            _carga.value = EstadoCarga(
                exito = if (ganadorCopa != null) {
                    "Resultados guardados. ¡La copa se cerró y la ganó $ganadorCopa!"
                } else {
                    "Resultados guardados"
                }
            )
            recargar()
        } catch (e: Exception) {
            _carga.value = _carga.value.copy(
                guardando = false,
                error = e.message ?: "No se pudieron guardar los resultados"
            )
        }
    }

}
