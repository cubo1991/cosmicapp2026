package com.lce.cosmicapp.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * Tipografía.
 *
 * La web usa Bebas Neue, Exo 2 y Space Mono. Acá se usan las del sistema con el
 * mismo tratamiento —títulos anchos de interletrado, cuerpo normal, monoespaciada
 * para códigos y puntajes— porque las descargables de Google Play necesitan un
 * array de certificados que el artefacto no incluye, y empaquetar los .ttf era
 * más peso del que justifica.
 *
 * ponytail: si algún día se quiere la tipografía exacta de la web, se bajan los
 * tres .ttf a res/font y se cambian estas tres familias. Nada más.
 */
private val Cuerpo = FontFamily.SansSerif

/** Para códigos de partida y puntajes: ancho fijo, se lee sin ambigüedad. */
val Mono = FontFamily.Monospace

val Typography = Typography(
    // Los títulos van con mucho interletrado, que es lo que da el aire de
    // ciencia ficción de la web aunque la familia sea la del sistema.
    displayLarge = TextStyle(
        fontFamily = Cuerpo, fontWeight = FontWeight.Black,
        fontSize = 40.sp, lineHeight = 46.sp, letterSpacing = 2.sp
    ),
    headlineLarge = TextStyle(
        fontFamily = Cuerpo, fontWeight = FontWeight.Black,
        fontSize = 32.sp, lineHeight = 38.sp, letterSpacing = 1.5.sp
    ),
    headlineMedium = TextStyle(
        fontFamily = Cuerpo, fontWeight = FontWeight.Bold,
        fontSize = 26.sp, lineHeight = 32.sp, letterSpacing = 1.2.sp
    ),
    titleLarge = TextStyle(
        fontFamily = Cuerpo, fontWeight = FontWeight.Bold, fontSize = 20.sp, lineHeight = 26.sp
    ),
    titleMedium = TextStyle(
        fontFamily = Cuerpo, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, lineHeight = 22.sp
    ),
    bodyLarge = TextStyle(
        fontFamily = Cuerpo, fontSize = 16.sp, lineHeight = 24.sp
    ),
    bodyMedium = TextStyle(
        fontFamily = Cuerpo, fontSize = 14.sp, lineHeight = 20.sp
    ),
    bodySmall = TextStyle(
        fontFamily = Cuerpo, fontSize = 12.sp, lineHeight = 16.sp, letterSpacing = 0.4.sp
    ),
    labelLarge = TextStyle(
        fontFamily = Cuerpo, fontWeight = FontWeight.Bold, fontSize = 14.sp, letterSpacing = 0.8.sp
    ),
    labelMedium = TextStyle(
        fontFamily = Cuerpo, fontWeight = FontWeight.Medium, fontSize = 12.sp, letterSpacing = 0.5.sp
    )
)
