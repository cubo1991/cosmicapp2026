# 🔐 Guía de Protección de Rutas Administrativas

## Estado Actual

El panel de administrador está **completamente funcional en modo desarrollo** sin autenticación.

### ✅ Lo que está listo:
- ✓ Panel de admin con 5 secciones (Estadísticas, Jugadores, Partidas, Copas, Ligas)
- ✓ Middleware preparado para protección
- ✓ Hooks para gestión de autenticación
- ✓ Página de login preparada
- ✓ Componentes de protección de rutas
- ✓ Estructura de permisos y roles

## Implementación de Autenticación

### Paso 1: Configurar Firebase Authentication

1. En Firebase Console, activar Email/Password o Google Auth
2. Guardar credenciales en `.env.local`

### Paso 2: Crear API de Autenticación

**Crear archivo: `src/app/api/auth/admin-login/route.js`**

```javascript
import { auth } from '@/firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';

export async function POST(request) {
  const { email, password } = await request.json();

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Verificar si es admin (leer de Firestore)
    const isAdmin = await checkIfAdmin(user.uid);

    if (!isAdmin) {
      return new Response('No autorizado', { status: 403 });
    }

    // Generar JWT token
    const token = await user.getIdToken();

    return new Response(JSON.stringify({
      success: true,
      token,
      role: 'admin',
      user: {
        uid: user.uid,
        email: user.email
      }
    }), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), { status: 401 });
  }
}

async function checkIfAdmin(userId) {
  // Leer de Firestore si el usuario tiene rol de admin
  // Ejemplo:
  // const docRef = doc(db, 'users', userId);
  // const docSnap = await getDoc(docRef);
  // return docSnap.data()?.role === 'admin';
}
```

### Paso 3: Crear API de Verificación

**Crear archivo: `src/app/api/auth/admin-check/route.js`**

```javascript
import { verifyIdToken } from '@/firebase/auth-server'; // Usar SDK admin

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return new Response(JSON.stringify({
      isAdmin: false,
      error: 'No token'
    }), { status: 401 });
  }

  try {
    const decodedToken = await verifyIdToken(token);
    const isAdmin = await checkIfAdmin(decodedToken.uid);

    return new Response(JSON.stringify({
      isAdmin,
      user: decodedToken
    }), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({
      isAdmin: false,
      error: 'Invalid token'
    }), { status: 401 });
  }
}
```

### Paso 4: Descomentar Código de Protección

**En: `useAdminAccess.js`**
```javascript
// Descomentar la sección TODO
```

**En: `middleware.js`**
```javascript
// Descomentar las validaciones
```

**En: `/admin/login/page.js`**
```javascript
// Descomentar la lógica de login
```

### Paso 5: Configurar Firestore para Roles

**Estructura de documento de usuario:**
```json
{
  "uid": "user123",
  "email": "admin@example.com",
  "role": "admin",
  "permissions": [
    "manage_players",
    "manage_matches",
    "manage_copas",
    "manage_ligas",
    "view_statistics"
  ],
  "createdAt": "2026-04-16"
}
```

**Firestore Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Solo admins pueden acceder al panel
    match /admin/{document=**} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

## Rutas Protegidas

- `/admin` - Panel principal (requiere admin)
- `/admin/login` - Login (público)
- `/api/auth/admin-login` - API de login (público)
- `/api/auth/admin-check` - API de verificación (autenticado)

## Verificación de Permisos Granulares

```javascript
// En componentes:
import { useAdminAccess } from '@/hooks/useAdminAccess';

export function AdminPanel() {
  const { checkPermission } = useAdminAccess();

  return (
    <>
      {checkPermission('manage_players') && <AdminJugadores />}
      {checkPermission('manage_matches') && <AdminPartidas />}
    </>
  );
}
```

## Testing sin Autenticación (Desarrollo)

El sistema está configurado para permitir:
1. Acceso directo a `/admin` sin login
2. Descomentar líneas TODO cuando estés listo para implementar auth
3. Cambiar `isAdmin: true` a `isAdmin: false` en `useAdminAccess.js` para probar redirecciones

## Checklist de Implementación

- [ ] Firebase Auth configurado
- [ ] API `/api/auth/admin-login` creada
- [ ] API `/api/auth/admin-check` creada
- [ ] Estructura de usuarios en Firestore
- [ ] Firestore Rules actualizadas
- [ ] Descomentar código en useAdminAccess.js
- [ ] Descomentar código en middleware.js
- [ ] Descomentar código en /admin/login/page.js
- [ ] Probar login con acuenta de admin
- [ ] Probar redirección con usuario no-admin
- [ ] Verificar tokens en cookies/localStorage

## Soporte Futuro

- [ ] Two-Factor Authentication (2FA)
- [ ] Recuperación de contraseña
- [ ] Gestión de roles (admin, moderator, viewer)
- [ ] Auditoría de acciones
- [ ] Logs de acceso
