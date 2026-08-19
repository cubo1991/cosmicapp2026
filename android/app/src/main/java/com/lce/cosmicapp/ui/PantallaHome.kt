package com.lce.cosmicapp.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lce.cosmicapp.data.Copa
import com.lce.cosmicapp.data.Jugador
import com.lce.cosmicapp.data.Partida
import com.lce.cosmicapp.data.PartidaDetalle
import com.lce.cosmicapp.data.Puesto
import com.lce.cosmicapp.ui.theme.Mono
import com.lce.cosmicapp.ui.theme.PodioColores
import java.util.Locale

/** Un ciclo de copa son 10 partidas. */
private const val PARTIDAS_POR_COPA = 10

/**
 * Pantalla de entrada: dónde está parada la liga y qué podés hacer ahora.
 *
 * Responde tres preguntas en el orden en que importan al abrir la app: cómo va
 * la copa y dónde estoy yo, qué hago ahora, y —si soy admin— qué me falta cargar.
 */
@Composable
fun PantallaHome(
    jugador: Jugador,
    copa: Copa?,
    rankingGlobal: List<Puesto>,
    partidas: List<Partida>,
    esAdmin: Boolean,
    miPartida: PartidaDetalle?,
    onElegirAlien: () -> Unit,
    onNuevaPartida: () -> Unit,
    onIrAPartidas: () -> Unit,
    onAbrirPartida: (Partida) -> Unit,
    modifier: Modifier = Modifier
) {
    val sinCargar = partidas.filter { !it.finalizada }

    LazyColumn(
        modifier.padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Column {
                Text(
                    "Hola, ${jugador.nombre}",
                    style = MaterialTheme.typography.headlineLarge
                )
                Text(
                    "Liga Cosmic Encounter",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        // Lo primero de todo si hay algo pendiente: en la mesa nadie empieza
        // hasta que cada uno sepa con qué alien juega.
        if (miPartida != null && miPartida.miAlienElegido(jugador.id) == null &&
            miPartida.misAliens(jugador.id).isNotEmpty()
        ) {
            item { AvisoElegirAlien(onElegirAlien) }
        }

        item { TarjetaCopa(copa, jugador) }

        item { TarjetaRankingGlobal(rankingGlobal, jugador) }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Button(onClick = onNuevaPartida, modifier = Modifier.weight(1f)) {
                    Text("Nueva partida")
                }
                OutlinedButton(onClick = onIrAPartidas, modifier = Modifier.weight(1f)) {
                    Text("Entrar con código")
                }
            }
        }

        // Lo único que ve un admin y un jugador común no: qué queda por cargar.
        if (esAdmin) {
            item { PanelAdmin(sinCargar, onAbrirPartida) }
        }
    }
}

/** Te faltan elegir alien: sin esto la partida no queda registrada del todo. */
@Composable
private fun AvisoElegirAlien(onElegir: () -> Unit) {
    Card(
        Modifier.fillMaxWidth().clickable { onElegir() },
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("👽", style = MaterialTheme.typography.headlineMedium)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    "Te tocaron tus aliens",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.primary
                )
                Text(
                    "Elegí con cuál vas a jugar",
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            Text("→", style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.primary)
        }
    }
}

@Composable
private fun TarjetaCopa(copa: Copa?, jugador: Jugador) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            if (copa == null) {
                Text("No hay ninguna copa en curso", style = MaterialTheme.typography.titleMedium)
                return@Column
            }

            Text(copa.nombre, style = MaterialTheme.typography.headlineMedium)
            Text(
                "Partida ${copa.partidasJugadas} de $PARTIDAS_POR_COPA",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { copa.partidasJugadas.toFloat() / PARTIDAS_POR_COPA },
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(16.dp))
            MiPosicion(copa.tabla, jugador, "en la copa")
        }
    }
}

@Composable
private fun TarjetaRankingGlobal(ranking: List<Puesto>, jugador: Jugador) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Text("Ranking global", style = MaterialTheme.typography.titleMedium)
            Text(
                "Suma de tus últimas 10 partidas",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(12.dp))
            MiPosicion(ranking, jugador, "en el ranking")
        }
    }
}

/** Dónde estás en una tabla. Se busca por id, no por nombre. */
@Composable
private fun MiPosicion(tabla: List<Puesto>, jugador: Jugador, donde: String) {
    val indice = tabla.indexOfFirst { it.playerId == jugador.id }
    if (indice < 0) {
        Text(
            "Todavía no sumaste puntos $donde",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        return
    }

    val puesto = tabla[indice]
    val color = PodioColores.getOrNull(indice) ?: MaterialTheme.colorScheme.onSurface

    Row(verticalAlignment = Alignment.Bottom) {
        Text(
            "${indice + 1}º",
            style = MaterialTheme.typography.displayLarge,
            fontFamily = Mono,
            color = color
        )
        Spacer(Modifier.width(12.dp))
        Column(Modifier.padding(bottom = 6.dp)) {
            Text(
                "de ${tabla.size}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                "${formatearPuntos(puesto.puntos)} pts",
                style = MaterialTheme.typography.titleMedium,
                fontFamily = Mono
            )
        }
    }
}

/**
 * Lo que distingue a un admin: la lista de lo que falta cargar.
 *
 * A un jugador común esta tarjeta no le aparece, porque no puede hacer nada con
 * ella. El permiso de verdad lo aplica la Cloud Function; esto es la interfaz.
 */
@Composable
private fun PanelAdmin(sinCargar: List<Partida>, onAbrir: (Partida) -> Unit) {
    Card(
        Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "MODO ADMIN",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary,
                    letterSpacing = 2.sp
                )
            }
            Spacer(Modifier.height(4.dp))

            if (sinCargar.isEmpty()) {
                Text(
                    "No hay partidas pendientes de cargar.",
                    style = MaterialTheme.typography.bodyMedium
                )
                return@Column
            }

            Text(
                "${sinCargar.size} partida${if (sinCargar.size == 1) "" else "s"} sin resultados",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(12.dp))

            sinCargar.forEach { partida ->
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clickable { onAbrir(partida) }
                        .padding(vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(partida.nombre, style = MaterialTheme.typography.bodyLarge)
                        Text(
                            "${partida.cantidadJugadores} jugadores",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Text(
                        "Cargar →",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

/** Sin decimales cuando no hacen falta, que es casi siempre. */
fun formatearPuntos(puntos: Double): String =
    if (puntos % 1.0 == 0.0) "${puntos.toInt()}"
    else String.format(Locale.US, "%.1f", puntos)
