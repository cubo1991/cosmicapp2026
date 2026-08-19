package com.lce.cosmicapp.ui

import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lce.cosmicapp.ui.theme.Mono
import com.lce.cosmicapp.data.Alien
import com.lce.cosmicapp.data.Jugador

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
    puedeCargar: Boolean,
    mensajeExito: String?,
    onCargar: () -> Unit,
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

                // El código es lo que se dicta en voz alta en la mesa: grande,
                // monoespaciado y en dorado, con espacio entre caracteres para
                // que no se confunda ninguno.
                if (partida.codigo.isNotBlank()) {
                    Spacer(Modifier.height(12.dp))
                    Card(
                        Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.primaryContainer
                        )
                    ) {
                        Column(
                            Modifier.fillMaxWidth().padding(vertical = 16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                "CÓDIGO",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                partida.codigo,
                                style = MaterialTheme.typography.displayLarge,
                                fontFamily = Mono,
                                letterSpacing = 6.sp,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                    Spacer(Modifier.height(8.dp))

                    // Historia B3: compartir el código por WhatsApp o lo que sea.
                    // Es el selector de compartir del sistema, no una integración.
                    val contexto = LocalContext.current
                    OutlinedButton(
                        onClick = {
                            val texto =
                                "Entrá a la partida de Cosmic con el código ${partida.codigo}"
                            contexto.startActivity(
                                Intent.createChooser(
                                    Intent(Intent.ACTION_SEND).apply {
                                        type = "text/plain"
                                        putExtra(Intent.EXTRA_TEXT, texto)
                                    },
                                    "Compartir código"
                                )
                            )
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Compartir código")
                    }
                    Spacer(Modifier.height(8.dp))
                }
                Text(
                    if (partida.finalizada) "Finalizada" else "En curso · se actualiza sola",
                    style = MaterialTheme.typography.bodySmall
                )

                mensajeExito?.let {
                    Spacer(Modifier.height(12.dp))
                    Card(Modifier.fillMaxWidth()) {
                        Text(it, Modifier.padding(12.dp))
                    }
                }

                // Cargar resultados es cosa de admin. Sobre una partida ya
                // finalizada sirve para corregir una carga con errores: la
                // function resta lo que habia sumado antes en vez de duplicarlo.
                if (puedeCargar) {
                    Spacer(Modifier.height(16.dp))
                    Button(onClick = onCargar, modifier = Modifier.fillMaxWidth()) {
                        Text(
                            if (partida.finalizada) "Corregir resultados"
                            else "Cargar resultados"
                        )
                    }
                    if (partida.finalizada) {
                        Text(
                            "Vuelve a calcular los puntos de esta partida y ajusta la copa.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

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

/**
 * Carga de resultados de una partida.
 *
 * No muestra los puntos calculados a medida que se escribe: la formula vive en
 * la Cloud Function y duplicarla acá para una vista previa volveria a crear dos
 * versiones que pueden divergir. Los puntos llegan en la respuesta.
 */
@Composable
fun PantallaCargarResultados(
    estado: EstadoCarga,
    onEditar: (String, (FilaCarga) -> FilaCarga) -> Unit,
    onGuardar: () -> Unit,
    onCancelar: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier.padding(16.dp)) {
        TextButton(onClick = onCancelar, enabled = !estado.guardando) { Text("← Cancelar") }
        Spacer(Modifier.height(8.dp))
        Text("Cargar resultados", style = MaterialTheme.typography.headlineMedium)
        Text(
            "Colonias internas y externas de cada jugador.",
            style = MaterialTheme.typography.bodySmall
        )
        Spacer(Modifier.height(16.dp))

        LazyColumn(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(estado.filas, key = { it.clave }) { fila ->
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                fila.nombre,
                                style = MaterialTheme.typography.titleMedium,
                                modifier = Modifier.weight(1f)
                            )
                            Text("Jugó", style = MaterialTheme.typography.bodySmall)
                            Switch(
                                checked = fila.participa,
                                onCheckedChange = { valor ->
                                    onEditar(fila.clave) {
                                        // Al marcar que no jugó se limpia todo, igual que en la web.
                                        if (valor) it.copy(participa = true)
                                        else it.copy(participa = false, ci = 0, ce = 0, ganador = false)
                                    }
                                }
                            )
                        }

                        if (fila.participa) {
                            Spacer(Modifier.height(8.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                ContadorColonias(
                                    etiqueta = "Internas",
                                    valor = fila.ci,
                                    onCambio = { v -> onEditar(fila.clave) { it.copy(ci = v) } }
                                )
                                Spacer(Modifier.width(16.dp))
                                ContadorColonias(
                                    etiqueta = "Externas",
                                    valor = fila.ce,
                                    onCambio = { v -> onEditar(fila.clave) { it.copy(ce = v) } }
                                )
                            }
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Checkbox(
                                    checked = fila.ganador,
                                    onCheckedChange = { v ->
                                        onEditar(fila.clave) { it.copy(ganador = v) }
                                    }
                                )
                                Text("Ganó la partida")
                            }
                        }
                    }
                }
            }
        }

        estado.error?.let {
            Spacer(Modifier.height(8.dp))
            Text(it, color = MaterialTheme.colorScheme.error)
        }

        Spacer(Modifier.height(12.dp))
        Button(
            onClick = onGuardar,
            enabled = !estado.guardando,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(if (estado.guardando) "Guardando..." else "Guardar resultados")
        }
    }
}

@Composable
private fun ContadorColonias(etiqueta: String, valor: Int, onCambio: (Int) -> Unit) {
    Column {
        Text(etiqueta, style = MaterialTheme.typography.bodySmall)
        Row(verticalAlignment = Alignment.CenterVertically) {
            OutlinedButton(
                onClick = { onCambio((valor - 1).coerceAtLeast(0)) },
                contentPadding = PaddingValues(0.dp),
                modifier = Modifier.size(40.dp)
            ) { Text("−") }
            Text(
                "$valor",
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.padding(horizontal = 12.dp)
            )
            OutlinedButton(
                onClick = { onCambio(valor + 1) },
                contentPadding = PaddingValues(0.dp),
                modifier = Modifier.size(40.dp)
            ) { Text("+") }
        }
    }
}

/**
 * Nueva partida: nombre, quienes juegan y si suma a la copa.
 *
 * La casilla de copa importa: con ella marcada, la partida ocupa una de las 10
 * posiciones del ciclo y puede llegar a cerrarlo. Desmarcada sirve para jugar
 * sueltos o para probar sin ensuciar la copa en curso.
 */
@Composable
fun PantallaNuevaPartida(
    estado: EstadoCreacion,
    onEditar: ((EstadoCreacion) -> EstadoCreacion) -> Unit,
    onCrear: () -> Unit,
    onCancelar: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier.padding(16.dp)) {
        TextButton(onClick = onCancelar, enabled = !estado.creando) { Text("← Cancelar") }
        Spacer(Modifier.height(8.dp))
        Text("Nueva partida", style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.height(16.dp))

        OutlinedTextField(
            value = estado.nombre,
            onValueChange = { nuevo -> onEditar { it.copy(nombre = nuevo) } },
            label = { Text("Nombre (opcional)") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(Modifier.height(12.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Switch(
                checked = estado.sumaALaCopa,
                onCheckedChange = { valor -> onEditar { it.copy(sumaALaCopa = valor) } }
            )
            Spacer(Modifier.width(8.dp))
            Column {
                Text("Suma a la copa")
                Text(
                    if (estado.sumaALaCopa) "Ocupa una posición del ciclo de 10"
                    else "Partida suelta, no toca la copa",
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }

        Spacer(Modifier.height(16.dp))
        Text("¿Quiénes juegan?", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))

        if (estado.cargando) {
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }

        LazyColumn(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            items(estado.candidatos, key = { it.id }) { jugador ->
                val elegido = jugador.id in estado.seleccionados
                Card(Modifier.fillMaxWidth()) {
                    Row(
                        Modifier.fillMaxWidth().padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = elegido,
                            onCheckedChange = { marcar ->
                                onEditar {
                                    it.copy(
                                        seleccionados = if (marcar) it.seleccionados + jugador.id
                                        else it.seleccionados - jugador.id
                                    )
                                }
                            }
                        )
                        Text(jugador.nombre, style = MaterialTheme.typography.bodyLarge)
                    }
                }
            }
        }

        estado.error?.let {
            Spacer(Modifier.height(8.dp))
            Text(it, color = MaterialTheme.colorScheme.error)
        }

        Spacer(Modifier.height(12.dp))
        Button(
            onClick = onCrear,
            enabled = !estado.creando,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                if (estado.creando) "Creando..."
                else "Crear partida (${estado.seleccionados.size})"
            )
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
