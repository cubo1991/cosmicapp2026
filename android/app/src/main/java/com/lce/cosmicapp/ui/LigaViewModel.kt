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
    val cargando: Boolean = true,
    val error: String? = null
)

/** La sala de una partida abierta desde su codigo, que se sigue en vivo. */
data class EstadoSala(
    val partida: PartidaDetalle? = null,
    val buscando: Boolean = false,
    val error: String? = null
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
    }

    override fun onCleared() {
        escuchaSala?.cancel()
        super.onCleared()
    }
}
