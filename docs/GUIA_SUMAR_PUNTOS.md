# 📊 Guía: Sistema de Carga de Puntos en Copas

## ✅ ¿QUÉ CAMBIÓ?

Se implementó un **nuevo sistema completo** para cargar puntos en partidas dentro de copas, con:

- ✅ Nueva vista "Sumar Puntos" dentro de cada copa
- ✅ Tabla con últimas 5 partidas
- ✅ Diferenciación de **jugadores que participaron vs. que NO participaron**
- ✅ Validación de límite de 10 partidas por copa
- ✅ Auditoría de cambios en carga de puntos
- ✅ Cálculo correcto de puntos con participación

---

## 🚀 CÓMO USAR

### **PASO 1: Ir a una Copa**

```
Copas → Seleccionar una copa → Botón "📊 Sumar Puntos"
```

### **PASO 2: Ver Últimas 5 Partidas**

La vista muestra:
- **Posición**: Número de partida en la copa (1-10)
- **Fecha**: Cuándo se jugó
- **Estado**: "⏳ Pendiente" o "✓ Cargada"
- **Acción**: Botón para cargar o editar puntos

### **PASO 3: Cargar Puntos de una Partida**

Al hacer click en "Cargar Puntos":

1. **Tabla de Jugadores** con columnas:
   - ¿Participó? (checkbox)
   - Colonias Internas (CI)
   - Colonias Externas (CE)
   - ¿Ganador? (checkbox)
   - Previsión de puntos

2. **Lógica de participación:**
   - ✅ Marcar ¿Participó? = el jugador suma puntos
   - ❌ Sin marcar = el jugador NO suma nada (queda excluido)
   - Si un jugador tiene CI o CE > 0 → se asume que participó

3. **Guardar** → Se calcula automáticamente y actualiza el ranking

---

## 🧮 CÁLCULO DE PUNTOS

### **Fórmula**

```
Para CADA JUGADOR QUE PARTICIPÓ:

Puntos Colonias = (CI × 1) + (CE × 2)
Puntos Victoria = total_participantes ÷ total_ganadores    (si ganó)

Puntos Totales = Puntos Colonias + Puntos Victoria
```

### **Ejemplo**

```
Partida con 5 jugadores participantes, 2 ganadores:

Juan:  CI=5, CE=2, Ganador=SÍ
  → Colonias = 5×1 + 2×2 = 9 puntos
  → Victoria = 5÷2 = 2.5 puntos
  → Total = 11.5 puntos

Carlos: CI=3, CE=0, Ganador=NO
  → Colonias = 3×1 + 0×2 = 3 puntos
  → Victoria = 0 puntos (no ganó)
  → Total = 3 puntos

María: NO PARTICIPÓ
  → Total = 0 puntos (completamente excluida)
```

---

## 📋 ESTRUCTURA DE DATOS EN FIREBASE

### **Colección: `copas`**

```json
{
  "id": "copa123",
  "nombre": "Copa Galáctico 2026",
  "partidas": [
    {
      "posicion": 1,
      "matchId": "match001",
      "fechaJuego": "2026-04-18T19:00:00Z",
      "estado": "cargada"
    },
    {
      "posicion": 2,
      "matchId": "match002",
      "fechaJuego": "2026-04-20T19:00:00Z",
      "estado": "pendiente"
    }
  ],
  "ranking": {
    "player1": {
      "nombreJugador": "Juan",
      "puntosTotales": 15.5,
      "participacionesPorPosicion": {
        "1": true,
        "2": false
      },
      "posicion": 1
    }
  }
}
```

**Notas:**
- `partidas` es un array estructurado con posición y estado
- `participacionesPorPosicion` registra en qué rondas participó cada jugador
- Máximo 10 partidas por copa (validado en `copaService`)

---

### **Colección: `matches`**

```json
{
  "id": "match001",
  "copId": "copa123",
  "posicion": 1,
  "nombre": "Partida 1 - Copa Galáctico",
  "fechaJuego": "2026-04-18T19:00:00Z",
  "estado": "finalizada",
  "jugadores": {
    "player1": {
      "nombre": "Juan",
      "coloniasInternas": 5,
      "coloniasExternas": 2,
      "esGanador": true,
      "participó": true,
      "puntos": {
        "colonias": 9,
        "victoria": 2.5,
        "total": 11.5
      }
    },
    "player2": {
      "nombre": "María",
      "coloniasInternas": 0,
      "coloniasExternas": 0,
      "esGanador": false,
      "participó": false,
      "puntos": {
        "colonias": 0,
        "victoria": 0,
        "total": 0
      }
    }
  },
  "resumen": {
    "totalParticipantes": 4,
    "totalGanadores": 2,
    "puntosVictoria": 2.0
  },
  "auditoria": {
    "cargadaPor": "admin_user_id",
    "fechaCarga": "2026-04-18T21:30:00Z"
  }
}
```

**Notas:**
- `participó: true` → el jugador cuenta en el cálculo
- `participó: false` → el jugador está registrado pero NO suma puntos
- `resumen` guarda el contexto de cálculo para futuras auditorías

---

## 🔧 FUNCIONES MODIFICADAS

### **`scoringService.js`**

**`procesarResultadosPartida(datosFormulario)`**
- **Entrada**: Objeto con datos de cada jugador (CI, CE, ganador, participó)
- **Salida**: `{ resultados, resumen }`
- **Cambio**: Diferencia participantes de no participantes

**`actualizarRankingCopaSeguro(copaId, posicion, matchId, jugadoresConPuntos)`**
- **Nueva función** para actualizar ranking con auditoría
- Valida que no haya duplicados en posición
- Registra participación por posición
- Suma puntos SOLO si participó = true

### **`copaService.js`**

**`agregarPartida(copaId, matchId, fechaJuego)`**
- **Mejorada** para asignar posición automática
- Valida límite de 10 partidas
- Actualiza el match con posición y copId

---

## 🎯 CASOS DE USO

### **Caso 1: Cargar puntos de primera partida**

```
1. Ir a Copa → Sumar Puntos
2. Ver "Partida #1 - Pendiente"
3. Click en "Cargar Puntos"
4. Marcar quién participó
5. Ingresar colonias y ganador
6. Guardar → Actualiza ranking automáticamente
```

### **Caso 2: Editar puntos de partida ya cargada**

```
1. Ir a Copa → Sumar Puntos
2. Ver "Partida #1 - Cargada"
3. Click en "Editar Puntos"
4. Modificar datos
5. Guardar → Recalcula ranking
```

### **Caso 3: Validar que jugador NO participa en posición 2**

```
1. Cargar Partida 1: Juan participa ✓
2. Cargar Partida 2: Juan NO participa ✗
   → En ranking: participacionesPorPosicion = { "1": true, "2": false }
   → Juan NO suma puntos de Partida 2
```

---

## ⚠️ VALIDACIONES Y RESTRICCIONES

| Validación | Qué hace | Dónde |
|-----------|---------|-------|
| Máx 10 partidas | Error si intentas agregar partida 11 | `copaService.agregarPartida()` |
| Mínimo 1 participante | Error si cargas partida sin participantes | `CargaPuntosForm` |
| Mínimo 1 ganador | Error si nadie es ganador | `CargaPuntosForm` |
| Participación explícita | Solo suma si `participó = true` | `procesarResultadosPartida()` |
| Posición única | No se permite 2 partidas en posición 1 | `copaService.agregarPartida()` |

---

## 📝 CHECKLIST DE IMPLEMENTACIÓN

- [x] Función `procesarResultadosPartida()` mejorada
- [x] Nueva función `actualizarRankingCopaSeguro()`
- [x] Componente `CargaPuntosForm.jsx` creado
- [x] Página `copas/[id]/sumarPuntos/page.js` creada
- [x] Validación de 10 partidas máximo
- [x] Botón "Sumar Puntos" en RankingCopa
- [x] Actualización de hook `useMatch`

---

## 🚨 PRÓXIMAS MEJORAS (Opcional)

1. **Cloud Functions** para cálculo de puntos (actualmente en cliente)
2. **Historial detallado** de ediciones con valores anteriores
3. **Exportar ranking** a CSV/PDF
4. **Notifications** cuando se carga una partida
5. **Modo batch** para cargar múltiples partidas a la vez

---

## 🆘 TROUBLESHOOTING

### Problema: "Esta copa ya tiene el máximo de 10 partidas"
**Solución**: La copa llegó a 10 partidas. Crea una nueva copa o finaliza la actual.

### Problema: Puntos no se sumaron correctamente
**Solución**: Verifica que el jugador tenga `participó = true` en el formulario.

### Problema: No veo botón "Sumar Puntos"
**Solución**: Actualiza la página o recarga. El botón debe estar en la vista de ranking de la copa.

### Problema: Ranking no se actualiza después de cargar puntos
**Solución**: Espera 2-3 segundos y recarga la página. Firestore puede tomar un momento.

---

**Versión**: 1.0  
**Fecha**: 18 de abril de 2026  
**Estado**: ✅ Implementado
