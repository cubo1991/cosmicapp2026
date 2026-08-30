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

**Subcolección** `players/{id}/lastMatches` — últimas partidas para el ranking global (ver `rankingService.ts` y `docs/RANKING_GLOBAL.md`). Desde el multi-liga (`docs/PLAN_MULTI_LIGA.md`) cada doc lleva también `ligaId`.

**`ligas`** (array de ids): a qué ligas pertenece el jugador. Solo lo escribe la Cloud Function de alta (`agregarMiembroALiga`/`unirseALigaPorCodigo`) o un admin — las reglas bloquean que un jugador se auto-agregue.

**Subcolección** `players/{id}/ligaStats/{ligaId}` (nueva, multi-liga): un doc por cada liga en la que participó, con la misma forma que `stats`/`estadisticas`/`last10Score`/`last3Score` de arriba pero acotada a esa liga. **Todavía convive** con los campos planos de la raíz — la Cloud Function escribe en los dos lugares a la vez (ver Fase 2 del plan) porque ningún lector (web ni Android) migró todavía a leer de acá. Los campos planos se borran recién cuando eso pase (Fase 6, pendiente).

---

### `matches`

| Campo | Tipo | Notas |
|---|---|---|
| `codigo` | string | 6 chars, alfabeto sin `0/O` ni `1/I` |
| `estado` | string | `'activa'` \| `'finalizada'` |
| `fechaCreacion` | Timestamp | |
| `sessionId` | string | Agrupa partidas consecutivas (ver abajo) |
| `jugadores` | **map \| array** | ⚠️ **dos formatos** (ver abajo) |
| `copId` | string? | Copa asociada. **Ojo: se llama `copId`, no `copaId`** |
| `asociarACopa` | boolean | Default `true`. En `false` la partida no suma a la copa |

#### ⚠️ Landmine 1 — `jugadores` tiene dos formatos

`matchService.ts` soporta ambos y hay documentos viejos con el formato legacy:

- **Nuevo (map)**: `{ [playerId]: { nombre, coloniasInternas, coloniasExternas, esGanador, puntos, posicion } }`. El `nombre` suele venir **vacío**: hay que resolver la clave contra `players`. Al finalizar se le agregan `participó` (con tilde) y `puntos` pasa a ser un objeto `{ colonias, victoria, total }`.
- **Legacy (array)**: `[{ nombre, color, playerId, aliens }]`. ⚠️ **Los visitantes tienen `playerId: null`** y solo traen `nombre`; si filtrás por `playerId` los perdés a todos. Hay partidas reales compuestas enteramente por visitantes.

El código web hace `Array.isArray(m.jugadores) ? ... : Object.keys(...)` en cada lectura. Android **tiene que hacer lo mismo** — un `data class` que asuma un solo formato va a explotar contra los documentos viejos. Opciones: deserializador custom, o una migración previa que normalice todo a map (preferible, y conviene hacerla antes de escribir el cliente Kotlin).

#### Landmine 2 — `sessionId`

Se calcula al crear la partida: si hay una partida de las últimas 4 horas con ≥50% de jugadores en común, se reutiliza su `sessionId`; si no, se genera `ses_<timestamp>`. La heurística vive en `detectOrCreateSession()` en `matchService.ts`. Si Android crea partidas (Etapa 2 del plan), **debe** aplicar la misma regla o las sesiones se van a fragmentar. Es otro argumento para mover la creación a Cloud Functions.

---

### `copas`

Ciclos de 10 partidas con `ranking` embebido. Ciclo de vida en `activeCopaService.ts`: al finalizar la partida 10 se adjudica ganador y se abre la copa siguiente automáticamente.

### `ligas`

Redefinida por el multi-liga (`docs/PLAN_MULTI_LIGA.md`, Fase 1-4). Campos reales:

| Campo | Tipo | Notas |
|---|---|---|
| `nombre` / `descripcion` / `estado` | string | |
| `miembros` | array\<playerId\> | Alta manual: la hace un admin (buscando el nombre) o la propia persona con `codigoInvitacion`. Bloqueado para cualquier otro por reglas. |
| `miembrosUid` | array\<uid\> | Espejo de `miembros` con el uid de Auth de quien ya reclamó su jugador — lo necesitan las reglas para chequear pertenencia sin poder hacer una query. |
| `codigoInvitacion` | string | 6 caracteres, mismo generador que el código de partida. |

Cada `copa` y cada `match` llevan un `ligaId` que los ata a una de estas — ver más abajo.

**`ranking`/`partidas` embebidos**: existían en el diseño original de `ligas` (un sistema de puntaje paralelo al de `copas`) pero **nunca estuvieron conectados a `finalizarPartida`**, la Cloud Function real. Las funciones que los escribían (`ligaService.agregarPartida`, `ligaService.actualizarRanking`, `scoringService.actualizarRankingLiga`) se sacaron en la Fase 6 del multi-liga por estar muertas. El ranking real por liga vive en `players/{id}/ligaStats/{ligaId}` (ver arriba). Puede quedar data vieja en `ranking`/`partidas` de antes de la limpieza; no se borró, solo se dejó de escribir.

### `snapshots`

Copias de `estadisticas` para el botón de reset del admin. Fuera del alcance móvil.

---

## Identidad de jugador

`players` tiene un campo **`uid`** (string, **opcional**) que ata un jugador a una cuenta de Firebase Auth. Los jugadores históricos —los sembrados por `copaSeederService`, que existen solo con nombre— no lo tienen, y son justamente los reclamables.

Flujo de vinculación (historia A2 del plan Android):

1. En el primer login, se listan los jugadores **sin `uid`**.
2. La persona elige el suyo y se escribe el `uid` en ese documento.
3. No se crea ni se fusiona nada: el jugador histórico gana una cuenta, y su historial de partidas, copas y estadísticas queda intacto.
4. Un jugador con `uid` ya no aparece como reclamable.

**El invariante lo sostienen las reglas de Firestore, no la interfaz**, así que web y Android no pueden divergir de forma peligrosa: solo se puede reclamar un jugador sin `uid`, solo para uno mismo, nunca desde una sesión anónima, y sin tocar ningún otro campo en la misma escritura. Un `uid` ya asignado solo lo puede cambiar un admin, para deshacer una vinculación equivocada.

Está verificado con ocho casos contra el emulador: `npm run test:rules`. Si tocás estas reglas, corré esa suite.

> Ojo: la web sigue usando **sesión anónima** para todos los jugadores; el login con Google existe solo para `/admin`. Por eso la interfaz de vinculación vive por ahora solo en Android. El campo y las reglas ya son compartidos, así que si algún día la web suma login de jugadores, no hay que migrar nada.

Aparte de esto, `playerService.emailExists()` sigue existiendo y se usa al crear jugadores desde el admin.

---

## Pendientes de definición

- [ ] Normalizar `jugadores` a un solo formato (migración) — desbloquea el modelado limpio en Kotlin.
- [x] Agregar `uid` a `players` + flujo de reclamo (reglas y servicios compartidos; interfaz en Android).
- [x] Mover la lógica de scoring y el ciclo de copas a Cloud Functions (`finalizarPartida`, `crearPartida`). Ningún cliente calcula puntos ni toca copas.
- [ ] Cerrar las reglas de `matches` y `copas` ahora que los clientes no necesitan escribirlas: hoy el camino único es por convención, no por candado. Requiere auditar qué escrituras directas quedan en el admin (borrado, carga masiva, semillas).
- [ ] Tipar el dominio en el lado web a partir de este documento.
- [ ] Multi-liga (`docs/PLAN_MULTI_LIGA.md`): migrar los lectores (ranking, panel admin) a `ligaStats` y recién ahí borrar los campos planos de `players`. Selector de liga y suscripción FCM por tópico en Android.
