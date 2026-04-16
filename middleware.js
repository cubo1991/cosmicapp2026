import { NextResponse } from 'next/server';

/**
 * Middleware para proteger rutas administrativas
 * 
 * CONFIGURACIÓN LISTA PARA:
 * 1. Verificación de autenticación (Auth)
 * 2. Verificación de rol de administrador
 * 3. Verificación de permisos específicos
 * 
 * Actualmente permite acceso a todos.
 * Descomentar validaciones cuando se implemente auth.
 */

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Rutas protegidas (admin)
  const adminRoutes = ['/admin'];

  // Verificar si la ruta actual es una ruta protegida
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));

  if (isAdminRoute) {
    // TODO: Descomentar cuando se implemente autenticación
    /*
    const authToken = request.cookies.get('auth_token')?.value;
    const userRole = request.cookies.get('user_role')?.value;

    if (!authToken) {
      // Redirigir a login si no tiene token
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (userRole !== 'admin') {
      // Redirigir a home si no es admin
      return NextResponse.redirect(new URL('/', request.url));
    }
    */

    // Por ahora, permitir acceso a todos
    // Esto mantiene la ruta funcionando durante desarrollo
  }

  return NextResponse.next();
}

export const config = {
  // Aplicar middleware a rutas específicas
  matcher: ['/admin/:path*'],
};
