import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rutas que requieren autenticación
const protectedRoutes = ['/dashboard', '/pacientes', '/agenda', '/finanzas', '/reportes', '/inventarios'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verificamos si la ruta es protegida
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // Buscamos la cookie de sesión (Firebase suele guardar token, o tu AuthProvider)
  // Nota: Al usar Firebase Auth en cliente, el middleware es limitado, 
  // pero podemos verificar si existe alguna cookie básica de sesión si la implementamos.
  // Por ahora, prepararemos la estructura para redirigir si intenta entrar a zonas restringidas sin lógica.
  
  // Si quisiéramos ser estrictos:
  // const session = request.cookies.get('session');
  // if (isProtectedRoute && !session) {
  //   return NextResponse.redirect(new URL('/login', request.url));
  // }

  return NextResponse.next();
}

// Configuración de rutas donde aplica el middleware
export const config = {
  matcher: [
    /*
     * Coincidir con todas las rutas excepto:
     * - api (API routes)
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico (favicon)
     * - login (ruta pública)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
  ],
};