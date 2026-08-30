# 🌐 Roadmap: Multi-liga (Opción B) — CosmicApp 2026

**Estado**: Fases 1-5 implementadas en código; Fase 6 parcial (a propósito). Solo la Fase 1 (migración de datos) está desplegada en producción — Fases 2 a 5 existen en el repo pero falta `firebase deploy`.
**Fecha**: 30/08/2026
**Alcance**: Firestore, Cloud Functions (`functions/index.js`), web (`src/`) y Android (hereda los cambios de Cloud Functions, necesita UI propia).

---

## 0. Objetivo y decisiones ya tomadas

Hoy todo es global: una sola colección `players`, una sola copa activa, un solo tópico de notificaciones (ver auditoría en la conversación que originó este documento). La meta es que cada **liga** sea una burbuja: su propio ciclo de copas, su propio ranking, sus propias estadísticas y sus propios avisos — sin tocar a las demás.

Se aprovecha el modelo que ya existe a medio construir (`ligas` con `miembros`, campo `ligaId` en `matches`, campo `players.ligas` ya reservado pero sin usar) en vez de armar un esquema nuevo desde cero. Ver `docs/MODELO_DATOS.md` para el estado actual de las colecciones.

**Decisiones de producto, confirmadas por David (30/08/2026):**
- El alta a una liga la hace el **administrador**, a mano: busca un jugador existente por nombre y lo agrega, o usa un código/link de invitación. No hay alta pública auto-servicio.
- Una persona **puede estar en más de una liga** a la vez.
- Todos los jugadores existentes hoy (reclamados o no) quedan, en la migración, como miembros de **"Liga 1"** — la liga actual de la LCE.

**Decisión técnica derivada (importante, no la pidió David explícitamente pero la implica lo anterior):**
Como una persona puede estar en varias ligas, las estadísticas (`stats`, `estadisticas`, `last10Score`, `last3Score`) **no pueden seguir siendo un campo plano en `players`** — hoy son un contador único global, y si un jugador juega en dos ligas se mezclarían. Pasan a vivir en una subcolección `players/{id}/ligaStats/{ligaId}`, una entrada por cada liga en la que participó. Es el cambio de esquema más grande de este plan; todo lo demás son consecuencias de él.

---

## 1. Modelo de datos nuevo

### `ligas/{ligaId}` (se redefine; hoy tiene un `ranking`/`partidas` embebido que se abandona, ver §7)

| Campo | Tipo | Notas |
|---|---|---|
| `nombre` | string | ya existe |
| `descripcion` | string | ya existe |
| `estado` | string | ya existe (`activa`/`finalizada`/`planificada`) |
| `miembros` | array\<playerId\> | ya existe, se sigue usando |
| `miembrosUid` | array\<uid\> | **nuevo**. Espejo de `miembros` pero con el `uid` de Auth de cada uno. Existe solo para que las reglas de Firestore puedan chequear pertenencia sin hacer una query (las rules solo pueden leer documentos por id conocido, no filtrar). Se mantiene en el mismo escritura que toca `miembros`. |
| `codigoInvitacion` | string | **nuevo**. 6 caracteres, mismo generador que `matches.codigo` (`functions/index.js:234`). Se regenera si el admin lo pide. |
| `creadaPor` | string (uid admin) | nuevo, para auditoría |
| ~~`ranking`~~ / ~~`partidas`~~ | — | se dejan de escribir (ver §7) |

### `players/{id}`

Sin cambios en los campos existentes. Se empieza a usar de verdad el campo `ligas: array<ligaId>` que ya existe reservado (`playerService.ts:40`) pero que hoy nadie llena ni lee. Debe quedar sincronizado con `ligas.miembros` (una liga con el playerId adentro ⇒ el playerId tiene esa liga en su array, y viceversa).

Se **eliminan** de la raíz del documento (se migran a la subcolección nueva, ver abajo): `stats`, `estadisticas`, `last10Score`, `last3Score`.

### `players/{id}/ligaStats/{ligaId}` (nueva subcolección)

| Campo | Tipo | Notas |
|---|---|---|
| `stats` | map | igual forma que la actual `stats` (`partidas`, `victorias`, `puntosPromedio`, `ultimaPartida`) pero acotada a esta liga |
| `estadisticas` | map | igual forma que la actual `estadisticas` (`jugadas`, `victorias`, `colonias`, `copas`, `podioCopas`, etc.) acotada a esta liga |
| `last10Score` / `last3Score` | number | igual que hoy, calculado solo con partidas de esta liga |

### `players/{id}/lastMatches/{matchId}`

Se agrega `ligaId` a cada documento (hoy no lo tiene). Es lo que permite que `actualizarLast10Score` calcule el `last10Score` **por liga** en vez de sobre todo el historial del jugador.

### `copas/{id}`

Se agrega `ligaId` (obligatorio de acá en adelante). Deja de existir "la copa activa" global: pasa a ser "la copa activa de tal liga". `crearNuevaCopa` siembra el ranking inicial solo con los miembros de esa liga (`ligas.miembros`), no con todos los `players` de la base (hoy lo hace mal, `functions/index.js:295-304`).

### `matches/{id}`

`ligaId` ya existe como campo opcional (`functions/index.js:135`) — pasa a ser **obligatorio**. Todo el resto de la lógica de partida (sesión, aliens, código) no cambia.

---

## 2. Fases

### Fase 1 — Migración de datos existentes a "Liga 1"

Objetivo: que el día que se activen los cambios, nada de lo que ya existe se rompa ni pierda historial.

- [x] Script de migración: `functions/scripts/migrar-liga1.js` (`ejecutarMigracion(db, { aplicar })`, dry-run por defecto, idempotente — correrlo dos veces no duplica nada).
- [x] Crea (o confirma) `ligas/liga1` con `nombre: "LCE"`, `estado: activa`, `codigoInvitacion` generado.
- [x] `miembros`: todos los `players` existentes (reclamados y sin reclamar, vía `arrayUnion`). `miembrosUid`: los que ya tienen `uid`.
- [x] Escribe `players/{id}.ligas` incluyendo `'liga1'` (`arrayUnion`, no pisa otras ligas si ya las tuviera).
- [x] Copia `stats`/`estadisticas`/`last10Score`/`last3Score` de cada jugador a `players/{id}/ligaStats/liga1`. **No borra** los campos planos de `players` — eso es la Fase 6, después de validar en producción.
- [x] Backfill `ligaId: 'liga1'` en `copas`, `matches` y `players/{id}/lastMatches/{matchId}` que no tengan ya un `ligaId` propio (si ya tienen uno, no se toca — para no pisar datos de otra liga si ya existieran).
- [x] Test contra el emulador: `functions/scripts/test-migrar-liga1.js` (`npm run test:migrar-liga1`) — 6 casos, incluyendo dry-run, idempotencia y no-pisar-`ligaId`-ajeno. **Corridos y en verde**, contra el emulador únicamente.
- [x] **Aplicado en producción (30/08/2026)**: backup previo vía export de Firestore, dry-run revisado (9 jugadores, 1 copa, 234 partidas, 194 `lastMatches`), y `--apply` confirmado por David. Verificado post-migración: `ligas/liga1` con 9 miembros (3 con `uid`), código de invitación generado, y `ligaStats/liga1` de un jugador de muestra con las estadísticas históricas intactas.

### Fase 2 — Cloud Functions: scoping por `ligaId` — ✅ hecho (30/08/2026)

Todo en `functions/index.js`. Dos decisiones tomadas al implementar, distintas de lo que decía este documento originalmente:

1. **`ligaId` quedó opcional, no obligatorio.** Hacerlo obligatorio hoy rompería `crearPartida` para la web/Android actuales (todavía no tienen selector de liga — eso es la Fase 5) y para los flujos de admin que ya mandan `ligaId: null` a propósito (`bulkMatchService.ts`, `AdminGenerarPartidas.tsx`). En su lugar: `const liga = ligaId || 'liga1'` (constante `LIGA_POR_DEFECTO`). Se puede endurecer a obligatorio recién cuando la Fase 5 esté lista y no queden clientes mandando `null`.
2. **Dual-write de estadísticas.** `estadisticas`/`stats`/`last10Score`/`last3Score` se siguen escribiendo en la raíz de `players` (para no romper `rankingService.ts` y compañía, que hoy leen de ahí) **y además** en `players/{id}/ligaStats/{ligaId}` (la fuente nueva). Mientras haya una sola liga real (liga1) ambos valores coinciden exactamente. El día que exista una segunda liga, la raíz de `players` va a mezclar la última liga que escribió — se resuelve recién cuando la Fase 5/6 corte los clientes a leer de `ligaStats` y se deje de escribir la raíz.

- [x] `crearPartida`: default a `LIGA_POR_DEFECTO` si no mandan `ligaId`.
- [x] `obtenerOCrearCopaActiva(ligaId)` / `crearNuevaCopa(ligaId)`: filtran `where('ligaId','==',ligaId).where('estado','==','activa')` (equality-only, no necesitó índice compuesto nuevo), y siembran el ranking inicial leyendo `ligas/{ligaId}.miembros` en vez de todos los `players`.
- [x] `agregarPartidaACopa(matchId, ligaId)`.
- [x] `actualizarRankingCopa`/`cerrarCopaConGanador` reciben `ligaId` y hacen dual-write del podio (`estadisticas.podioCopas`/`copas`) a `players` y a `ligaStats/{ligaId}`.
- [x] `actualizarJugadores`: cada doc de `lastMatches` ahora lleva `ligaId`.
- [x] `actualizarLast10Score(playerId, ligaId)`: filtra `lastMatches` por `ligaId` (índice compuesto nuevo agregado a `firestore.indexes.json`), dual-write.
- [x] `actualizarEstadisticasJugador(playerId, ligaId, resultado)` → `aplicarActualizacionStats(ref, resultado)`: dual-write a `players` y `ligaStats/{ligaId}`.
- [x] `detectarOCrearSesion(playerIds, sessionId, ligaId)`: la búsqueda de partidas recientes para agrupar sesión ahora filtra por `ligaId` (ya existía el índice compuesto `matches: ligaId ASC, fechaCreacion DESC`).
- [x] Notificaciones (`avisar`): manda a `liga_${ligaId}` **y** al tópico legado `"liga"` (para no dejar de avisarle a las instalaciones actuales de la app hasta que se suscriban por liga en la Fase 5).
- [ ] Nueva Cloud Function para: crear liga, agregar miembro (manual, por nombre o por código de invitación — decisión de producto confirmada), generar código de invitación. **Pendiente para la Fase 4.**

**Bug encontrado y corregido durante la implementación**: `set(objeto, {merge:true})` con claves de texto tipo `"stats.victorias"` NO se interpreta como ruta anidada (a diferencia de `update()`) — crea un campo literal con el punto en el nombre. Se corrigió mandando objetos anidados de verdad (`{ stats: { victorias: ... } }`), que sí mergean recursivamente sin pisar el resto del mapa. Cubierto por un test nuevo en `scripts/test-finalizar-partida.mjs` que verifica que cerrar una copa no pisa las `estadisticas.jugadas`/`victorias` ya cargadas.

**Incidente durante las pruebas**: `npm run test:finalizar` corrió contra Firestore emulado (los datos reales no se tocaron), pero las notificaciones push **sí salieron de verdad** hacia el tópico de producción `"liga"` — Firebase no tiene emulador de FCM, así que esas llamadas escapan al servicio real aunque todo lo demás esté emulado. Se corrigió agregando un guard en `avisar()` que no manda nada real si `process.env.FUNCTIONS_EMULATOR === 'true'` (variable que el emulador de Functions siempre define). Verificado: las corridas posteriores loguean "aviso NO enviado de verdad" en vez de llamar a FCM.

Test suites verificados en verde tras estos cambios: `npm run test:finalizar` (15), `npm run test:rules` (19), `npm run test:migrar-liga1` (6).

### Fase 3 — Reglas de Firestore (`firestore.rules`) — ✅ hecho, versión acotada (30/08/2026)

**Cambio de plan importante, descubierto al implementar**: la web de hoy navega con **sesión anónima** para el uso normal (`src/hooks/useFirebaseAuth.ts`) — el login con Google es solo para `/admin`. `request.auth.uid` de una sesión anónima nunca va a estar en la lista de miembros de ninguna liga. Si `copas`/`matches` hubieran quedado con el chequeo de pertenencia tal como decía este documento originalmente, **toda la web dejaba de funcionar** para cualquiera que no entrara por `/admin` — que es prácticamente todo el uso real de la app hoy.

Se le preguntó a David y se decidió una versión acotada: blindar lo que se puede proteger sin requerir login real, y dejar el resto pendiente de una fase futura (cuando jugar de verdad pida una cuenta, no solo el panel admin).

- [x] `ligas/{ligaId}`: `miembros`/`miembrosUid` ahora solo los toca un admin (`noTocaCampos(['miembros','miembrosUid']) || isAdmin()`). El resto de los campos (nombre, descripción, estado) sigue editable por cualquier autenticado, como antes.
- [x] `players/{id}`: el campo `ligas` (a qué ligas pertenece) se sumó a la lista de campos cerrados (junto a `stats`/`estadisticas`/`last10Score`/`last3Score`): un jugador no se puede auto-agregar a una liga.
- [x] `players/{id}/ligaStats/{ligaId}`: lectura solo si `perteneceALiga(ligaId)` (chequea `miembrosUid` de la liga) o admin. Escritura: solo admin (la Cloud Function usa Admin SDK y no pasa por reglas). Esta sí se pudo cerrar del todo porque es una colección nueva que ningún cliente lee todavía — no hay riesgo de romper nada existente.
- [ ] **Pendiente, no por olvido sino por la sesión anónima**: `copas`/`matches` siguen exactamente igual que antes (`request.auth.uid != null`, sin chequeo de pertenencia a liga). La función `perteneceALiga(ligaId)` ya está escrita y probada en `firestore.rules`, lista para usarse ahí el día que el flujo de juego pida una cuenta real en vez de sesión anónima. Hasta entonces, el aislamiento entre ligas para copas/partidas es el que dan las Cloud Functions (Fase 2) y la futura UI (Fase 5) — no una barrera a nivel de reglas.
- [x] `npm run test:rules`: 9 casos nuevos agregados (alta manual de miembros, protección de `players.ligas`, lectura de `ligaStats` por pertenencia). 28 casos en total, todos en verde.

Test suites verificados en verde: `npm run test:rules` (28), `npm run test:finalizar` (15), `npm run test:migrar-liga1` (6).

### Fase 4 — Gestión de ligas (panel admin, web) — ✅ hecho (30/08/2026)

**Cloud Functions nuevas** (`functions/index.js`), todas con `esAdmin(uid)` replicando el mismo criterio que `isAdmin()` en las reglas (doc en `/admins/{uid}`):
- `crearLiga({nombre, descripcion})` — solo admin. Arranca sin miembros y con `codigoInvitacion` generado (mismo generador de 6 caracteres que el código de partida).
- `agregarMiembroALiga({ligaId, playerId})` — solo admin, es el alta manual por nombre. Si el jugador todavía no tiene `uid` (no reclamado), entra a `miembros` igual pero no a `miembrosUid` — no rompe, queda pendiente de que reclame su ficha.
- `unirseALigaPorCodigo({codigo, playerId})` — la usa la propia persona, exige cuenta no anónima y que el `playerId` sea el suyo (mismo criterio que reclamar un jugador). Busca la liga por `codigoInvitacion` (case-insensitive).
- Probadas en `scripts/test-gestion-ligas.mjs` (`npm run test:gestion-ligas`): 13 casos — admin sí/no puede crear y agregar, no duplica miembros, jugador sin cuenta no rompe `miembrosUid`, no te podés unir con el jugador de otro, código inválido, sesión anónima rechazada. Todos en verde.

**Web**:
- [x] `CrearLiga.tsx`/`useLiga.ts` (`useLigas().crear`): ahora llaman a `crearLiga` en vez de escribir directo con el viejo modelo de ranking embebido (que ya no aplica). Ya no depende de tener un jugador propio — crear una liga es una acción de admin, no de un jugador.
- [x] `GestionMiembrosLiga.tsx` (nuevo, enganchado en `/ligas/[id]/edit`): busca jugador por nombre entre los que no son miembros todavía (filtra client-side sobre `usePlayers()`, alcanza para el tamaño de esta app) y lo agrega vía `agregarMiembroALiga`. Muestra el código de invitación y la lista de miembros actuales.
- [x] `/unirse` (nuevo): si la sesión es anónima, pide login con Google; si no tiene jugador reclamado, lista los sin reclamar para elegir el suyo (reusa `playerService.obtenerSinVincular`/`vincularConCuenta`, que ya existían pero no tenían UI en la web — antes esto solo vivía en Android); con jugador propio, un input de código llama a `unirseALigaPorCodigo`.
- [x] Se sacó el método viejo `ligaService.agregarMiembro` (escritura directa al modelo embebido): quedaba muerto y ahora directamente lo bloquean las reglas de la Fase 3.
- [ ] Ficha de jugador mostrando a qué ligas pertenece: no se hizo — no había pantalla de perfil pública tocada en esta fase; queda para cuando la Fase 5 (selector de liga) toque esas vistas.

Verificado: `npm run build` compila limpio (incluye `/unirse`), lint sin errores nuevos (los 6 errores de `set-state-in-effect` que tira `npm run lint` son preexistentes en archivos que esta fase no tocó). Las cuatro suites de test (`test:rules` 28, `test:finalizar` 15, `test:migrar-liga1` 6, `test:gestion-ligas` 13) están en verde.

### Fase 5 — Selector de liga en los clientes — ✅ hecho para web (30/08/2026); Android queda pendiente

**Hallazgo importante al implementar**: la web tiene código viejo (`activeCopaService.ts`, `rankingService.ts`) que duplica el ciclo de copas y las estadísticas escribiendo directo a Firestore desde el cliente, de antes de que existieran las Cloud Functions. La mayor parte está confirmada muerta (`scoringService._finalizarPartidaConCopaLegacy` y `matchService._createMatchLegacy`, ambos marcados `@deprecated ... sin uso`, ya no se llaman). Pero **`JoinMatch.tsx` sí llamaba en vivo** a `activeCopaService.obtenerOCrearCopaActiva()`/`agregarPartidaAutomatica()` como un "por las dudas" antes de finalizar la partida — un resabio de antes de la Cloud Function `crearPartida`, que ya garantiza la asignación a copa. Si ese resabio llegaba a crear una copa (cuando no hay ninguna activa), la creaba **sin `ligaId` y con el ranking sembrado con todos los jugadores de la base**, exactamente el bug que este plan entero busca evitar. Se sacó ese bloque de `JoinMatch.tsx` — ya no hacía falta y era un agujero real en el aislamiento.

**Decisión de diseño**: como la web navega anónima para el uso normal (Fase 3), "la liga activa" no puede resolverse por identidad de cuenta para la mayoría de las partidas — no hay cuenta. Se implementó como una **preferencia del navegador** (`localStorage`, vía el nuevo hook `useLigaActiva`), no atada a ningún login: cualquiera puede elegir en qué liga está jugando "hoy" desde el selector de la barra de navegación. Con una sola liga activa (la situación de hoy) el selector ni se muestra — aparece solo cuando hay más de una.

- [x] `useLigaActiva` (nuevo hook): resuelve/persiste la liga activa en `localStorage`, expone `ligaActivaId` (default `liga1`) y la lista de ligas activas para el selector. Usa el campo `ligaActual`/`setLigaActual` que ya estaba reservado en `useStore.ts` sin usarse.
- [x] Selector en `NavBar.tsx` (desktop y mobile), oculto si hay una sola liga.
- [x] `NewMatch.tsx` (la pantalla real de "crear partida" que usa todo el grupo): pasa `ligaId: ligaActivaId` a `createMatch`, y filtra la lista de jugadores para mostrar solo los de la liga activa.
- [x] `JoinMatch.tsx`: la revancha (`createMatch` de la partida repetida) hereda el `ligaId` de la partida original, no la preferencia del momento — así una revancha no puede terminar en otra liga por error. Se sacó el bypass de `activeCopaService` (ver hallazgo arriba).
- [x] `CrearPartida.tsx` (panel admin): ya tenía su propio selector de liga manual (dropdown con todas las ligas) — se dejó como está, tiene sentido que el admin elija a mano ahí.
- [ ] **No se tocó**: `AdminGenerarPartidas.tsx`/`bulkMatchService.ts` (carga masiva de partidas desde el admin) siguen mandando `ligaId: null`, que cae en `LIGA_POR_DEFECTO` — funciona pero no usa el selector. Queda como follow-up menor, no bloquea nada.
- [ ] **No se tocó**: las vistas de ranking/copa (`/ranking`, `activeCopaService` de solo lectura en `OrganizerPanel.tsx`) siguen leyendo sin filtrar por liga. Hoy da lo mismo porque solo existe `liga1`; el día que haya una segunda liga real, esas pantallas van a necesitar filtrar por `ligaId` para no mezclar. Es trabajo de lectura, no de escritura — más seguro de post-poner que lo de arriba.
- [ ] **Pendiente, fuera de esta sesión**: Android. El repo de la app (Kotlin) no se tocó acá. Hereda automáticamente el `ligaId` opcional de las Cloud Functions (Fase 2), pero necesita su propia UI de selector y, eventualmente, decidir si suscribe a `liga_<id>` en vez de (o además de) `"liga"` para las notificaciones — la única superficie de FCM que existe hoy es la de Android, la web no tiene push en absoluto.

Verificado: `npm run build` compila limpio (incluye todos los cambios), `npm run lint` sin errores nuevos en los archivos tocados.

### Fase 6 — Limpieza y cierre — parcial (30/08/2026): 2 de 3 hecho, la más importante queda pendiente a propósito

- [ ] **NO se hizo, y no correspondía hacerlo todavía**: borrar `stats`/`estadisticas`/`last10Score`/`last3Score` de la raíz de `players`. El propio riesgo #2 de este documento (§3) decía que esto requiere haber corrido en producción un tiempo con los dos esquemas conviviendo — y ni siquiera se desplegaron todavía las Fases 2-5. Además, ningún lector real migró a `ligaStats`: `rankingService.obtenerRankingGlobal()` (usado por `/ranking` y `/api/ranking`) sigue leyendo los campos planos, tal como quedó anotado ahora en `docs/RANKING_GLOBAL.md`. Borrarlos hoy rompería el ranking en producción apenas se desplegara. **Prerequisito real para poder tacharlo**: desplegar Fases 2-5, y migrar `rankingService`/las vistas de perfil a leer de `ligaStats` filtrando por liga.
- [x] Se sacó el `ranking`/`partidas` embebido de `ligas` y todo lo que lo escribía — confirmado sin ningún llamador real antes de tocarlo: `ligaService.agregarPartida` (un solo llamador, en `useMatch.ts:141-143`, ya quitado), `ligaService.actualizarRanking` (cero llamadores) y `scoringService.actualizarRankingLiga` (cero llamadores). La lectura (`ligaService.obtenerRanking`, la pantalla `/ligas/[id]`) se dejó intacta — no es lo que pedía este ítem, y no hay apuro en tocarla.
- [x] `docs/MODELO_DATOS.md` actualizado: sección `ligas` reescrita con los campos reales (`miembros`, `miembrosUid`, `codigoInvitacion`), nota sobre el `ranking`/`partidas` embebido muerto, y sección nueva para `ligaStats`. `docs/RANKING_GLOBAL.md` con una nota que aclara que sigue siendo global de verdad (no se migró) y por qué.
- [x] `docs/PENDIENTES_ANDROID.md`: agregado el selector de liga y la decisión de tópico FCM (`liga_<id>` vs. `"liga"`) como pendiente de Android, sin apuro porque el backend manda a los dos tópicos mientras tanto.

Verificado: `npm run build` y `npm run lint` sin errores nuevos tras sacar el código muerto (mismos 6 errores preexistentes de siempre, en archivos no tocados).

---

## 3. Riesgos / cosas a validar en el camino

- **Costo de lectura extra en las reglas**: el `get()` a `ligas/{ligaId}` en cada regla de `copas`/`matches` es una lectura de Firestore adicional por operación. Con el volumen actual (juego de mesa entre amigos) es irrelevante; si el proyecto crece mucho en ligas concurrentes, revisar.
- **Migración es de un solo sentido**: no hay vuelta atrás fácil una vez que se borran los campos planos de `players` (Fase 6). Por eso esa fase va al final y separada, después de haber corrido en producción un tiempo con ambos esquemas convivendo (subcolección nueva + campos viejos sin tocar, hasta confirmar que todo lee de la subcolección).
- **Sesión anónima en la web** (`docs/MODELO_DATOS.md` §Identidad): hoy la web juega con sesiones anónimas y el reclamo de jugador (`uid`) requiere login no-anónimo. Si la invitación a una liga también va a requerir identificar a la persona (para escribir su `uid` en `miembrosUid`), la web necesita login real, no anónimo, para ese flujo — a definir si se resuelve reusando el login de Google que hoy solo existe para `/admin`.

---

## 4. Orden sugerido

Fase 1 (migración) y Fase 2 (Cloud Functions) van juntas — no tiene sentido desplegar una sin la otra. Fase 3 (reglas) inmediatamente después, antes de exponer nada a un usuario real, porque hasta que no estén las reglas de pertenencia, el aislamiento es solo de datos, no de acceso. Fases 4 y 5 (UI) pueden ir en paralelo una vez que el backend soporta `ligaId` de punta a punta. Fase 6 (limpieza) al final, sin apuro.
