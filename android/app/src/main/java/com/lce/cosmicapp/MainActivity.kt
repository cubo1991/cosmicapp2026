package com.lce.cosmicapp

import android.Manifest
import android.os.Build
import android.os.Bundle
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.lce.cosmicapp.data.Jugador
import com.lce.cosmicapp.ui.Cargando
import com.lce.cosmicapp.ui.EstadoSesion
import com.lce.cosmicapp.ui.LigaViewModel
import com.lce.cosmicapp.ui.PantallaAliens
import com.lce.cosmicapp.ui.PantallaCargarResultados
import com.lce.cosmicapp.ui.PantallaCopa
import com.lce.cosmicapp.ui.PantallaFichaJugador
import com.lce.cosmicapp.ui.PantallaLigaLCE
import com.lce.cosmicapp.ui.PantallaHome
import com.lce.cosmicapp.ui.PantallaNuevaPartida
import com.lce.cosmicapp.ui.PantallaPartidas
import com.lce.cosmicapp.ui.PantallaPerfil
import com.lce.cosmicapp.ui.PantallaRanking
import com.lce.cosmicapp.ui.PantallaSala
import com.lce.cosmicapp.ui.SesionViewModel
import com.lce.cosmicapp.ui.theme.CosmicAppTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            CosmicAppTheme {
                // El fondo del tema lo pinta el Scaffold, y las pantallas que se
                // muestran fuera de uno (sala, carga, nueva partida) quedaban en
                // blanco. Este Surface se lo da a todas.
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AppCosmic()
                }
            }
        }
    }
}

@Composable
fun AppCosmic(vm: SesionViewModel = viewModel()) {
    val estado by vm.estado.collectAsState()
    PedirPermisoDeAvisos()

    // Una vez que la cuenta tiene jugador, la app pasa a ser el visor de la liga.
    when (val actual = estado) {
        is EstadoSesion.Listo -> PantallaPrincipal(actual.jugador, onSalir = vm::salir)
        else -> Onboarding(vm)
    }
}

/**
 * Desde Android 13 las notificaciones se piden en tiempo de ejecución.
 * Se pide una sola vez al abrir; si dicen que no, la app funciona igual, solo
 * que sin avisos.
 */
@Composable
private fun PedirPermisoDeAvisos() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
    val pedir = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { /* concedido o no, seguimos igual */ }
    LaunchedEffect(Unit) { pedir.launch(Manifest.permission.POST_NOTIFICATIONS) }
}

/** Login y elección de jugador: las dos pantallas previas a entrar a la liga. */
@Composable
private fun Onboarding(vm: SesionViewModel) {
    // El login necesita el contexto de la Activity: Credential Manager abre su
    // propia hoja de selección de cuenta sobre ella.
    val activity = LocalContext.current
    val estado by vm.estado.collectAsState()
    val error by vm.error.collectAsState()
    val ocupado by vm.ocupado.collectAsState()
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(error) {
        error?.let {
            snackbar.showSnackbar(it)
            vm.descartarError()
        }
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        snackbarHost = { SnackbarHost(snackbar) }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            when (val actual = estado) {
                EstadoSesion.Cargando -> CircularProgressIndicator()

                EstadoSesion.SinSesion -> PantallaLogin(
                    ocupado = ocupado,
                    onEntrar = { vm.entrar(activity) }
                )

                is EstadoSesion.Eligiendo -> PantallaElegirJugador(
                    candidatos = actual.candidatos,
                    ocupado = ocupado,
                    onReclamar = vm::reclamar,
                    onSoyNuevo = vm::crearJugadorNuevo
                )

                is EstadoSesion.Listo -> Unit // lo maneja AppCosmic
            }
        }
    }
}

private enum class Pestana(val etiqueta: String, val emoji: String) {
    HOME("Inicio", "🚀"),
    COPA("Copa", "🏆"),
    RANKING("Ranking", "📊"),
    PARTIDAS("Partidas", "🎲"),
    ALIENS("Aliens", "👽"),
    PERFIL("Perfil", "👤")
}

@Composable
private fun PantallaPrincipal(
    jugador: Jugador,
    onSalir: () -> Unit
) {
    // El ViewModel necesita saber quién sos para traer tu partida y tus aliens.
    val ligaVm: LigaViewModel = viewModel(
        key = jugador.id,
        factory = viewModelFactory {
            initializer { LigaViewModel(jugador.id) }
        }
    )
    val liga by ligaVm.estado.collectAsState()
    val sala by ligaVm.sala.collectAsState()
    var pestanaActual by rememberSaveable { mutableIntStateOf(0) }
    var verHistorico by rememberSaveable { mutableStateOf(false) }
    val pestanas = Pestana.entries

    val carga by ligaVm.carga.collectAsState()
    val creacion by ligaVm.creacion.collectAsState()
    val jugadorVisto by ligaVm.jugadorVisto.collectAsState()
    val partidasDeLaFicha by ligaVm.partidasDeLaFicha.collectAsState()

    jugadorVisto?.let { visto ->
        PantallaFichaJugador(
            jugador = visto,
            partidasRecientes = partidasDeLaFicha,
            aliensPorId = liga.aliens.associate { it.id to it.nombre },
            onVolver = ligaVm::cerrarFicha,
            modifier = Modifier.fillMaxSize().safeDrawingPadding()
        )
        return
    }

    if (creacion.abierto) {
        PantallaNuevaPartida(
            estado = creacion,
            onEditar = ligaVm::editarNuevaPartida,
            onCrear = ligaVm::crearPartida,
            onCancelar = ligaVm::cerrarCreacion,
            modifier = Modifier.fillMaxSize().safeDrawingPadding()
        )
        return
    }

    // La sala tapa las pestañas: mientras seguís una partida, es lo único que importa.
    // Van fuera del Scaffold, así que necesitan el margen de las barras del
    // sistema a mano: si no, el botón de volver queda debajo del reloj.
    if (sala.partida != null || sala.buscando) {
        val pantallaCompleta = Modifier.fillMaxSize().safeDrawingPadding()
        if (carga.abierto) {
            PantallaCargarResultados(
                estado = carga,
                onEditar = ligaVm::editarFila,
                onGuardar = ligaVm::guardarCarga,
                onCancelar = ligaVm::cerrarCarga,
                modifier = pantallaCompleta
            )
        } else {
            PantallaSala(
                estado = sala,
                miJugadorId = jugador.id,
                nombresPorId = liga.nombresPorId,
                aliensPorId = liga.aliens.associate { it.id to it.nombre },
                puedeCargar = liga.esAdmin,
                mensajeExito = carga.exito,
                onCargar = { ligaVm.abrirCarga(liga.nombresPorId) },
                onCerrar = ligaVm::cerrarSala,
                modifier = pantallaCompleta
            )
        }
        return
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        bottomBar = {
            NavigationBar {
                pestanas.forEachIndexed { indice, pestana ->
                    NavigationBarItem(
                        selected = indice == pestanaActual,
                        onClick = { pestanaActual = indice },
                        // Emoji en vez de iconos de Material: evita sumar la
                        // dependencia de material-icons por cuatro pestañas.
                        icon = { Text(pestana.emoji) },
                        label = { Text(pestana.etiqueta) }
                    )
                }
            }
        }
    ) { padding ->
        val contenido = Modifier.fillMaxSize().padding(padding)
        when {
            liga.cargando -> Cargando(contenido)
            liga.error != null -> ErrorLiga(liga.error!!, ligaVm::recargar, contenido)
            else -> when (pestanas[pestanaActual]) {
                Pestana.HOME -> PantallaHome(
                    jugador = jugador,
                    copa = liga.copaActiva,
                    rankingGlobal = liga.rankingGlobal,
                    partidas = liga.partidas,
                    esAdmin = liga.esAdmin,
                    miPartida = liga.miPartida,
                    onElegirAlien = { pestanaActual = Pestana.PERFIL.ordinal },
                    onNuevaPartida = ligaVm::abrirCreacion,
                    onIrAPartidas = { pestanaActual = Pestana.PARTIDAS.ordinal },
                    onAbrirPartida = ligaVm::abrirSala,
                    modifier = contenido
                )
                Pestana.COPA -> PantallaCopa(liga.copaActiva, ligaVm::verJugadorPorId, contenido)
                Pestana.RANKING -> Column(contenido) {
                    // Dos vistas del mismo tema en una pestaña, para no sumar
                    // una sexta a la barra de abajo.
                    SingleChoiceSegmentedButtonRow(
                        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)
                    ) {
                        SegmentedButton(
                            selected = !verHistorico,
                            onClick = { verHistorico = false },
                            shape = SegmentedButtonDefaults.itemShape(0, 2)
                        ) { Text("Últimas 10") }
                        SegmentedButton(
                            selected = verHistorico,
                            onClick = { verHistorico = true },
                            shape = SegmentedButtonDefaults.itemShape(1, 2)
                        ) { Text("Histórico LCE") }
                    }
                    if (verHistorico) {
                        PantallaLigaLCE(liga.jugadores, ligaVm::verJugador)
                    } else {
                        PantallaRanking(liga.rankingGlobal, ligaVm::verJugadorPorId)
                    }
                }
                Pestana.PARTIDAS -> PantallaPartidas(
                    partidas = liga.partidas,
                    errorCodigo = sala.error,
                    onBuscarCodigo = ligaVm::abrirSalaPorCodigo,
                    onNuevaPartida = ligaVm::abrirCreacion,
                    onAbrir = ligaVm::abrirSala,
                    modifier = contenido
                )
                Pestana.ALIENS -> PantallaAliens(liga.aliens, contenido)
                Pestana.PERFIL -> PantallaPerfil(
                    jugador = jugador,
                    copasCerradas = liga.copasCerradas,
                    esAdmin = liga.esAdmin,
                    miPartida = liga.miPartida,
                    aliens = liga.aliens,
                    onElegirAlien = ligaVm::elegirAlien,
                    onSalir = onSalir,
                    modifier = contenido
                )
            }
        }
    }
}

@Composable
private fun ErrorLiga(mensaje: String, onReintentar: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier.padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(mensaje, textAlign = TextAlign.Center)
        Spacer(Modifier.height(16.dp))
        Button(onClick = onReintentar) { Text("Reintentar") }
    }
}

@Composable
private fun PantallaLogin(ocupado: Boolean, onEntrar: () -> Unit) {
    Text("CosmicApp", style = MaterialTheme.typography.headlineLarge)
    Spacer(Modifier.height(8.dp))
    Text(
        "Liga Cosmic Encounter",
        style = MaterialTheme.typography.bodyLarge,
        textAlign = TextAlign.Center
    )
    Spacer(Modifier.height(32.dp))
    Button(onClick = onEntrar, enabled = !ocupado) {
        Text(if (ocupado) "Entrando..." else "Entrar con Google")
    }
}

@Composable
private fun ColumnScope.PantallaElegirJugador(
    candidatos: List<Jugador>,
    ocupado: Boolean,
    onReclamar: (Jugador) -> Unit,
    onSoyNuevo: () -> Unit
) {
    Text("¿Quién sos?", style = MaterialTheme.typography.headlineMedium)
    Spacer(Modifier.height(8.dp))
    Text(
        "Elegí tu jugador para recuperar tu historial de partidas y estadísticas.",
        style = MaterialTheme.typography.bodyMedium,
        textAlign = TextAlign.Center
    )
    Spacer(Modifier.height(24.dp))

    LazyColumn(
        modifier = Modifier.weight(1f, fill = false),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(candidatos, key = { it.id }) { jugador ->
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    Text(jugador.nombre, style = MaterialTheme.typography.titleMedium)
                    Text(
                        "${jugador.jugadas} jugadas · ${jugador.victorias} victorias · ${jugador.copas} copas",
                        style = MaterialTheme.typography.bodySmall
                    )
                    Spacer(Modifier.height(8.dp))
                    OutlinedButton(onClick = { onReclamar(jugador) }, enabled = !ocupado) {
                        Text("Ese soy yo")
                    }
                }
            }
        }
    }

    Spacer(Modifier.height(16.dp))
    TextButton(onClick = onSoyNuevo, enabled = !ocupado) {
        Text("No estoy en la lista, soy nuevo")
    }
}
