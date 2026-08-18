# ❓ FAQ - Preguntas Frecuentes

## Preguntas sobre la Funcionalidad

### P1: ¿Cómo se diferencia un jugador que "no participó" de uno que "participó"?

**R:** Hay dos formas:
1. **Explícita**: Desmarcar el checkbox "¿Participó?"
2. **Implícita**: Si tiene 0 en CI y 0 en CE, se detecta como no participante

Una vez marcado "No participó":
- CI y CE se deshabilitan (no puedes ingresar datos)
- No aparece como ganador
- **No suma puntos**
- Pero **sigue registrado** en la partida para auditoría

---

### P2: ¿Qué pasa si cargo una partida mal y quiero editarla?

**R:** Puedes editar en cualquier momento:
1. Ve a Copa → "Sumar Puntos"
2. Busca la partida (estado "✓ Cargada")
3. Click en "✏️ Editar Puntos"
4. Modifica los datos que quieras
5. Guardar

El ranking se **recalcula automáticamente**.

---

### P3: ¿Puedo tener 2 ganadores en una partida?

**R:** **Sí, claro.** La fórmula soporta múltiples ganadores:

```
Si 5 jugadores participan y 2 son ganadores:
Puntos Victoria = 5 ÷ 2 = 2.5 puntos cada ganador
```

Si 5 participan y 5 son ganadores:
```
Puntos Victoria = 5 ÷ 5 = 1 punto cada ganador
```

---

### P4: ¿Qué significa "Posición" en las partidas?

**R:** Es el **número de ronda de la copa**:
- Posición 1 = Primera partida de la copa
- Posición 2 = Segunda partida de la copa
- ... hasta Posición 10 (máximo)

Cada copa tiene máximo 10 posiciones. Se asignan **automáticamente** en orden.

---

### P5: ¿Puedo jugar con 1 solo jugador?

**R:** **No.** El formulario requiere:
- Mínimo 1 participante (pero sensiblemente sería 2+)
- Mínimo 1 ganador

Si intentas guardar sin cumplir estas reglas, te saldrá error.

---

### P6: Si un jugador no participó en partida 1, ¿puede participar en partida 2?

**R:** **Sí.** No hay restricción automática. El sistema registra:
```json
participacionesPorPosicion: {
  "1": false,  // No participó
  "2": true    // Participó después
}
```

Esto permite auditar, pero **no impide** que participe después.

---

### P7: ¿A quién no participa le doy 0 puntos o simplemente no lo incluyo?

**R:** **Ni una ni la otra.** Lo correcto es:
- Marcar "No participó" en el checkbox
- Sus CI y CE quedan en 0
- No suma nada
- Queda registrado en la auditoría

**Nunca** le asignes 0 puntos manualmente si no participó.

---

### P8: ¿Puedo ver el historial de quién cargó los puntos?

**R:** **Actualmente:** La auditoría registra `cargadaPor` y `fechaCarga`, pero solo el último cambio.

**Mejora futura:** Guardar historial completo de ediciones con valores anteriores.

---

## Preguntas sobre Datos

### P9: ¿Dónde se guardan los puntos después de cargar?

**R:** En dos lugares:

**1. En `matches` (partida específica):**
```json
{
  "jugadores": {
    "player1": {
      "puntos": {
        "colonias": 9,
        "victoria": 2.5,
        "total": 11.5
      }
    }
  }
}
```

**2. En `copas` (ranking acumulado):**
```json
{
  "ranking": {
    "player1": {
      "puntosTotales": 11.5,
      "participacionesPorPosicion": {"1": true}
    }
  }
}
```

---

### P10: ¿Se actualizan las estadísticas del jugador?

**R:** **Sí**, se actualiza el documento del jugador en `players`:
```json
{
  "stats": {
    "partidas": 5,
    "victorias": 2,
    "puntosPromedio": 8.3,
    "ultimaPartida": "2026-04-18T21:30:00Z"
  }
}
```

Pero **solo si participó** (participó = true).

---

### P11: ¿Qué datos veo en el ranking de la copa?

**R:** En cada jugador ves:
- **Posición**: Ranking (1, 2, 3...)
- **Nombre**: Del jugador
- **Partidas**: Cuántas participó
- **Puntos Totales**: Suma acumulada

---

### P12: ¿Se puede descargar el ranking?

**R:** **Actualmente:** No. Solo puedes ver la tabla en pantalla.

**Mejora futura:** Agregar botón para exportar a CSV o PDF.

---

## Preguntas sobre Errores

### P13: Recibo error "Debe haber al menos un ganador"

**R:** Significa que **nadie está marcado como ganador**. 

**Solución:**
- Abre el formulario
- Marca al menos 1 jugador como "¿Ganador?" ✓
- Guarda de nuevo

---

### P14: Recibo error "Esta copa ya tiene el máximo de 10 partidas"

**R:** Legiste a 10 partidas en esa copa (límite máximo).

**Opciones:**
- Crear una nueva copa
- O esperar a que la actual finalice

---

### P15: El ranking no se actualiza después de guardar

**R:** Puede ser:
1. **Delay de Firestore**: Espera 2-3 segundos
2. **Reload necesario**: Actualiza la página (F5)
3. **Datos inconsistentes**: Verifica que `participó = true` en el jugador

---

### P16: No veo el botón "Sumar Puntos"

**R:** Puede ser:
1. Estás en una copa pero en vista de edición, no ranking
2. La página no cargó bien

**Solución:** Ve a Copas → Selecciona copa → Deberías ver el botón "📊 Sumar Puntos"

---

## Preguntas Técnicas

### P17: ¿Qué validaciones se hacen en el formulario?

**R:** Las principales:
- ✅ Mínimo 1 participante
- ✅ Mínimo 1 ganador
- ✅ CI y CE deben ser números positivos
- ✅ Si no participa, no puede ser ganador
- ✅ Los valores se capan en 0-20

---

### P18: ¿Cómo se calcula el ranking general de un jugador en todas las copas?

**R:** **Actualmente:** Cada copa tiene su propio ranking independiente.

Las estadísticas generales del jugador (`players.stats`) suman TODAS sus partidas (copas + ligas).

---

### P19: ¿Puedo hacer cargas en lote de múltiples partidas?

**R:** **Actualmente:** No. Debes hacerlo partida por partida.

**Mejora futura:** Agregar modo batch para cargar varias a la vez.

---

### P20: ¿Se guardan copias de seguridad?

**R:** **Sí**. Firestore guarda:
- Todos los documentos del match con sus cambios
- Metadata de cuándo se hizo cada cambio
- El registro en `auditoria.fechaCarga`

---

## Preguntas sobre Mejoras

### P21: ¿Cuándo se agregará historial completo de ediciones?

**R:** Es una mejora planificada. Actualmente solo se guarda última carga.

Deberías registrar manualmente si haces cambios importantes.

---

### P22: ¿Habrá notificaciones cuando se carguen puntos?

**R:** No está implementado aún. Es mejora futura.

---

### P23: ¿Se puede hacer backup de los datos?

**R:** **Sí**. Firestore tiene panel de administración en Firebase Console donde puedes:
- Exportar datos
- Ver auditoría
- Hacer backups manuales

---

### P24: ¿Qué diferencia hay entre copas y ligas?

**R:** **Copas** (Torneos):
- Máx 10 partidas
- Rankings independientes
- Sistema de posiciones (1-10)
- Foco en competición

**Ligas** (Temporadas):
- Sin límite de partidas
- Rankings separados
- Mejor para competiciones largas
- Enfoque en regularidad

El sistema de "Sumar Puntos" es específico para **Copas**.

---

### P25: ¿Puedo usar este sistema en ligas?

**R:** **Actualmente:** La página está específicamente para copas (`copas/[id]/sumarPuntos`).

**Mejora futura:** Crear funcionalidad similar para ligas.

---

## Resumen Rápido

| Pregunta | Respuesta |
|----------|----------|
| ¿Cómo cargo puntos? | Copa → Sumar Puntos → Seleccionar partida |
| ¿Máximo de partidas? | 10 por copa |
| ¿Pasan datos si no participa? | No, se excluye completamente |
| ¿Se puede editar? | Sí, múltiples veces |
| ¿Dónde se guardan? | En `matches` y `copas.ranking` |
| ¿Se actualiza automáticamente? | Sí, al guardar |
| ¿Se puede ver historial? | Solo última carga (mejora futura) |
| ¿Qué pasa si hay error? | Mensaje claro indicando qué arreglar |

---

**Última actualización**: 18 de abril de 2026  
**¿Tienes otra pregunta?** Contacta al equipo de desarrollo
