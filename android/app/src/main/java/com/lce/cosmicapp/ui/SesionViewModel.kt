package com.lce.cosmicapp.ui

import android.content.Context
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lce.cosmicapp.data.CosmicRepository
import com.lce.cosmicapp.data.Jugador
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Los cuatro estados por los que pasa alguien al abrir la app por primera vez:
 * sin sesion -> elige cual de los jugadores historicos es -> listo.
 */
sealed interface EstadoSesion {
    data object Cargando : EstadoSesion
    data object SinSesion : EstadoSesion
    data class Eligiendo(val candidatos: List<Jugador>) : EstadoSesion
    data class Listo(val jugador: Jugador) : EstadoSesion
}

class SesionViewModel : ViewModel() {

    private val _estado = MutableStateFlow<EstadoSesion>(EstadoSesion.Cargando)
    val estado: StateFlow<EstadoSesion> = _estado.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _ocupado = MutableStateFlow(false)
    val ocupado: StateFlow<Boolean> = _ocupado.asStateFlow()

    init {
        // Firebase Auth persiste la sesion entre aperturas, asi que al arrancar
        // puede haber usuario sin que nadie toque el boton de login.
        val usuario = CosmicRepository.usuarioActual
        if (usuario == null) {
            _estado.value = EstadoSesion.SinSesion
        } else {
            resolverJugador(usuario.uid)
        }
    }

    fun entrar(context: Context) = enTareaSegura {
        val usuario = CosmicRepository.entrarConGoogle(context)
        resolverJugadorAhora(usuario.uid)
    }

    /** "Ese soy yo": vincula la cuenta con un jugador que ya estaba en la base. */
    fun reclamar(jugador: Jugador) = enTareaSegura {
        val uid = CosmicRepository.usuarioActual?.uid ?: error("No hay sesion activa")
        CosmicRepository.vincular(jugador.id, uid)
        _estado.value = EstadoSesion.Listo(jugador.copy(uid = uid))
    }

    /** "Soy nuevo": crea un jugador para esta cuenta. */
    fun crearJugadorNuevo() = enTareaSegura {
        val usuario = CosmicRepository.usuarioActual ?: error("No hay sesion activa")
        val jugador = CosmicRepository.crearJugador(
            nombre = usuario.displayName ?: "Jugador nuevo",
            email = usuario.email ?: "",
            uid = usuario.uid
        )
        _estado.value = EstadoSesion.Listo(jugador)
    }

    fun salir() {
        CosmicRepository.cerrarSesion()
        _estado.value = EstadoSesion.SinSesion
    }

    fun descartarError() { _error.value = null }

    private fun resolverJugador(uid: String) = viewModelScope.launch {
        try {
            resolverJugadorAhora(uid)
        } catch (e: Exception) {
            _error.value = e.message
            _estado.value = EstadoSesion.SinSesion
        }
    }

    private suspend fun resolverJugadorAhora(uid: String) {
        // Cada vez que entra alguien: es idempotente y sobrevive a reinstalar.
        CosmicRepository.escucharAvisosDeLaLiga()
        val propio = CosmicRepository.jugadorDeLaCuenta(uid)
        _estado.value = if (propio != null) {
            EstadoSesion.Listo(propio)
        } else {
            EstadoSesion.Eligiendo(CosmicRepository.jugadoresSinVincular())
        }
    }

    /**
     * Envoltorio comun: marca ocupado, captura errores y trata la cancelacion del
     * dialogo de Google como lo que es (alguien que cambio de idea), no un error.
     */
    private fun enTareaSegura(bloque: suspend () -> Unit) = viewModelScope.launch {
        _ocupado.value = true
        try {
            bloque()
        } catch (e: GetCredentialCancellationException) {
            // Cancelo el selector de cuenta: no hay nada que informar.
        } catch (e: Exception) {
            _error.value = e.message ?: "Algo salio mal"
        } finally {
            _ocupado.value = false
        }
    }
}
