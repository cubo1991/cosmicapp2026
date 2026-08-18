package com.lce.cosmicapp.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.lce.cosmicapp.data.Alien

/**
 * Catalogo de aliens con buscador y sorteo.
 *
 * El sorteo es lo que se usa en la mesa: en vez de repartir cartas a mano,
 * cada quien toca el boton y le sale el suyo.
 */
@Composable
fun PantallaAliens(aliens: List<Alien>, modifier: Modifier = Modifier) {
    var busqueda by remember { mutableStateOf("") }
    var sorteado by remember { mutableStateOf<Alien?>(null) }

    val visibles = remember(aliens, busqueda) {
        if (busqueda.isBlank()) aliens
        else aliens.filter {
            it.nombre.contains(busqueda, ignoreCase = true) ||
                it.poder.contains(busqueda, ignoreCase = true)
        }
    }

    Column(modifier.padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Aliens", style = MaterialTheme.typography.headlineMedium)
            Spacer(Modifier.weight(1f))
            Text("${aliens.size}", style = MaterialTheme.typography.bodyMedium)
        }
        Spacer(Modifier.height(12.dp))

        Button(
            onClick = { sorteado = aliens.randomOrNull() },
            enabled = aliens.isNotEmpty()
        ) {
            Text("🎲  Sortear un alien")
        }

        sorteado?.let { alien ->
            Spacer(Modifier.height(12.dp))
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    Text(alien.nombre, style = MaterialTheme.typography.titleLarge)
                    if (alien.poder.isNotBlank()) {
                        Text(alien.poder, style = MaterialTheme.typography.bodyMedium)
                    }
                    Spacer(Modifier.height(8.dp))
                    TextButton(onClick = { sorteado = null }) { Text("Cerrar") }
                }
            }
        }

        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = busqueda,
            onValueChange = { busqueda = it },
            label = { Text("Buscar por nombre o poder") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(12.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(visibles, key = { it.id }) { alien -> FichaAlien(alien) }
        }
    }
}

@Composable
private fun FichaAlien(alien: Alien) {
    var expandido by remember { mutableStateOf(false) }
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    alien.nombre,
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.weight(1f)
                )
                if (alien.dificultad.isNotBlank()) {
                    AssistChip(onClick = {}, label = { Text(alien.dificultad) })
                }
            }
            if (alien.poder.isNotBlank()) {
                Text(alien.poder, style = MaterialTheme.typography.bodyMedium)
            }
            if (alien.descripcion.isNotBlank()) {
                TextButton(onClick = { expandido = !expandido }) {
                    Text(if (expandido) "Ocultar" else "Ver descripción")
                }
                if (expandido) {
                    Text(alien.descripcion, style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}

/**
 * Sala de una partida: se abre con el codigo compartible y se sigue en vivo,
 * asi que si alguien cambia algo desde la web se ve al toque.
 */
@Composable
fun PantallaSala(
    estado: EstadoSala,
    nombresPorId: Map<String, String>,
    onCerrar: () -> Unit,
    modifier: Modifier = Modifier
) {
    val partida = estado.partida
    Column(modifier.padding(16.dp)) {
        TextButton(onClick = onCerrar) { Text("← Volver") }
        Spacer(Modifier.height(8.dp))

        when {
            estado.buscando && partida == null ->
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }

            partida == null ->
                Text(estado.error ?: "No se encontró la partida")

            else -> {
                Text(partida.nombre, style = MaterialTheme.typography.headlineMedium)
                if (partida.codigo.isNotBlank()) {
                    Text(
                        "Código ${partida.codigo}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
                Text(
                    if (partida.finalizada) "Finalizada" else "En curso · se actualiza sola",
                    style = MaterialTheme.typography.bodySmall
                )
                Spacer(Modifier.height(20.dp))
                Text("Jugadores", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))

                if (partida.participantes.isEmpty()) {
                    Text("Sin jugadores cargados.", style = MaterialTheme.typography.bodySmall)
                } else {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(partida.participantes) { participante ->
                            Card(Modifier.fillMaxWidth()) {
                                Text(
                                    participante.mostrar(nombresPorId),
                                    Modifier.padding(12.dp),
                                    style = MaterialTheme.typography.bodyLarge
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

/** Campo para entrar a una partida tipeando el codigo que compartieron. */
@Composable
fun BuscadorDeCodigo(onBuscar: (String) -> Unit, error: String?) {
    var codigo by remember { mutableStateOf("") }
    Column {
        Row(verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(
                value = codigo,
                onValueChange = { codigo = it.uppercase() },
                label = { Text("Código de partida") },
                singleLine = true,
                modifier = Modifier.weight(1f)
            )
            Spacer(Modifier.height(8.dp))
            TextButton(
                onClick = { onBuscar(codigo) },
                enabled = codigo.isNotBlank()
            ) { Text("Entrar") }
        }
        error?.let {
            Text(
                it,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
                textAlign = TextAlign.Start
            )
        }
    }
}
