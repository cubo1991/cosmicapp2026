package com.lce.cosmicapp.ui.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

/**
 * Tema de la app.
 *
 * Siempre oscuro y siempre esta paleta: la identidad de la liga es el fondo
 * negro violáceo con dorado, y un tema claro o los colores dinámicos de
 * Android 12 la romperían. Es una decisión de marca, no un olvido.
 */
private val EsquemaCosmico = darkColorScheme(
    primary = CosmicDorado,
    onPrimary = CosmicFondo,
    primaryContainer = CosmicSuperficie3,
    onPrimaryContainer = CosmicDoradoAlto,

    secondary = CosmicTurquesa,
    onSecondary = CosmicFondo,

    tertiary = CosmicPurpura,
    onTertiary = CosmicFondo,

    background = CosmicFondo,
    onBackground = CosmicTexto,

    surface = CosmicSuperficie,
    onSurface = CosmicTexto,
    surfaceVariant = CosmicSuperficie2,
    onSurfaceVariant = CosmicApagado,

    outline = CosmicTenue,
    outlineVariant = CosmicSuperficie3,

    error = CosmicError,
    onError = CosmicFondo
)

@Composable
fun CosmicAppTheme(content: @Composable () -> Unit) {
    val vista = LocalView.current
    if (!vista.isInEditMode) {
        SideEffect {
            // Iconos claros en la barra de estado: el fondo siempre es oscuro.
            val ventana = (vista.context as Activity).window
            WindowCompat.getInsetsController(ventana, vista)
                .isAppearanceLightStatusBars = false
        }
    }

    MaterialTheme(
        colorScheme = EsquemaCosmico,
        typography = Typography,
        content = content
    )
}
