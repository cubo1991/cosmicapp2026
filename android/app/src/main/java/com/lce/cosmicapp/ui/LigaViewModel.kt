package com.lce.cosmicapp.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lce.cosmicapp.data.Alien
import com.lce.cosmicapp.data.Copa
import com.lce.cosmicapp.data.CosmicRepository
import com.lce.cosmicapp.data.Partida
import com.lce.cosmicapp.data.PartidaDetalle
import com.lce.cosmicapp.data.Puesto
import kotlinx.coroutines.Job
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
    val partidas: List<Partida> = emptyList(),
    val copasCerradas: List<Copa> = emptyList(),
    val aliens: List<Alien> = emptyList(),
    val nombresPorId: Map<String, String> = emptyMap(),
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

class LigaViewModel : ViewModel() {

    private val _estado = MutableStateFlow(EstadoLiga())
    val estado: StateFlow<EstadoLiga> = _estado.asStateFlow()

    private val _sala = MutableStateFlow(EstadoSala())
    val sala: StateFlow<EstadoSala> = _sala.asStateFlow()

    /** Escucha activa de la partida abierta; se corta al cerrar la sala. */
    private var escuchaSala: Job? = null

    init { recargar() }

    fun recargar() = viewModelScope.launch {
        _estado.value = _estado.value.copy(cargando = true, error = null)
        try {
            _estado.value = EstadoLiga(
                copaActiva = CosmicRepository.copaActiva(),
                rankingGlobal = CosmicRepository.rankingGlobal(),
                partidas = CosmicRepository.partidasRecientes(),
                copasCerradas = CosmicRepository.copasCerradas(),
                aliens = CosmicRepository.aliens(),
                nombresPorId = CosmicRepository.nombresDeJugadores(),
                esAdmin = CosmicRepository.esAdmin(),
                cargando = false
            )
        } catch (e: Exception) {
            _estado.value = _estado.value.copy(
                cargando = false,
                error = e.message ?: "No se pudo cargar la liga"
            )
        }
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

    fun abrirSala(partida: Partida) = viewModelScope.launch {
        _sala.value = EstadoSala(buscando = true)
        // Arranca con lo poco que ya sabemos del listado; el listener completa el resto.
        seguirEnVivo(
            PartidaDetalle(partida.id, partida.nombre, "", partida.estado, emptyList())
        )
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

    override fun onCleared() {
        escuchaSala?.cancel()
        super.onCleared()
    }
}
