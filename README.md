# CosmicApp 2026

Aplicación web para la gestión de torneos de **Cosmic Encounter** de la Liga Cosmic Encounter (LCE). Permite registrar partidas, calcular puntajes, mantener copas automáticas y llevar las estadísticas históricas de los jugadores.

## Stack

- **Next.js 16** (App Router, `'use client'`)
- **Firebase** — Firestore (base de datos) + Auth (Google)
- **Tailwind CSS 4**
- **Zustand** (estado global del cliente)

## Características principales

### Partidas
- Crear y unirse a partidas con código compartible
- Registrar colonias internas (CI) y externas (CE) por jugador
- Marcar participantes y ganadores
- Finalizar partida con cálculo automático de puntos

### Sistema de puntaje
La fórmula aplicada al finalizar cada partida:

```
Puntos = (CI × 1) + (CE × 2) + (participantes / ganadores)  ← solo si es ganador
```

### Copas automáticas
- Cada partida se asocia automáticamente a la copa activa
- La copa incluye **todos** los jugadores registrados en la base de datos desde su creación
- Ciclos de **10 partidas**: al finalizar la partida 10 se adjudica el ganador al jugador con más puntos y se abre una nueva copa de forma automática
- Los jugadores que se incorporan tarde arrancan acumulando desde la partida en que juegan por primera vez

### Estadísticas LCE
Cada jugador tiene un campo `estadisticas` con historial acumulado:

| Campo | Actualización |
|---|---|
| `jugadas` | +1 por cada partida en que participa |
| `victorias` | +1 cuando gana |
| `colonias` | +CE de la partida |
| `copas` | +1 cuando gana una copa |
| `victoriasEspeciales`, `campañas`, `ataqueSolitario`, `defensaSolitaria`, `pijón` | Edición manual desde el admin |

### Panel de administración
- **Estadísticas** — stats automatizados por jugador
- **Jugadores** — alta, baja y edición de jugadores
- **Partidas** — listado y gestión de partidas
- **Copas** — historial de copas y rankings
- **Ligas** — gestión de ligas
- **Cargar Partidas** — carga masiva de resultados
- **Generar Prueba** — genera 10 partidas aleatorias válidas para testing
- **Liga LCE** — tabla de estadísticas históricas con snapshot/reset

### Otras funcionalidades
- Lista completa de aliens del juego con descripción
- Asignador de aliens aleatorio
- Ranking global de jugadores
- Autenticación con Google

## Estructura del proyecto

```
src/
├── app/
│   ├── admin/          # Panel de administración
│   ├── alienList/      # Lista de aliens
│   ├── copas/          # Vista de copas y sumar puntos
│   ├── ligas/          # Vista de ligas
│   ├── matches/        # Vista de partidas
│   ├── players/        # Perfil de jugadores
│   ├── ranking/        # Ranking global
│   ├── sections/       # NewMatch, JoinMatch, AlienList, RandomAlien
│   └── page.js         # Home
├── components/
│   ├── admin/          # Componentes del panel admin
│   ├── forms/          # Formularios (crear/editar entidades, cargar puntos)
│   ├── tables/         # RankingCopa, RankingLiga
│   └── modals/         # Modales de confirmación
├── hooks/              # useCopa, useLiga, useMatch, usePlayer, useAdminAccess
├── services/
│   ├── scoringService.js       # Cálculo de puntos y finalización de partidas
│   ├── activeCopaService.js    # Ciclo de vida de las copas automáticas
│   ├── estadisticasService.js  # Estadísticas LCE + snapshot/restore
│   ├── rankingService.js       # Ranking global y last-10
│   ├── matchService.js
│   ├── copaService.js
│   ├── ligaService.js
│   └── playerService.js
├── firebase/
│   ├── config.js       # Inicialización de Firebase
│   └── auth.js
└── store/              # Estado global Zustand
```

## Colecciones Firestore

| Colección | Descripción |
|---|---|
| `players` | Jugadores registrados. Campos: `name`, `email`, `stats` (auto), `estadisticas` (LCE) |
| `matches` | Partidas. Estado: `activa` → `finalizada` |
| `copas` | Ciclos de 10 partidas con `ranking` embebido |
| `ligas` | Ligas con `ranking` embebido |
| `snapshots` | Copias de seguridad de `estadisticas` para el botón de reset |

## Configuración

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/cubo1991/cosmicapp2026
cd cosmicapp2026
npm install
```

### 2. Variables de entorno

Crear un archivo `.env.local` en la raíz con las credenciales del proyecto Firebase:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...
```

### 3. Reglas de Firestore

Desplegar las reglas incluidas en `firestore.rules`:

```bash
firebase deploy --only firestore:rules
```

### 4. Correr en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Flujo de uso típico

1. Los jugadores se registran con Google
2. Alguien crea una partida desde el Home → se genera un código
3. El resto de jugadores se une con ese código
4. Al terminar, un admin carga los resultados (CI, CE, ganador/es por jugador)
5. El sistema calcula los puntos, actualiza el ranking de la copa activa y las estadísticas individuales
6. Al cargar la décima partida de una copa, el sistema la cierra automáticamente, adjudica el ganador y abre una nueva copa

## Primer uso — Estadísticas LCE

Para cargar el historial del Excel en Firebase:

1. Ir a `/admin` → pestaña **Liga LCE**
2. Hacer clic en **Sembrar Datos Iniciales** (carga los datos históricos y guarda un snapshot baseline)
3. A partir de ahí las estadísticas se actualizan solas al jugar partidas
4. Usar **Guardar Snapshot** para crear nuevos puntos de restauración
5. Usar **Resetear a Snapshot** para volver al último snapshot guardado
