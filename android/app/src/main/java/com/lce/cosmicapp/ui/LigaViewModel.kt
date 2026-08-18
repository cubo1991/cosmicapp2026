package com.lce.cosmicapp.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lce.cosmicapp.data.Copa
import com.lce.cosmicapp.data.CosmicRepository
import com.lce.cosmicapp.data.Partida
import com.lce.cosmicapp.data.Puesto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Todo lo que la app muestra en modo lectura. Se carga de una sola vez al abrir
 * y se puede recargar a mano.
 *
 * ponytail: una sola carga para las cuatro pantallas en vez de un ViewModel por
 * pestaña. Son cuatro consultas chicas contra una base de una liga; separarlas
 * solo agregaria piezas.
 */
data class EstadoLiga(
    val copaActiva: Copa? = null,
    val rankingGlobal: List<Puesto> = emptyList(),
    val partidas: List<Partida> = emptyList(),
    val copasCerradas: List<Copa> = emptyList(),
    val cargando: Boolean = true,
    val error: String? = null
)

class LigaViewModel : ViewModel() {

    private val _estado = MutableStateFlow(EstadoLiga())
    val estado: StateFlow<EstadoLiga> = _estado.asStateFlow()

    init { recargar() }

    fun recargar() = viewModelScope.launch {
        _estado.value = _estado.value.copy(cargando = true, error = null)
        try {
            _estado.value = EstadoLiga(
                copaActiva = CosmicRepository.copaActiva(),
                rankingGlobal = CosmicRepository.rankingGlobal(),
                partidas = CosmicRepository.partidasRecientes(),
                copasCerradas = CosmicRepository.copasCerradas(),
                cargando = false
            )
        } catch (e: Exception) {
            _estado.value = _estado.value.copy(
                cargando = false,
                error = e.message ?: "No se pudo cargar la liga"
            )
        }
    }
}
