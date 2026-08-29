package com.lce.cosmicapp.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.lce.cosmicapp.data.Jugador
import com.lce.cosmicapp.data.PartidaReciente
import com.lce.cosmicapp.ui.theme.Mono
import java.text.SimpleDateFormat
import java.util.Locale

private val formatoFechaFicha = SimpleDateFormat("dd/MM/yyyy", Locale("es", "AR"))

/**
 * Columnas de la Liga LCE, en el mismo orden que la web (estadisticasService).
 *
 * Ojo con las claves: en Firestore van sin tilde ni ñ (`campanas`, `pijon`),
 * aunque se muestren con ellas.
 */
private val COLUMNAS_LCE = listOf(
    "jugadas" to "Jug",
    "victorias" to "Vic",
    "colonias" to "Col",
    "copas" to "Copas",
    "podioCopas" to "Podio",
    "victoriasEspeciales" to "V.esp",
    "campanas" to "Camp",
    "ataqueSolitario" to "Atq",
    "defensaSolitaria" to "Def",
    "pijon" to "Pijón"
)

/** Nombre largo de cada columna, para la ficha del jugador. */
private val NOMBRES_LARGOS = mapOf(
    "jugadas" to "Partidas jugadas",
    "victorias" to "Victorias",
    "colonias" to "Colonias",
    "copas" to "Copas ganadas",
    "podioCopas" to "Podio de copas (pts)",
    "victoriasEspeciales" to "Victorias especiales",
    "campanas" to "Campañas",
    "ataqueSolitario" to "Ataque solitario",
    "defensaSolitaria" to "Defensa solitaria",
    "pijon" to "Pijón"
)

/**
 * Tabla histórica de la liga: todo lo que acumuló cada jugador desde siempre.
 *
 * Es ancha a propósito, así que scrollea en horizontal en vez de achicar los
 * números hasta que no se lean.
 */
@Composable
fun PantallaLigaLCE(
    jugadores: List<Jugador>,
    onVerJugador: (Jugador) -> Unit,
    modifier: Modifier = Modifier
) {
    val ordenados = jugadores.sortedByDescending { it.jugadas }
    val scrollHorizontal = rememberScrollState()

    Column(modifier.padding(16.dp)) {
        Text("Liga LCE", style = MaterialTheme.typography.headlineMedium)
        Text(
            "Histórico de toda la liga · tocá a alguien para ver su ficha",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(Modifier.height(16.dp))

        Column(Modifier.horizontalScroll(scrollHorizontal)) {
            Row(Modifier.padding(vertical = 8.dp)) {
                Text(
                    "Jugador",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.width(110.dp)
                )
                COLUMNAS_LCE.forEach { (_, etiqueta) ->
                    Text(
                        etiqueta,
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.width(56.dp)
                    )
                }
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outline)

            LazyColumn {
                items(ordenados, key = { it.id }) { jugador ->
                    Row(
                        Modifier
                            .clickable { onVerJugador(jugador) }
                            .padding(vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            jugador.nombre,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.width(110.dp)
                        )
                        COLUMNAS_LCE.forEach { (clave, _) ->
                            Text(
                                "${jugador.estadisticas[clave] ?: 0}",
                                style = MaterialTheme.typography.bodyMedium,
                                fontFamily = Mono,
                                modifier = Modifier.width(56.dp)
                            )
                        }
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                }
            }
        }
    }
}

/** Ficha de un jugador: sus estadísticas completas, con los nombres largos. */
@Composable
fun PantallaFichaJugador(
    jugador: Jugador,
    partidasRecientes: List<PartidaReciente>,
    aliensPorId: Map<String, String>,
    onVolver: () -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(modifier.padding(16.dp)) {
        item {
            TextButton(onClick = onVolver) { Text("← Volver") }
            Spacer(Modifier.height(8.dp))
            Text(jugador.nombre, style = MaterialTheme.typography.headlineLarge)
            Spacer(Modifier.height(16.dp))
        }

        item {
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    COLUMNAS_LCE.forEach { (clave, _) ->
                        Row(
                            Modifier.fillMaxWidth().padding(vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                NOMBRES_LARGOS[clave] ?: clave,
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.weight(1f)
                            )
                            Text(
                                "${jugador.estadisticas[clave] ?: 0}",
                                style = MaterialTheme.typography.titleMedium,
                                fontFamily = Mono
                            )
                        }
                    }
                }
            }
            Spacer(Modifier.height(24.dp))
            Text(
                "Últimas ${partidasRecientes.size} partidas",
                style = MaterialTheme.typography.titleMedium
            )
            Spacer(Modifier.height(8.dp))
            if (partidasRecientes.isEmpty()) {
                Text(
                    "Todavía no tiene partidas cargadas.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        items(partidasRecientes, key = { it.matchId }) { partida -> FilaPartidaReciente(partida, aliensPorId) }
    }
}

@Composable
private fun FilaPartidaReciente(partida: PartidaReciente, aliensPorId: Map<String, String>) {
    Card(
        Modifier.fillMaxWidth().padding(vertical = 4.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (partida.esGanador) MaterialTheme.colorScheme.primaryContainer
            else MaterialTheme.colorScheme.surface
        )
    ) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (partida.esGanador) Text("🏆 ", style = MaterialTheme.typography.bodyLarge)
                    Text(
                        if (partida.esGanador) "Victoria" else "Derrota",
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = if (partida.esGanador) FontWeight.Bold else FontWeight.Normal
                    )
                    if (partida.flags.contains("shared_victory")) {
                        Text(" · compartida 🤝", style = MaterialTheme.typography.bodySmall)
                    }
                }
                Text(
                    buildString {
                        partida.fecha?.let { append(formatoFechaFicha.format(it)); append(" · ") }
                        append("${partida.cantJugadores} jugadores")
                        partida.alienJugado?.let { append(" · 👽 ${aliensPorId[it] ?: it}") }
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    if (partida.puntos % 1.0 == 0.0) "${partida.puntos.toInt()} pts"
                    else String.format(Locale.US, "%.1f pts", partida.puntos),
                    style = MaterialTheme.typography.titleMedium,
                    fontFamily = Mono,
                    color = if (partida.esGanador) MaterialTheme.colorScheme.primary
                    else MaterialTheme.colorScheme.onSurface
                )
                Text(
                    "CI ${partida.coloniasInternas} · CE ${partida.coloniasExternas}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
