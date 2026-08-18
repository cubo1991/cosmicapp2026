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
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.lce.cosmicapp.data.Jugador
import com.lce.cosmicapp.ui.EstadoSesion
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
    // El login necesita el contexto de la Activity: Credential Manager abre su
    // propia hoja de seleccion de cuenta sobre ella.
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

                is EstadoSesion.Listo -> PantallaJugador(
                    jugador = actual.jugador,
                    onSalir = vm::salir
                )
            }
        }
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
        "Eligí tu jugador para recuperar tu historial de partidas y estadísticas.",
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
                    OutlinedButton(
                        onClick = { onReclamar(jugador) },
                        enabled = !ocupado
                    ) {
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

@Composable
private fun PantallaJugador(jugador: Jugador, onSalir: () -> Unit) {
    Text("Hola, ${jugador.nombre}", style = MaterialTheme.typography.headlineMedium)
    Spacer(Modifier.height(24.dp))
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Text("Partidas jugadas: ${jugador.jugadas}")
            Text("Victorias: ${jugador.victorias}")
            Text("Copas: ${jugador.copas}")
        }
    }
    Spacer(Modifier.height(24.dp))
    TextButton(onClick = onSalir) { Text("Cerrar sesión") }
}
