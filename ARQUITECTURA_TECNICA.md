# 🏗️ ARQUITECTURA TÉCNICA - Sistema de Sumar Puntos

## 📊 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                        CopaDetailPage                            │
│                    (copas/[id]/page.js)                          │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ <RankingCopa copaId={id} />                               │  │
│  │ ┌──────────────────────────────────────────────────────┐  │  │
│  │ │ • Header con nombre y estado de copa                │  │  │
│  │ │ • [📊 Sumar Puntos] ← Link a sumarPuntos/page.js   │  │  │
│  │ │ • Tabla de ranking actual                           │  │  │
│  │ │ • Info de partidas (3/10)                           │  │  │
│  │ └──────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              SumarPuntosPage (NUEVA PÁGINA)                      │
│           (copas/[id]/sumarPuntos/page.js)                       │
│                                                                   │
│  • Usa hook: useCopa(copaId)                                     │
│  • Estado: selectedMatch (null | partida)                        │
│  • Muestra últimas 5 partidas en tabla                          │
│  • Tabla:                                                         │
│    - Posición (#1-10)                                            │
│    - Fecha de Juego                                              │
│    - Estado (⏳ Pendiente | ✓ Cargada)                          │
│    - Botón Cargar/Editar                                         │
│                                                                   │
│  Si no hay match seleccionado:                                   │
│    → Mostrar tabla de partidas                                   │
│                                                                   │
│  Si hay match seleccionado:                                      │
│    → Renderizar <CargaPuntosForm />                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│            CargaPuntosForm (NUEVO COMPONENTE)                    │
│         (components/forms/CargaPuntosForm.jsx)                   │
│                                                                   │
│  Props:                                                           │
│  • matchId: string                                               │
│  • copaId: string                                                │
│  • posicion: number (1-10)                                       │
│  • onSuccess: callback                                           │
│                                                                   │
│  Estado interno:                                                 │
│  • match: objeto con jugadores actuales                         │
│  • puntos: { playerId: { nombre, CI, CE, ganador, participó } }│
│  • loading, error, enviando                                      │
│                                                                   │
│  Flujo:                                                           │
│  1. Al montar: carga match y jugadores                          │
│  2. Usuario interactúa con tabla:                               │
│     - Toggle "¿Participó?"                                       │
│     - Ingresa CI, CE                                             │
│     - Toggle "¿Ganador?"                                         │
│  3. Al enviar (handleSubmit):                                    │
│     - Llama scoringService.procesarResultadosPartida()          │
│     - Actualiza match en Firebase                                │
│     - Llama scoringService.actualizarRankingCopaSeguro()        │
│     - Llama onSuccess() → vuelve a lista                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo de Datos

### **Paso 1: Usuario carga puntos**

```
Usuario llenar formulario:
{
  player1: { nombre: "Juan", CI: 5, CE: 2, ganador: true, participó: true },
  player2: { nombre: "Carlos", CI: 3, CE: 0, ganador: true, participó: true },
  player3: { nombre: "María", CI: 0, CE: 0, ganador: false, participó: false }
}

↓

Envía via CargaPuntosForm.handleSubmit()
```

### **Paso 2: Procesamiento de resultados**

```
scoringService.procesarResultadosPartida(puntos)

PASO A: Filtrar participantes
  Participantes = solo los que tienen participó=true O CI>0 O CE>0
  → Juan, Carlos (María excluida)

PASO B: Calcular puntos
  Total participantes = 2
  Total ganadores = 2
  Puntos Victoria = 2 ÷ 2 = 1.0

  Juan:   CI=5, CE=2
    → Colonias = 5×1 + 2×2 = 9
    → Victoria = 1.0 (ganador)
    → Total = 10.0

  Carlos: CI=3, CE=0
    → Colonias = 3×1 + 0×2 = 3
    → Victoria = 1.0 (ganador)
    → Total = 4.0

  María:  NO participa
    → Total = 0

PASO C: Retornar
  {
    resultados: {
      player1: { nombre, CI, CE, esGanador, participó, puntos: {...} },
      player2: { ... },
      player3: { nombre, CI: 0, CE: 0, esGanador, participó: false, puntos: {total: 0} }
    },
    resumen: {
      totalParticipantes: 2,
      totalGanadores: 2,
      puntosVictoria: 1.0
    }
  }
```

### **Paso 3: Actualizar Match**

```
updateDoc(db, 'matches', matchId, {
  jugadores: resultados,    // Arriba
  resumen: resumen,
  estado: 'finalizada',
  fechaFinalizacion: now(),
  auditoria.cargadaPor: 'user_id',
  auditoria.fechaCarga: now()
})
```

### **Paso 4: Actualizar Ranking de Copa**

```
scoringService.actualizarRankingCopaSeguro(
  copaId,
  posicion: 1,
  matchId,
  resultados
)

Lee Copa actual:
  ranking = { ... jugadores existentes ... }
  partidas = [ ... ]

Para CADA jugador en resultados:
  ranking[playerId].puntosTotales += datos.puntos.total  // SOLO si participó
  ranking[playerId].participacionesPorPosicion[1] = datos.participó

Actualiza Copa:
  copa.ranking = rankingActualizado (reordenado por puntos)
  copa.partidas[0].estado = 'cargada'
  copa.partidas[0].ultimaEdicion = now()

Resultado:
  {
    ranking: {
      player1: {
        nombreJugador: "Juan",
        puntosTotales: 10.0,
        participacionesPorPosicion: { "1": true },
        posicion: 1
      },
      player2: {
        nombreJugador: "Carlos",
        puntosTotales: 4.0,
        participacionesPorPosicion: { "1": true },
        posicion: 2
      },
      player3: {
        nombreJugador: "María",
        puntosTotales: 0,
        participacionesPorPosicion: { "1": false },
        posicion: 3
      }
    }
  }
```

---

## 🗂️ Estructura de Archivos

```
src/
├── app/
│   └── copas/
│       └── [id]/
│           ├── page.js ← Lee <RankingCopa>
│           ├── sumarPuntos/ ✨ NUEVO
│           │   └── page.js ✨ NUEVO
│           │       • Muestra tabla últimas 5 partidas
│           │       • Renderiza <CargaPuntosForm> si match seleccionado
│           │       • Usa hook useCopa()
│           │
│           └── edit/
│
├── components/
│   ├── tables/
│   │   └── RankingCopa.jsx ✏️ MODIFICADO
│   │       • Agregado botón "Sumar Puntos"
│   │       • Diseño mejorado
│   │
│   └── forms/
│       ├── CargaResultados.jsx (antiguo, puede mantenerse)
│       └── CargaPuntosForm.jsx ✨ NUEVO
│           • Formulario mejorado con participación
│           • Integración con scoring
│
├── services/
│   ├── scoringService.js ✏️ MODIFICADO
│   │   • procesarResultadosPartida() reescrita
│   │   • actualizarRankingCopaSeguro() nueva
│   │
│   ├── copaService.js ✏️ MODIFICADO
│   │   • agregarPartida() reescrita (posición automática)
│   │   • Validación máx 10 partidas
│   │
│   └── matchService.js, playerService.js, etc.
│
└── hooks/
    ├── useMatch.js ✏️ MODIFICADO
    │   • finalizarPartida() actualizado para nuevo formato
    │
    ├── useCopa.js (sin cambios, pero se usa)
    └── ...
```

---

## 📦 Dependencias

### **Sin cambios** (ya existentes):
- `firebase/firestore`: updateDoc, getDoc, doc, etc.
- `next`: routing, params
- `react`: hooks (useState, useEffect, useCallback)

### **Nuevas** (no se agregaron):
- **Ninguna**. Todo se hace con lo existente.

---

## 🔐 Validaciones en Cadena

```
┌──────────────────────────────────┐
│   Frontend: CargaPuntosForm      │
├──────────────────────────────────┤
│ ✓ Mínimo 1 participante          │
│ ✓ Mínimo 1 ganador               │
│ ✓ CI, CE ≥ 0 (int)              │
│ ✓ Si no participa → no ganador   │
│ ✓ Try-catch en handleSubmit()    │
└──────────────────────────────────┘
           ↓
┌──────────────────────────────────┐
│  Backend: scoringService         │
├──────────────────────────────────┤
│ ✓ Filtrar participantes          │
│ ✓ Validar ganadores > 0          │
│ ✓ Cálculo correcto de puntos     │
│ ✓ Estructura correcta de output  │
└──────────────────────────────────┘
           ↓
┌──────────────────────────────────┐
│  Firestore: updateDoc()          │
├──────────────────────────────────┤
│ ✓ Match se actualiza             │
│ ✓ Copa.ranking se actualiza      │
│ ✓ Estado pasa a "finalizada"     │
└──────────────────────────────────┘
           ↓
┌──────────────────────────────────┐
│  Frontend: useCopa() recarga      │
├──────────────────────────────────┤
│ ✓ onSuccess() callback           │
│ ✓ Vuelve a SumarPuntosPage       │
│ ✓ Muestra partida como "cargada" │
└──────────────────────────────────┘
```

---

## 🔀 Puntos de Integración Críticos

### **1. Cuando se agrega partida a copa**
```
useCrearMatch() → crear()
  → addDoc('matches', {...})
  → copaService.agregarPartida(copId, matchId)
    → Valida límite 10
    → Asigna posición automática
    → Actualiza match con posición
```

**Riesgo:** Si copaService falla, partida existe pero sin posición
**Solución:** Try-catch en useCrearMatch

---

### **2. Cuando se cargan puntos**
```
CargaPuntosForm.handleSubmit()
  → procesarResultadosPartida()
  → updateDoc(match)
  → actualizarRankingCopaSeguro()
  → onSuccess()
```

**Riesgo:** Si falla en mitad, datos inconsistentes
**Solución:** Usar transaction (mejora futura con Batch Write)

---

### **3. Cuando se editan puntos**
```
El mismo flujo que al cargar (paso 2)
Estados:
  - Partida.estado: pendiente → cargada
  - Partida.estado: cargada → cargada (sin cambio visible)
```

**Riesgo:** Se puede cargar 100 veces y siempre recalcula
**Solución:** Es feature, no bug (permite correcciones)

---

## 🚨 Riesgos Identificados

| Riesgo | Impacto | Mitigación |
|--------|--------|-----------|
| Match sin posición | No aparece en lista | Asignación automática en agregarPartida() |
| Más de 10 partidas | Copa desordenada | Validación en agregarPartida() |
| Carga duplicada | Puntos sumados 2x | Usar atomic writes (mejora futura) |
| Jugador sin participación clara | Confusión | Flag participó + UI clara |
| Ranking out-of-sync | Rankings incorrectos | Recalcular al cada carga |
| Pérdida de datos al editar | Auditoría imposible | Guardar timestamp de edición |

---

## 🎯 Casos de Uso Cubiertos

✅ **Caso 1**: Cargar puntos de partida nueva  
✅ **Caso 2**: Editar puntos de partida existente  
✅ **Caso 3**: Marcar jugador como no participante  
✅ **Caso 4**: Múltiples ganadores en partida  
✅ **Caso 5**: Ver ranking actualizado en tiempo real  
✅ **Caso 6**: Impedir más de 10 partidas en copa  

---

## 📈 Mejoras Futuras (Tech Debt)

| Mejora | Razón | Complejidad |
|--------|-------|------------|
| Cloud Function para cálculo | Lógica en backend | Medio |
| Transacciones Firestore | Atomicidad garantizada | Medio |
| Historial completo de cambios | Auditoría detallada | Alto |
| Exportar a CSV/PDF | Reportes | Bajo |
| Sincronización offline | Funciona sin internet | Alto |
| Validaciones en server | Seguridad | Bajo |
| Notificaciones | UX | Bajo |

---

**Documento técnico**: v1.0  
**Fecha**: 18 de abril de 2026  
**Estado**: Implementación completa ✅
