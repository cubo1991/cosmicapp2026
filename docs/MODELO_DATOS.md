# 📐 Modelo de datos — fuente canónica

**Para qué sirve este documento**: es la definición compartida de las colecciones de Firestore. Web (TypeScript) y Android (Kotlin) escriben sobre los *mismos* documentos, así que cualquier cambio de esquema se anota acá primero y después se aplica en las dos plataformas. Si este documento y el código discrepan, el bug está en el código.

**Estado**: relevado del código el 18/08/2026, antes de arrancar la app Android.

---

## ⚠️ Estado actual: el esquema no está tipado en ningún lado

La migración a TypeScript tipó las *firmas* de los servicios, pero **no el dominio**. El único tipo exportado en todo `src/` es:

```ts
// src/firebase/db.ts
export type FirestoreDoc = { id: string } & Record<string, any>;
```

Es decir: hoy no existe un `Player`, `Match` ni `Copa` como tipo. Los campos se conocen solo leyendo los servicios. Para la web es incómodo; para Android es un riesgo real, porque las `data class` de Kotlin **sí** son estrictas y van a fallar en runtime ante un campo que la web escribe distinto de lo esperado.

Este documento existe para cerrar ese hueco. Idealmente, más adelante, tipar también el lado web a partir de acá.

---

## Colecciones

### `players`

| Campo | Tipo | Notas |
|---|---|---|
| `name` | string | Nombre visible |
| `email` | string | **Es la identidad de facto** (ver §Identidad) |
| `avatar` | string | Puede ser `''` |
| `createdAt` | Timestamp | `serverTimestamp()` |
| `stats` | map | Automático: `{ partidas, victorias, puntosPromedio, ultimaPartida }` |
| `estadisticas` | map | Histórico LCE (ver abajo) |
| `copas` | array | Ids de copas |
| `ligas` | array | Ids de ligas |

**`estadisticas`** (todos number, default 0):
`jugadas`, `victorias`, `colonias`, `victoriasEspeciales`, `campanas`, `copas`, `podioCopas`, `ataqueSolitario`, `defensaSolitaria`, `pijon`

> ⚠️ Ojo con las claves **sin tilde ni ñ**: en la base son `campanas` y `pijon`. El README las menciona como "campañas" y "pijón" — eso es solo la etiqueta visible. Kotlin debe usar las claves reales.

**Subcolección** `players/{id}/lastMatches` — últimas partidas para el ranking global (ver `rankingService.ts` y `docs/RANKING_GLOBAL.md`).

---

### `matches`

| Campo | Tipo | Notas |
|---|---|---|
| `codigo` | string | 6 chars, alfabeto sin `0/O` ni `1/I` |
| `estado` | string | `'activa'` \| `'finalizada'` |
| `fechaCreacion` | Timestamp | |
| `sessionId` | string | Agrupa partidas consecutivas (ver abajo) |
| `jugadores` | **map \| array** | ⚠️ **dos formatos** (ver abajo) |
| `copaId` | string? | Copa activa al momento de crearse |

#### ⚠️ Landmine 1 — `jugadores` tiene dos formatos

`matchService.ts` soporta ambos y hay documentos viejos con el formato legacy:

- **Nuevo (map)**: `{ [playerId]: { coloniasInternas, coloniasExternas, ... } }`
- **Legacy (array)**: `[{ nombre, color, playerId, aliens }]`

El código web hace `Array.isArray(m.jugadores) ? ... : Object.keys(...)` en cada lectura. Android **tiene que hacer lo mismo** — un `data class` que asuma un solo formato va a explotar contra los documentos viejos. Opciones: deserializador custom, o una migración previa que normalice todo a map (preferible, y conviene hacerla antes de escribir el cliente Kotlin).

#### Landmine 2 — `sessionId`

Se calcula al crear la partida: si hay una partida de las últimas 4 horas con ≥50% de jugadores en común, se reutiliza su `sessionId`; si no, se genera `ses_<timestamp>`. La heurística vive en `detectOrCreateSession()` en `matchService.ts`. Si Android crea partidas (Etapa 2 del plan), **debe** aplicar la misma regla o las sesiones se van a fragmentar. Es otro argumento para mover la creación a Cloud Functions.

---

### `copas`

Ciclos de 10 partidas con `ranking` embebido. Ciclo de vida en `activeCopaService.ts`: al finalizar la partida 10 se adjudica ganador y se abre la copa siguiente automáticamente.

### `ligas`

Ligas con `ranking` embebido. Fuera del alcance móvil según el plan.

### `snapshots`

Copias de `estadisticas` para el botón de reset del admin. Fuera del alcance móvil.

---

## Identidad de jugador

Hoy **no se guarda el `uid` de Firebase Auth en `players`**. La asociación se hace por `email` (`playerService.emailExists()`), y los jugadores históricos sembrados por `copaSeederService` existen solo con nombre.

Esto es justamente lo que resuelve la historia A2 del plan Android (vincular la cuenta de Google con el jugador histórico). La propuesta:

1. Agregar un campo `uid` (string, opcional) a `players`.
2. En el primer login, listar los jugadores **sin `uid`** y dejar que la persona reclame el suyo.
3. Al reclamar, escribir el `uid` en ese documento. No se crea ni se fusiona nada: el jugador histórico gana una cuenta.
4. Un jugador con `uid` ya no aparece como reclamable.

Es un cambio aditivo (campo opcional), así que no rompe la web. **Conviene implementarlo en la web también**, para que ambas plataformas usen el mismo criterio.

---

## Pendientes de definición

- [ ] Normalizar `jugadores` a un solo formato (migración) — desbloquea el modelado limpio en Kotlin.
- [ ] Agregar `uid` a `players` + flujo de reclamo, en web y Android.
- [ ] Decidir si la lógica de scoring se mueve a Cloud Functions (ver §2.2 del plan) — de eso depende cuánto de este modelo necesita el cliente Android.
- [ ] Tipar el dominio en el lado web a partir de este documento.
