package com.lce.cosmicapp.ui.theme

import androidx.compose.ui.graphics.Color


/**
 * Paleta de la LCE, traducida de globals.css de la web para que la app y el
 * sitio se vean como la misma cosa. Si allá cambian los colores, se cambian acá.
 */

// Espacio profundo: los fondos.
val CosmicFondo = Color(0xFF09060F)
val CosmicSuperficie = Color(0xFF110D1E)
val CosmicSuperficie2 = Color(0xFF1A1330)
val CosmicSuperficie3 = Color(0xFF231A40)

// Dorado: el acento principal, el de Cosmic Encounter.
val CosmicDorado = Color(0xFFC8992A)
val CosmicDoradoAlto = Color(0xFFE8C547)

// Turquesa y púrpura: los acentos de apoyo.
val CosmicTurquesa = Color(0xFF26C6C3)
val CosmicPurpura = Color(0xFFA855F7)

// Texto: blanco cálido, no blanco puro, para que no queme sobre el fondo negro.
val CosmicTexto = Color(0xFFF0E8D6)
val CosmicApagado = Color(0xFF8A7A9A)
val CosmicTenue = Color(0xFF4A3A5A)

val CosmicError = Color(0xFFFF6B6B)

/** Podio: oro, plata y bronce para los tres primeros de cualquier tabla. */
val PodioColores = listOf(
    Color(0xFFE8C547),
    Color(0xFFC0C6D0),
    Color(0xFFCD7F32)
)
