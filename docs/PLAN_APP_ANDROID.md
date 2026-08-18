# 📱 Plan: App Nativa Android — CosmicApp 2026

**Estado**: Planificación (sin código)
**Fecha**: Agosto 2026
**Alcance**: Android primero. iOS se evalúa al cierre de la Etapa 3.

---

## 1. Objetivo

Llevar la funcionalidad de CosmicApp (gestión de torneos de Cosmic Encounter de la LCE) a una app nativa de Android, priorizando los flujos que se usan **en la mesa durante una partida**: unirse con código, ver el ranking de la copa activa, cargar resultados y consultar aliens.

La web sigue existiendo. La app no la reemplaza: la complementa donde el celular es el dispositivo natural (todos los jugadores están sentados jugando, nadie tiene una notebook).

---

## 2. Decisiones técnicas

### 2.1 Stack recomendado

| Capa | Elección | Por qué |
|---|---|---|
| Lenguaje/UI | **Kotlin + Jetpack Compose** | Estándar actual de Android nativo. Compose acelera mucho la UI declarativa (mismo paradigma mental que React, que ya conocés). |
| Arquitectura | **MVVM + Repository** | Patrón por defecto recomendado por Google; los repositories espejan tus services actuales (`matchService`, `copaService`, etc.). |
| Backend | **El Firebase existente** (Firestore + Auth Google) | Cero backend nuevo. El SDK de Firebase para Android habla con las mismas colecciones (`players`, `matches`, `copas`, `ligas`, `snapshots`). |
| Estado | ViewModel + StateFlow | Equivalente nativo de Zustand + hooks. |
| Navegación | Navigation Compose | Una activity, navegación declarativa. |
| DI | Hilt | Estándar, poco boilerplate. |

**Alternativa considerada y descartada por ahora**: Kotlin Multiplatform (KMP) o React Native. KMP tendría sentido si iOS fuera seguro desde el día 1; como es "veremos", arrancar nativo puro es más simple. **Nota**: si al planificar iOS la respuesta es "sí, seguro", conviene reevaluar KMP *antes* de escribir la lógica de dominio en la Etapa 2, porque la capa de dominio (scoring, ciclo de copas) es justamente lo que KMP permite compartir.

### 2.2 El problema central: lógica de negocio duplicada

Hoy toda la lógica vive en el cliente web (TypeScript): fórmula de puntos, ciclo de 10 partidas, cierre y apertura automática de copas, actualización de `estadisticas`. Si la app Android la reimplementa en Kotlin, tenés **dos fuentes de verdad** que van a divergir (un bug corregido en una y no en la otra corrompe datos compartidos).

**Recomendación**: antes o durante la Etapa 3, mover la lógica de escritura crítica a **Cloud Functions** (finalizar partida → calcular puntos → actualizar copa → cerrar/abrir copa → actualizar estadísticas). Web y Android llaman a la misma function. Es el único trabajo de backend real del proyecto y elimina la clase de bug más peligrosa.

- Etapas 1–2 (solo lectura + unirse a partidas) **no** necesitan esto.
- La alternativa (duplicar la fórmula en Kotlin) es aceptable solo como atajo temporal y con tests espejados en ambos lados.

### 2.3 Reglas de Firestore

Las `firestore.rules` actuales fueron pensadas para la web. Antes de la Etapa 1 hay que auditarlas asumiendo un cliente móvil más (mismo proyecto Firebase, misma superficie de ataque). Sin cambios de modelo, solo revisión.

---

## 3. Arquitectura propuesta

```
app/
├── data/                  # Acceso a Firestore/Auth
│   ├── model/             # Player, Match, Copa, Liga, Estadisticas (espejo de src/app/models)
│   ├── repository/        # MatchRepository, CopaRepository, PlayerRepository, LigaRepository
│   └── source/            # Wrappers de Firestore (queries, listeners en tiempo real)
├── domain/                # Lógica pura (si no se migra a Cloud Functions)
│   └── scoring/           # Fórmula de puntos, validaciones de participación
├── ui/
│   ├── home/              # Home: copa activa + accesos rápidos
│   ├── match/             # Crear, unirse (código), detalle, cargar resultados
│   ├── copa/              # Detalle de copa, ranking, historial
│   ├── ranking/           # Ranking global
│   ├── player/            # Perfil y estadísticas LCE
│   ├── alien/             # Lista de aliens + alien aleatorio
│   ├── admin/             # Panel admin (subset móvil)
│   └── common/            # Componentes compartidos, tema
└── di/                    # Módulos Hilt
```

Principios:
- **Listeners en tiempo real** de Firestore para partida activa y ranking de copa (la web ya es reactiva; en la mesa, ver actualizarse el ranking en vivo es el diferencial de la app).
- **Offline por defecto**: la persistencia offline de Firestore viene gratis en Android; solo hay que diseñar la UI para estado "pendiente de sincronizar".
- Los modelos espejan los de `src/app/models` — cualquier cambio de esquema se documenta en un solo lugar (proponer `docs/MODELO_DATOS.md` como fuente canónica cuando arranque el desarrollo).

---

## 4. User stories

Prioridad: **[M]** must / **[S]** should / **[C]** could. Agrupadas por épica.

### Épica A — Autenticación y perfil
- A1 **[M]** Como jugador, quiero iniciar sesión con Google para que la app me identifique con mi jugador existente.
- A2 **[M]** Como jugador que entra por primera vez, quiero que la app me muestre la lista de jugadores existentes en la base y me pregunte si alguno soy yo, para vincular mi cuenta de Google con mi historial (partidas, estadísticas, copas) en vez de crear un jugador duplicado.
- A2b **[M]** Como jugador realmente nuevo (no estoy en la lista), quiero elegir "soy nuevo" y que se cree mi jugador, igual que en la web.
- A2c **[S]** Como admin, quiero poder deshacer una vinculación errónea (alguien se asoció al jugador equivocado), porque la fusión toca datos históricos.
- A3 **[S]** Como jugador, quiero ver mi perfil con mis estadísticas LCE (jugadas, victorias, colonias, copas, especiales).
- A4 **[C]** Como jugador, quiero sesión persistente para no loguearme cada vez.

### Épica B — Partidas
- B1 **[M]** Como jugador, quiero unirme a una partida ingresando el código compartible.
- B2 **[M]** Como jugador, quiero ver la partida activa en tiempo real (quiénes están, estado).
- B3 **[M]** Como organizador, quiero crear una partida desde el celular y compartir el código (incluye compartir por WhatsApp/share sheet nativo).
- B4 **[S]** Como jugador, quiero ver el historial de partidas recientes y pendientes.
- B5 **[S]** Como admin, quiero cargar los resultados de una partida (CI, CE, participó, ganador/es) desde el celular y finalizarla.
- B6 **[C]** Como admin, quiero editar/eliminar una partida cargada con error.

### Épica C — Copas
- C1 **[M]** Como jugador, quiero ver la copa activa: ranking, cuántas partidas van de 10, quién lidera.
- C2 **[S]** Como jugador, quiero ver el historial de copas cerradas con sus ganadores.
- C3 **[S]** Como jugador, quiero recibir una notificación push cuando se cierra una copa y hay ganador.
- C4 **[C]** Como jugador, quiero ver el ticker del último ganador (paridad con la web).

### Épica D — Rankings y estadísticas
- D1 **[M]** Como jugador, quiero ver el ranking global (top por suma de últimas 10 partidas).
- D2 **[S]** Como jugador, quiero ver la tabla de la Liga LCE (estadísticas históricas).
- D3 **[C]** Como jugador, quiero ver el detalle de otro jugador tocando su nombre en cualquier ranking.

### Épica E — Aliens
- E1 **[S]** Como jugador, quiero consultar la lista de aliens con descripción, con búsqueda.
- E2 **[S]** Como jugador, quiero el asignador de alien aleatorio (es un flujo que ocurre físicamente en la mesa: candidato ideal para la app).
- E3 **[C]** Como jugador, quiero marcar aliens favoritos (solo local, no toca Firestore).

### Épica F — Administración (subset móvil)
- F1 **[S]** Como admin, quiero que la app reconozca mi rol y me muestre las acciones de admin.
- F2 **[C]** Como admin, quiero ABM básico de jugadores.
- F3 **[fuera de alcance]** Carga masiva, generar partidas de prueba, snapshot/reset de estadísticas, gestión de ligas: quedan en la web. El admin "de escritorio" no necesita ser móvil.

### Épica G — Notificaciones (transversal)
- G1 **[S]** Push cuando se crea una partida (para los habitués).
- G2 **[S]** Push cuando finaliza una partida con mis puntos obtenidos.
- G3 **[C]** Push semanal con resumen de la copa activa.

---

## 5. Etapas

Cada etapa termina con un entregable usable e instalable (APK por Firebase App Distribution para el grupo de la liga; Play Store recién en Etapa 4).

### Etapa 0 — Fundaciones (la más corta)
Proyecto Android, Hilt, navegación, tema visual (trasladar la identidad cósmica de la web), conexión a Firebase, login con Google (A1, A4), auditoría de `firestore.rules`.
Onboarding de vinculación (A2, A2b): al primer login, la app lista los jugadores existentes sin cuenta asociada y pregunta "¿alguno sos vos?". Si elige uno, se guarda el `uid` de Google en ese documento de `players` (es una **vinculación**, no una fusión de documentos: el jugador histórico gana una cuenta, no se crea nada). Si es nuevo, alta normal. Diseñar este flujo junto con la web para que ambas usen el mismo criterio de asociación.
**Criterio de salida**: me logueo, elijo mi jugador histórico y veo mis estadísticas reales.

### Etapa 1 — Solo lectura (el visor de la liga)
Copa activa con ranking en tiempo real (C1), ranking global (D1), historial de partidas (B4), historial de copas (C2), perfil propio (A3).
**Criterio de salida**: cualquier jugador de la LCE puede seguir la liga desde el celular sin tocar la web. *Esta etapa ya entrega valor real y es puro Firestore-read: riesgo mínimo.*

### Etapa 2 — Partidas en la mesa
Crear partida + compartir código (B3), unirse con código (B1), sala de partida en tiempo real (B2), lista de aliens (E1), alien aleatorio (E2).
**Criterio de salida**: una partida real de la liga se organiza íntegramente desde celulares.

### Etapa 3 — Escritura crítica
**Prerrequisito recomendado**: migrar finalización de partida a Cloud Functions (ver §2.2).
Carga de resultados y finalización (B5), con lo que se dispara todo el ciclo: puntos, copa, estadísticas, cierre de copa a las 10 partidas. Rol admin en la app (F1).
**Criterio de salida**: una copa completa (10 partidas) transcurre sin abrir la web, y los datos quedan idénticos a como los hubiera dejado la web.
**Hito de decisión iOS**: acá se evalúa iPhone con datos de uso reales.

### Etapa 4 — Pulido y alcance ampliado
Notificaciones push (G1, G2, C3), Liga LCE (D2), detalle de jugadores (D3), correcciones de partidas (B6), favoritos de aliens (E3), publicación en Play Store.

### Etapa 5 (condicional) — iOS
Si se confirma: evaluar KMP (compartir data/domain, UI en SwiftUI) contra nativo puro. La decisión depende de cuánta lógica quedó en el cliente tras la migración a Cloud Functions — si quedó poca, nativo puro en Swift es viable; si quedó mucha, KMP.

---

## 6. Riesgos y cuestiones abiertas

| # | Riesgo / decisión | Mitigación |
|---|---|---|
| 1 | Lógica duplicada web/Android corrompe datos compartidos | Cloud Functions antes de Etapa 3 (§2.2) |
| 2 | Reglas de Firestore pensadas solo para la web | Auditoría en Etapa 0 |
| 3 | Cambios de esquema en la web rompen la app (o viceversa) | [`docs/MODELO_DATOS.md`](MODELO_DATOS.md) como fuente canónica; convención de campos opcionales con defaults |
| 3b | `matches.jugadores` tiene dos formatos (map nuevo y array legacy) conviviendo | Normalizar con una migración **antes** de modelar en Kotlin (ver MODELO_DATOS.md) |
| 4 | Dos codebases de UI para mantener con un solo dev | Alcance móvil deliberadamente menor (admin pesado queda en web) |
| 5 | Costo Firebase al sumar listeners móviles en tiempo real | Escala actual (una liga) es trivial; revisar si crece |
| 6 | ¿Cuenta de Google Play? (USD 25 una vez, verificación de identidad) | Resolver antes de Etapa 4; hasta entonces, App Distribution |
| 7 | En el onboarding, alguien se vincula al jugador de otro (por error o vivo) | Solo se pueden reclamar jugadores sin `uid` asociado; el admin puede deshacer la vinculación (A2c). Con la escala de una liga entre conocidos, alcanza |

---

## 7. Fuera de alcance (explícito)

- Reemplazar la web.
- Panel admin completo en móvil (carga masiva, seeds, snapshots, ligas).
- Modo multi-liga / multi-tenant.
- Tablets como target de diseño (que funcione, sin layout dedicado).
