# Guía de Implementación - CosmicApp Sistema de Torneos

## ✅ Completado

Todo ha sido implementado exitosamente en tu código. Aquí está el resumen:

### 1. **Store Global (Zustand)**
- ✅ [src/store/useStore.js](src/store/useStore.js) - Actualizado con estados para partidas, jugadores, copas y ligas

### 2. **Servicios Firebase**
- ✅ [src/services/playerService.js](src/services/playerService.js) - CRUD de jugadores
- ✅ [src/services/copaService.js](src/services/copaService.js) - Gestión de copas
- ✅ [src/services/ligaService.js](src/services/ligaService.js) - Gestión de ligas
- ✅ [src/services/scoringService.js](src/services/scoringService.js) - Cálculo de puntos
- ✅ [src/services/matchService.js](src/services/matchService.js) - Ya existía

### 3. **Hooks Personalizados**
- ✅ [src/hooks/usePlayer.js](src/hooks/usePlayer.js) - Hook para jugadores
- ✅ [src/hooks/useMatch.js](src/hooks/useMatch.js) - Hook para partidas
- ✅ [src/hooks/useCopa.js](src/hooks/useCopa.js) - Hook para copas
- ✅ [src/hooks/useLiga.js](src/hooks/useLiga.js) - Hook para ligas

### 4. **Componentes**
- ✅ [src/components/forms/CrearJugador.jsx](src/components/forms/CrearJugador.jsx)
- ✅ [src/components/forms/CrearPartida.jsx](src/components/forms/CrearPartida.jsx)
- ✅ [src/components/forms/CargaResultados.jsx](src/components/forms/CargaResultados.jsx)
- ✅ [src/components/forms/CrearCopa.jsx](src/components/forms/CrearCopa.jsx)
- ✅ [src/components/forms/CrearLiga.jsx](src/components/forms/CrearLiga.jsx)
- ✅ [src/components/tables/RankingCopa.jsx](src/components/tables/RankingCopa.jsx)
- ✅ [src/components/tables/RankingLiga.jsx](src/components/tables/RankingLiga.jsx)
- ✅ [src/components/NavBar.jsx](src/components/NavBar.jsx) - Actualizado con navegación

### 5. **Páginas**
- ✅ [src/app/players/page.js](src/app/players/page.js) - Lista de jugadores
- ✅ [src/app/players/\[id\]/page.js](src/app/players/[id]/page.js) - Detalle de jugador
- ✅ [src/app/matches/page.js](src/app/matches/page.js) - Crear partidas
- ✅ [src/app/copas/page.js](src/app/copas/page.js) - Lista de copas
- ✅ [src/app/copas/\[id\]/page.js](src/app/copas/[id]/page.js) - Detalle y ranking
- ✅ [src/app/ligas/page.js](src/app/ligas/page.js) - Lista de ligas
- ✅ [src/app/ligas/\[id\]/page.js](src/app/ligas/[id]/page.js) - Detalle y ranking

### 6. **Cloud Functions**
- ✅ [functions/index.js](functions/index.js) - Cálculo de puntos y actualización de rankings
- ✅ [functions/package.json](functions/package.json) - Dependencias

### 7. **Configuración Firebase**
- ✅ [firebase.json](firebase.json) - Configuración de proyecto
- ✅ [firestore.rules](firestore.rules) - Reglas de seguridad
- ✅ [firestore.indexes.json](firestore.indexes.json) - Índices necesarios

### 8. **Utilidades**
- ✅ [src/utils/validaciones.js](src/utils/validaciones.js) - Validaciones centralizadas
- ✅ [SETUP.md](SETUP.md) - Guía de instalación

---

## 🚀 Próximos Pasos (IMPORTANTE)

### Paso 1: Instalar dependencias de Cloud Functions
```bash
cd functions
npm install
cd ..
```

### Paso 2: Desplegar en Firebase

**A. Desplegar Firestore Rules:**
```bash
firebase deploy --only firestore:rules
```

**B. Desplegar Cloud Functions:**
```bash
firebase deploy --only functions
```

**C. Crear índices (opcional, Firebase lo sugiere):**
```bash
firebase deploy --only firestore:indexes
```

### Paso 3: Crear colecciones en Firebase Console

1. Ir a [Firebase Console](https://console.firebase.google.com)
2. Seleccionar tu proyecto
3. Ir a Firestore Database
4. Crear las siguientes colecciones (vacías):
   - `players`
   - `matches`
   - `copas`
   - `ligas`

### Paso 4: Verificar Firestore Rules

En Firebase Console:
1. Ir a Firestore Database → Rules
2. Cambiar a la regla con contrasol: `allow read, write: if false;`
3. Importar tu archivo [firestore.rules](firestore.rules)
4. Publicar

### Paso 5: Probar localmente (Opcional)

```bash
firebase emulators:start
```

Esto abrirá emuladores en http://localhost:4000

---

## 📝 Estructura de Datos que se Crea

### Players
```json
{
  "id": "user_001",
  "name": "Juan García",
  "email": "juan@ejemplo.com",
  "avatar": "https://...",
  "createdAt": timestamp,
  "stats": {
    "partidas": 0,
    "victorias": 0,
    "puntosPromedio": 0,
    "ultimaPartida": null
  },
  "copas": [],
  "ligas": []
}
```

### Matches
```json
{
  "id": "match_001",
  "nombre": "Partida Casual",
  "copId": null | "copa_001",
  "ligaId": null | "liga_001",
  "estado": "activa" | "finalizada",
  "fechaCreacion": timestamp,
  "fechaFinalizacion": null | timestamp,
  "jugadores": {
    "user_001": {
      "nombre": "Juan García",
      "coloniasInternas": 0,
      "coloniasExternas": 0,
      "esGanador": false,
      "puntos": 0,
      "posicion": 0
    }
  }
}
```

### Copas
```json
{
  "id": "copa_001",
  "nombre": "Copa Primavera",
  "descripcion": "...",
  "estado": "planificada" | "activa" | "finalizada",
  "fechaInicio": timestamp,
  "fechaFin": timestamp,
  "reglas": {
    "cantidadRondas": 8,
    "reglasAdicionales": ""
  },
  "partidas": ["match_001", "match_002"],
  "ranking": {
    "user_001": {
      "nombreJugador": "Juan García",
      "puntosTotales": 15.5,
      "participaciones": 2,
      "posicion": 1,
      "historial": [6.5, 9]
    }
  }
}
```

### Ligas
```json
{
  "id": "liga_001",
  "nombre": "Liga de Amigos",
  "descripcion": "...",
  "estado": "activa" | "finalizada",
  "creador": "user_001",
  "fechaInicio": timestamp,
  "fechaFin": null | timestamp,
  "miembros": ["user_001", "user_002"],
  "partidas": ["match_001"],
  "ranking": {
    "user_001": {
      "nombreJugador": "Juan García",
      "puntosTotales": 15.5,
      "partidas": 2,
      "posicion": 1,
      "promedio": 7.75
    }
  }
}
```

---

## 🔄 Flujos de Uso

### Crear un Jugador
1. Ir a `/players`
2. Click en "+ Crear Jugador"
3. Completar nombre, email
4. Se guarda automáticamente en Firestore

### Crear una Partida
1. Ir a `/matches`
2. Click en "+ Nueva Partida"
3. Ingresar nombre y seleccionar jugadores
4. Opcionalmente asignar a una copa/liga
5. Se crea documento con estado "activa"

### Cargar Resultados
1. En `/matches/[id]/resultado`
2. Ingresar colonias internas y externas por jugador
3. Marcar ganadores
4. Click "Finalizar Partida"
5. **Cloud Function calcula automáticamente:**
   - Puntos de cada jugador
   - Actualiza ranking de copa/liga
   - Actualiza stats del jugador

### Crear Copa
1. Ir a `/copas`
2. Click en "+ Crear Copa"
3. Ingresar nombre, fechas, etc.
4. Se crea con estado "planificada"
5. Al crear una partida, associarla a la copa

### Ver Rankings
1. `/copas/[id]` - Ver ranking de copa
2. `/ligas/[id]` - Ver ranking de liga

---

## ⚙️ Cálculo de Puntos (Automático)

Cuando se finaliza una partida:

```
Puntos Colonias = (internas × 1) + (externas × 2)
Puntos Victoria = total_jugadores / ganadores
Puntos Totales = Puntos Colonias + (Puntos Victoria si es ganador)

Ejemplo (5 jugadores, 2 ganadores):
- Jugador A: 2 internas, 1 externa, GANADOR
  = (2×1) + (1×2) + (5/2) = 2 + 2 + 2.5 = 6.5 pts
- Jugador B: 3 internas, 2 externas, GANADOR
  = (3×1) + (2×2) + (5/2) = 3 + 4 + 2.5 = 9.5 pts
- Jugador C: 1 interna, 0 externas, NO GANADOR
  = (1×1) + (0×2) + 0 = 1 pt
```

---

## 🔐 Seguridad

Las Firestore Rules están configuradas para:
- ✅ Solo usuarios autenticados pueden leer
- ✅ Usuarios solo pueden editar sus propios datos
- ✅ Cloud Functions pueden actualizar rankings
- ✅ Admin puede hacer cualquier cosa

Las reglas están en [firestore.rules](firestore.rules)

---

## 📊 Monitoreo

### Ver logs de Cloud Functions
```bash
firebase functions:log
```

### Ver datos en Firestore
1. Firebase Console → Firestore Database
2. Navegar por colecciones

### Emuladores
```bash
firebase emulators:start
```

---

## ❓ Problemas Comunes

### "Cloud Function no encontrada"
→ Ejecutar: `firebase deploy --only functions`

### "Permiso denegado al escribir"
→ Verificar Firestore Rules en Firebase Console

### "Rankings no se actualizan"
→ Ver logs: `firebase functions:log`

### Puntos no calculados correctamente
→ Verificar estructura de datos en CargaResultados.jsx

---

## 📝 Notas Importantes

1. **Cloud Functions son la clave**: Todos los cálculos de puntos suceden aquí, no en el cliente
2. **Firestore Rules**: Protegen tu base de datos
3. **Indexación**: Los índices se crean automáticamente en FireStore
4. **Timestamps**: Firebase FieldValue.serverTimestamp() evita problemas de sincronización
5. **Transacciones**: Los updates de rankings usan batch writes

---

## ✨ Características Implementadas

- ✅ CRUD completo de Jugadores
- ✅ Crear y gestionar Partidas
- ✅ Cargar resultados con cálculo automático de puntos
- ✅ Crear Copas con rankings automáticos
- ✅ Crear Ligas con gestión de miembros
- ✅ Estadísticas en tiempo real
- ✅ Validaciones en cliente y servidor
- ✅ Cloud Functions para seguridad
- ✅ Firestore Rules para protección
- ✅ Navegación integrada

---

## 🎯 Próximas Mejoras (Opcional)

1. Autenticación real (Google/Email)
2. Avatar upload a Firebase Storage
3. Notificaciones en tiempo real
4. Exportar resultados (PDF/CSV)
5. Gráficos de desempeño
6. Invitaciones a copas/ligas
7. Sistema de comentarios
8. Historial de cambios
9. Rankings históricos
10. Comparativa entre jugadores

---

¡Listo para usar! 🚀
