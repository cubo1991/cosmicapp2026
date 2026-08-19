package com.lce.cosmicapp.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.lce.cosmicapp.ui.theme.Mono
import com.lce.cosmicapp.ui.theme.PodioColores
import com.lce.cosmicapp.data.Copa
import com.lce.cosmicapp.data.Jugador
import com.lce.cosmicapp.data.Partida
import com.lce.cosmicapp.data.Puesto
import java.text.SimpleDateFormat
import java.util.Locale

private val formatoFecha = SimpleDateFormat("dd/MM/yyyy", Locale("es", "AR"))

/** Un ciclo de copa son 10 partidas; ver activeCopaService en la web. */
private const val PARTIDAS_POR_COPA = 10

@Composable
fun PantallaCopa(copa: Copa?, modifier: Modifier = Modifier) {
    if (copa == null) {
        Aviso("No hay ninguna copa en curso.", modifier)
        return
    }
    Column(modifier.padding(16.dp)) {
        Text(copa.nombre, style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.height(4.dp))
        Text(
            "Partida ${copa.partidasJugadas} de $PARTIDAS_POR_COPA",
            style = MaterialTheme.typography.bodyMedium
        )
        Spacer(Modifier.height(8.dp))
        LinearProgressIndicator(
            progress = { copa.partidasJugadas.toFloat() / PARTIDAS_POR_COPA },
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(20.dp))
        TablaDePuestos(copa.tabla)
    }
}

@Composable
fun PantallaRanking(ranking: List<Puesto>, modifier: Modifier = Modifier) {
    if (ranking.isEmpty()) {
        Aviso("Todavía no hay puntos cargados.", modifier)
        return
    }
    Column(modifier.padding(16.dp)) {
        Text("Ranking global", style = MaterialTheme.typography.headlineMedium)
        Text(
            "Suma de las últimas 10 partidas",
            style = MaterialTheme.typography.bodySmall
        )
        Spacer(Modifier.height(16.dp))
        TablaDePuestos(ranking)
    }
}

@Composable
fun PantallaPartidas(
    partidas: List<Partida>,
    errorCodigo: String?,
    onBuscarCodigo: (String) -> Unit,
    onNuevaPartida: () -> Unit,
    onAbrir: (Partida) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier.padding(16.dp)) {
        Text("Partidas", style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.height(12.dp))
        BuscadorDeCodigo(onBuscar = onBuscarCodigo, error = errorCodigo)
        Spacer(Modifier.height(12.dp))

        OutlinedButton(onClick = onNuevaPartida, modifier = Modifier.fillMaxWidth()) {
            Text("➕  Nueva partida")
        }
        Spacer(Modifier.height(16.dp))

        if (partidas.isEmpty()) {
            Text("Todavía no hay partidas.", style = MaterialTheme.typography.bodyMedium)
            return@Column
        }

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(partidas, key = { it.id }) { partida ->
                Card(
                    Modifier.fillMaxWidth().clickable { onAbrir(partida) }
                ) {
                    Column(Modifier.padding(12.dp)) {
                        Text(partida.nombre, style = MaterialTheme.typography.titleMedium)
                        Text(
                            buildString {
                                append(if (partida.finalizada) "Finalizada" else "En curso")
                                append(" · ${partida.cantidadJugadores} jugadores")
                                partida.fecha?.let { append(" · ${formatoFecha.format(it)}") }
                            },
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun PantallaPerfil(
    jugador: Jugador,
    copasCerradas: List<Copa>,
    onSalir: () -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(modifier.padding(16.dp)) {
        item {
            Text(jugador.nombre, style = MaterialTheme.typography.headlineMedium)
            Spacer(Modifier.height(16.dp))
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    Dato("Partidas jugadas", jugador.jugadas)
                    Dato("Victorias", jugador.victorias)
                    Dato("Copas ganadas", jugador.copas)
                }
            }
            Spacer(Modifier.height(24.dp))
            Text("Copas cerradas", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(8.dp))
        }

        if (copasCerradas.isEmpty()) {
            item { Text("Ninguna todavía.", style = MaterialTheme.typography.bodySmall) }
        } else {
            items(copasCerradas, key = { it.id }) { copa ->
                Column(Modifier.padding(vertical = 6.dp)) {
                    Text(copa.nombre, style = MaterialTheme.typography.bodyLarge)
                    Text(
                        copa.tabla.firstOrNull()?.let { "Ganó ${it.nombre}" } ?: "Sin ganador",
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }

        item {
            Spacer(Modifier.height(24.dp))
            TextButton(onClick = onSalir) { Text("Cerrar sesión") }
        }
    }
}

@Composable
private fun TablaDePuestos(puestos: List<Puesto>) {
    LazyColumn {
        itemsIndexed(puestos) { indice, puesto ->
            // Los tres primeros se destacan con oro, plata y bronce; el resto
            // queda apagado para que el podio se lea de un vistazo en la mesa.
            val colorPuesto = PodioColores.getOrNull(indice)
                ?: MaterialTheme.colorScheme.onSurfaceVariant
            val enPodio = indice < PodioColores.size

            Row(
                Modifier.fillMaxWidth().padding(vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "${indice + 1}",
                    style = MaterialTheme.typography.titleMedium,
                    fontFamily = Mono,
                    color = colorPuesto,
                    modifier = Modifier.width(36.dp)
                )
                Text(
                    puesto.nombre,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = if (enPodio) FontWeight.Bold else FontWeight.Normal,
                    modifier = Modifier.weight(1f)
                )
                Text(
                    // Los puntos son enteros salvo empates raros; mostramos sin
                    // decimales cuando no hacen falta.
                    if (puesto.puntos % 1.0 == 0.0) "${puesto.puntos.toInt()}"
                    else String.format(Locale.US, "%.1f", puesto.puntos),
                    style = MaterialTheme.typography.titleMedium,
                    fontFamily = Mono,
                    color = if (enPodio) colorPuesto else MaterialTheme.colorScheme.onSurface
                )
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
        }
    }
}

@Composable
private fun Dato(etiqueta: String, valor: Long) {
    Row(Modifier.fillMaxWidth().padding(vertical = 2.dp)) {
        Text(etiqueta, Modifier.weight(1f))
        Text("$valor", fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun Aviso(texto: String, modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(texto, style = MaterialTheme.typography.bodyLarge)
    }
}

@Composable
fun Cargando(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}
