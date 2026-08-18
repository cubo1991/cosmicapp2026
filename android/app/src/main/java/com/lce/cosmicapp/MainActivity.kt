package com.lce.cosmicapp

import android.os.Bundle
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.lce.cosmicapp.data.Jugador
import com.lce.cosmicapp.ui.Cargando
import com.lce.cosmicapp.ui.EstadoSesion
import com.lce.cosmicapp.ui.LigaViewModel
import com.lce.cosmicapp.ui.PantallaCopa
import com.lce.cosmicapp.ui.PantallaPartidas
import com.lce.cosmicapp.ui.PantallaPerfil
import com.lce.cosmicapp.ui.PantallaRanking
import com.lce.cosmicapp.ui.SesionViewModel
import com.lce.cosmicapp.ui.theme.CosmicAppTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            CosmicAppTheme {
                AppCosmic()
            }
        }
    }
}

@Composable
fun AppCosmic(vm: SesionViewModel = viewModel()) {
    val estado by vm.estado.collectAsState()

    // Una vez que la cuenta tiene jugador, la app pasa a ser el visor de la liga.
    when (val actual = estado) {
        is EstadoSesion.Listo -> PantallaPrincipal(actual.jugador, onSalir = vm::salir)
        else -> Onboarding(vm)
    }
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
    COPA("Copa", "🏆"),
    RANKING("Ranking", "📊"),
    PARTIDAS("Partidas", "🎲"),
    PERFIL("Perfil", "👤")
}

@Composable
private fun PantallaPrincipal(
    jugador: Jugador,
    onSalir: () -> Unit,
    ligaVm: LigaViewModel = viewModel()
) {
    val liga by ligaVm.estado.collectAsState()
    var pestanaActual by rememberSaveable { mutableIntStateOf(0) }
    val pestanas = Pestana.entries

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
                Pestana.COPA -> PantallaCopa(liga.copaActiva, contenido)
                Pestana.RANKING -> PantallaRanking(liga.rankingGlobal, contenido)
                Pestana.PARTIDAS -> PantallaPartidas(liga.partidas, contenido)
                Pestana.PERFIL -> PantallaPerfil(jugador, liga.copasCerradas, onSalir, contenido)
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
