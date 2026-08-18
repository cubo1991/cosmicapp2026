import { NextResponse } from 'next/server';

// ponytail: /admin no se protege acá a propósito. Firebase Auth (client SDK)
// no expone sesión al middleware sin cookies de sesión + verificación con
// Admin SDK, que es infraestructura aparte. La protección real está en
// <AdminProtection> (src/components/admin/AdminProtection.jsx) y en las
// Firestore rules (isAdmin() en firestore.rules), que es donde de verdad
// se puede leer/escribir. Upgrade a esto si hace falta ocultar el layout
// del panel antes del primer render: exchange de session cookie + Admin SDK
// en un route handler, y verificarla acá.
export function middleware(request) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
