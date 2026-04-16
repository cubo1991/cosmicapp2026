# CosmicApp 2026 - Sistema de Gestión de Partidas

Sistema completo para gestionar partidas, jugadores, copas y ligas con Next.js y Firebase.

## 📋 Características

- ✅ Gestión de Jugadores (CRUD)
- ✅ Creación y gestión de Partidas
- ✅ Sistema de Copas con Rankings
- ✅ Sistema de Ligas con Miembros
- ✅ Cálculo automático de puntos
- ✅ Rankings dinámicos
- ✅ Estadísticas de jugadores
- ✅ Firestore Rules de seguridad

## 🚀 Instalación y Setup

### 1. Instalar dependencias

```bash
# Raíz del proyecto
npm install

# Instalar Firebase CLI globalmente
npm install -g firebase-tools

# Cloud Functions
cd functions
npm install
cd ..
```

### 2. Configurar Firebase

```bash
# Login en Firebase
firebase login

# Inicializar Firebase (si no está hecho)
firebase init
```

### 3. Variables de entorno

Crear archivo `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 4. Crear colecciones en Firestore

En la consola de Firebase, crear las siguientes colecciones vacías:
- `players`
- `matches`
- `copas`
- `ligas`

### 5. Cargar Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 6. Desplegar Cloud Functions

```bash
firebase deploy --only functions
```

## 📁 Estructura del Proyecto

```
cosmicapp2026/
├── src/
│   ├── app/
│   │   ├── layout.js
│   │   ├── page.js
│   │   ├── players/
│   │   │   ├── page.js          # Lista de jugadores
│   │   │   ├── [id]/page.js     # Detalle de jugador
│   │   │   └── new/page.js
│   │   ├── matches/
│   │   │   ├── page.js          # Crear partidas
│   │   │   └── [id]/resultado/page.js
│   │   ├── copas/
│   │   │   ├── page.js          # Lista de copas
│   │   │   └── [id]/page.js     # Detalle y ranking
│   │   └── ligas/
│   │       ├── page.js          # Lista de ligas
│   │       └── [id]/page.js     # Detalle y ranking
│   ├── components/
│   │   ├── forms/
│   │   │   ├── CrearJugador.jsx
│   │   │   ├── CrearPartida.jsx
│   │   │   ├── CargaResultados.jsx
│   │   │   ├── CrearCopa.jsx
│   │   │   └── CrearLiga.jsx
│   │   └── tables/
│   │       ├── RankingCopa.jsx
│   │       └── RankingLiga.jsx
│   ├── hooks/
│   │   ├── usePlayer.js
│   │   ├── useMatch.js
│   │   ├── useCopa.js
│   │   └── useLiga.js
│   ├── services/
│   │   ├── playerService.js
│   │   ├── matchService.js
│   │   ├── copaService.js
│   │   ├── ligaService.js
│   │   └── scoringService.js
│   ├── firebase/
│   │   ├── config.js
│   │   ├── auth.js
│   │   ├── db.js
│   │   └── functions.js
│   ├── store/
│   │   └── useStore.js
│   └── utils/
│       ├── colors.js
│       ├── generadorDeCodigo.js
│       └── validaciones.js
├── functions/
│   ├── index.js              # Cloud Functions
│   ├── package.json
│   └── .gitignore
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
└── package.json
```

## 🔄 Flujo de Datos

### Crear Partida
1. Usuario selecciona jugadores
2. Se crea documento en `matches` con estado "activa"
3. Se agrega a copa/liga si aplica

### Cargar Resultados
1. Usuario ingresa colonias internas/externas y ganadores
2. **Cloud Function calcula puntos automáticamente**
3. Se actualiza ranking de copa/liga
4. Se actualizan estadísticas del jugador

### Cálculo de Puntos
```
Puntos Colonias = (internas × 1) + (externas × 2)
Puntos Victoria = total_jugadores / ganadores
Puntos Totales = Puntos Colonias + (Puntos Victoria si es ganador)
```

## 🔐 Seguridad

### Firestore Rules
- Solo usuarios autenticados pueden leer
- Cada usuario solo puede editar sus propios datos
- Cloud Functions pueden actualizar rankings
- Admin puede hacer cualquier cosa

### Cloud Functions
- Validación de datos en servidor
- Cálculos de puntos seguros (no desde cliente)
- Auditoría de cambios

## 🧪 Testing

### Emuladores Locales
```bash
firebase emulators:start
```

Acceder a: http://localhost:4000

### Tests de Servicios
```bash
npm test
```

## 📊 Base de Datos

### Estructura de Jugador
```json
{
  "id": "user_001",
  "name": "Juan García",
  "email": "juan@example.com",
  "avatar": "https://...",
  "createdAt": 1713264000000,
  "stats": {
    "partidas": 12,
    "victorias": 4,
    "puntosPromedio": 8.5,
    "ultimaPartida": 1713264000000
  },
  "copas": ["copa_001"],
  "ligas": ["liga_001"]
}
```

### Estructura de Partida
```json
{
  "id": "match_001",
  "nombre": "Partida Casual",
  "copId": "copa_001",
  "ligaId": null,
  "estado": "finalizada",
  "fechaCreacion": 1713264000000,
  "fechaFinalizacion": 1713267600000,
  "jugadores": {
    "user_001": {
      "nombre": "Juan García",
      "coloniasInternas": 2,
      "coloniasExternas": 1,
      "esGanador": true,
      "puntos": 6.5,
      "posicion": 1
    }
  }
}
```

## 🎯 Próximos Pasos

1. **Autenticación**: Integrar Google Auth
2. **Notificaciones**: Avisos de partidas creadas
3. **Exportar**: CSV/PDF de resultados
4. **Análisis**: Gráficos de desempeño
5. **Invitaciones**: Sistema de invitación a copas/ligas

## 📝 Notas

- Las Cloud Functions se ejecutan automáticamente al finalizar una partida
- Los rankings se actualizan en tiempo real
- Usar emuladores para development local
- Siempre hacer deploy de rules antes que functions

## ❓ Troubleshooting

### Error: "Function no encontrada"
```bash
firebase deploy --only functions
```

### Error: "Permiso denegado"
- Verificar Firestore Rules
- Asegurarse de estar autenticado
- Verificar tokens en consola

### Rankings no se actualizan
- Verificar Cloud Functions log: `firebase functions:log`
- Validar estructura de datos

## 📞 Soporte

Para reportar bugs o sugerencias, crear un issue en el proyecto.
