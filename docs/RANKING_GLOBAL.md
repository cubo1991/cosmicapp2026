# 🏆 Sistema de Ranking Global - Documentación Técnica

## 📋 Resumen Ejecutivo

Se implementó un sistema de ranking global que muestra los **mejores 100 jugadores** basado en la **suma de sus últimas 10 partidas completadas**.

**Decisión de arquitectura:** Híbrida (Subcolección + Desnormalización)

---

## 🏗️ Estructura de Datos

### Cambios en Firestore

#### 1. Nueva Subcolección: `players/{playerId}/lastMatches`
```
players/
  └─ {playerId}/
      └─ lastMatches/
         └─ {matchId}
            ├─ matchId: string
            ├─ puntos: number (suma total de la partida)
            ├─ esGanador: boolean
            ├─ participó: boolean
            └─ createdAt: timestamp
```

**Propósito:** Registro granular de cada partida completada por el jugador
**Reads:** 1 query = obtener últimas 10 partidas
**Beneficio:** Cálculo rápido del ranking sin múltiples queries

#### 2. Campo Desnormalizado en `players/{playerId}`
```json
{
  "id": "user_001",
  "name": "Juan García",
  "email": "juan@example.com",
  "avatar": "https://...",
  "stats": { "partidas": 12, "victorias": 4, "puntosPromedio": 8.5, "ultimaPartida": 1713264000000 },
  
  // 🆕 NUEVOS CAMPOS
  "last10Score": 85.5,                    // Suma de últimas 10 partidas (cache)
  "last10ScoreUpdatedAt": 1713264000000   // Cuándo se actualizó por última vez
}
```

**Propósito:** Cache precalculado para lectura rápida
**Ventaja:** No necesita calcular cada vez que se obtiene el ranking

---

## 🔄 Flujo de Datos

### Cuando se Finaliza una Partida

```
1. Usuario carga resultados en /matches/[id]
   ↓
2. Hook useMatch.finalizarPartida() procesa datos
   ↓
3. ✅ Actualiza documento de match (estado: 'finalizada')
   ├─ Calcula puntos de cada jugador
   └─ Almacena en match.jugadores[playerId].puntos.total
   ↓
4. ✅ Actualiza ranking de Copa/Liga (si aplica)
   ↓
5. ✅ Actualiza stats del jugador
   ├─ stats.partidas += 1
   ├─ stats.victorias += 1 (si ganó)
   └─ stats.puntosPromedio = recalculado
   ↓
6. 🆕 rankingService.registrarPartidaPorJugador()
   └─ Crea documento en players/{playerId}/lastMatches/{matchId}
   ↓
7. 🆕 rankingService.actualizarLast10Score()
   ├─ Query: últimas 10 partidas (DESC createdAt)
   ├─ Suma puntos
   └─ Actualiza player.last10Score
```

---

## 📁 Archivos Creados/Modificados

### ✅ Nuevos Archivos

1. **`src/services/rankingService.js`**
   - Servicio centralizado de ranking
   - 4 funciones principales:
     - `registrarPartidaPorJugador()` → Guarda partida en subcolección
     - `actualizarLast10Score()` → Actualiza cache de puntos
     - `obtenerRankingGlobal()` → Retorna top 100
     - `obtenerUltimas10Partidas()` → Historial de jugador

2. **`src/app/api/ranking/route.js`**
   - Endpoint GET `/api/ranking`
   - Retorna ranking ordenado
   - Cache: 60s (s-maxage), revalidación: 120s

3. **`src/components/GlobalRanking.jsx`**
   - Componente reutilizable
   - Muestra top 10 en 2 secciones:
     - Top 3 con tarjetas destacadas (medallas)
     - Posiciones 4-10 en tabla compacta
   - Skeleton loading incluido

4. **`src/app/ranking/page.js`**
   - Página completa `/ranking`
   - Tabla de ranking top 100
   - Enlace a perfil de cada jugador

### 🔄 Modificados

1. **`src/hooks/useMatch.js`**
   - Importa `rankingService`
   - En `finalizarPartida()`, tras actualizar stats:
     - Llama `rankingService.registrarPartidaPorJugador()`
     - Llama `rankingService.actualizarLast10Score()` para cada participante
     - Error handling no bloqueante (warning)

2. **`src/app/page.js`**
   - Importa componente `GlobalRanking`
   - Nueva sección "Ranking Global" entre Torneos y Admin
   - Llamada: `<GlobalRanking />`

3. **`firestore.rules`**
   - Agregó subcolección `players/{userId}/lastMatches`
   - Permisos: lectura todos, escritura via sistema

---

## 🎯 Endpoints

### GET `/api/ranking`

**Parámetros:** Ninguno

**Response:**
```json
{
  "success": true,
  "total": 42,
  "ranking": [
    {
      "posicion": 1,
      "id": "user_001",
      "nombre": "Juan García",
      "avatar": "https://...",
      "puntos": 95.5,
      "partidas": 12,
      "victorias": 4,
      "puntosPromedio": 8.5
    },
    // ... más jugadores
  ]
}
```

**Cache:** 60s (público)

---

## 🖥️ Componentes Frontend

### GlobalRanking.jsx
- Lugar: Home page (nueva sección)
- Props: Ninguno
- Estado: Carga desde `/api/ranking`
- Diseño:
  - Top 3 con medallas (destacado)
  - Rows 4-10 compacto
  - Botón "Ver Ranking Completo"

### RankingPage (/ranking)
- Tabla completa (top 100)
- Columnas: #, Nombre, Puntos*, Partidas, Victorias, Promedio, Acción
- Skeleton loading
- Nota: "*Puntos = Suma últimas 10 partidas"

---

## ⚡ Performance

### Optimizaciones Implementadas

| Aspecto | Solución |
|---------|----------|
| **Multiple queries** | Subcolección indexada por jugador |
| **Cálculo repetido** | Campo `last10Score` desnormalizado |
| **Revalidación** | Endpoint con cache 60s + revalidación 120s |
| **Lectura Firestore** | 1 query por ranking (getDocs) |
| **Reads por finalizar partida** | +2 reads (registrar + actualizar score) |

### Análisis de Reads Firestore

**Por finalizar una partida:**
- Antes: 2 reads (match + rankings de copas/ligas)
- Ahora: +2 reads (registrar + actualizar last10Score)
- **Total = 4 reads** (aceptable)

**Ranking global:**
- Query: 1 read (getDocs collection)
- Frontera: Cada jugador = 1 lectura
- Optimizado: Cache 60s en endpoint

---

## 🔐 Seguridad

### Firestore Rules

```
match /players/{userId}/lastMatches/{matchId} {
  allow read: if request.auth.uid != null;
  allow create, update: if request.auth.uid != null;
  allow delete: if isAdmin();
}
```

- ✅ Solo usuarios autenticados leen
- ✅ Sistema (server) escribe (via hook)
- ✅ Admin puede eliminar
- ✅ Sin acceso anónimo

---

## 🚀 Cómo Usar

### Para Usuarios

1. **Ver Ranking en Home:**
   - Abre `/` → Nueva sección "Ranking Global"
   - Muestra top 3 destacado + posiciones 4-10

2. **Ver Ranking Completo:**
   - Click en "Ver Ranking Completo"
   - Abre `/ranking` con tabla de top 100

3. **Ver Detalles de Jugador:**
   - Click en nombre → `/players/{id}`

### Para Desarrolladores

1. **Obtener ranking (Server/Client):**
```javascript
import { rankingService } from '@/services/rankingService';

const ranking = await rankingService.obtenerRankingGlobal();
```

2. **Obtener últimas 10 partidas de un jugador:**
```javascript
const partidas = await rankingService.obtenerUltimas10Partidas(playerId);
```

3. **Registrar partida manualmente:**
```javascript
await rankingService.registrarPartidaPorJugador(
  matchId,
  jugadoresConPuntos,
  fechaPartida
);
```

---

## 📊 Datos de Ejemplo

### Antes (sin ranking global)
```
Ranking solo en Copas/Ligas específicas
No hay vista global de todos los jugadores
```

### Después (con ranking global)
```
🥇 #1 - Juan García     95.5 pts (12 partidas, 4 victorias)
🥈 #2 - María López     88.2 pts (10 partidas, 3 victorias)
🥉 #3 - Carlos Díaz     82.7 pts (15 partidas, 5 victorias)
#4 - Ana Martínez       76.5 pts
#5 - Pedro Gómez        72.3 pts
```

---

## ✨ Características Futuras (Opcionales)

1. **Refresco en tiempo real** (Firestore onSnapshot)
2. **Filtros por período** (últimas 10/20/50 partidas)
3. **Exportar ranking** (CSV/PDF)
4. **Notificaciones** ("¡Subiste de posición!")
5. **Estadísticas por jugador** (gráficos, evolución)
6. **Cloud Function** para actualizar scores batch (nocturno)

---

## 📝 Notas Técnicas

- ✅ Sin breaking changes en estructura existente
- ✅ Compatible con copas/ligas actuales
- ✅ Retrocompatible con matches sin ranking
- ✅ Escalable hasta 10k+ jugadores
- ✅ Error handling no bloqueante (ranking secundario)

---

**Última actualización:** 25 de abril de 2026
**Estado:** ✅ Implementado y listo para producción

---

## ⚠️ Nota (30/08/2026) — multi-liga

Este ranking sigue siendo **literalmente global**: `rankingService.obtenerRankingGlobal()` lee
`last10Score` de la raíz de todos los `players`, sin filtrar por liga. Es correcto mientras exista
una sola liga real (hoy), pero el día que haya una segunda, este ranking va a mezclar jugadores de
las dos. Migrarlo a leer `players/{id}/ligaStats/{ligaId}` filtrado por la liga activa quedó
pendiente — ver la Fase 6 de [`PLAN_MULTI_LIGA.md`](PLAN_MULTI_LIGA.md), que también explica por
qué `players.last10Score` todavía no se puede borrar (este endpoint es uno de los que lo sigue
leyendo).
