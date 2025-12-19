import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 1. ZONAS SEGURAS: Aquí definimos qué rutas son privadas
const protectedRoutes = [
  '/dashboard',
  '/pacientes',
  '/agenda',
  '/finanzas',
  '/inventarios',
  '/reportes'
];

// 2. RUTAS DE AUTENTICACIÓN: Rutas para gente NO logueada
const authRoutes = ['/login'];

export function middleware(request: NextRequest) {
  // Obtenemos la cookie de sesión (El "Gafete" del usuario)
  // Nota: Firebase suele usar cookies llamadas 'session' o tokens. 
  // Si tu login es 100% visual, a veces esta cookie tarda en viajar.
  const session = request.cookies.get('session') || request.cookies.get('token'); 

  const { pathname } = request.nextUrl;

  // A. SI INTENTA ENTRAR A RUTA PROTEGIDA
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    // Si no trae gafete (session), lo mandamos al Login
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      // (Opcional) Le guardamos a dónde quería ir para regresarlo después
      loginUrl.searchParams.set('from', pathname); 
      return NextResponse.redirect(loginUrl);
    }
  }

  // B. SI YA TIENE GAFETE Y QUIERE IR AL LOGIN
  if (authRoutes.includes(pathname)) {
    if (session) {
      // Si ya está logueado, ¿para qué ir al login? Lo mandamos al Dashboard
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

// 3. CONFIGURACIÓN: Le decimos a Next.js que este guardia vigile todo
// menos los archivos estáticos (imágenes, iconos, etc.)
export const config = {
  matcher: [
    /*
     * Coincidir con todas las rutas de solicitud excepto las que comienzan con:
     * - api (rutas API)
     * - _next/static (archivos estáticos)
     * - _next/image (archivos de optimización de imágenes)
     * - favicon.ico (archivo favicon)
     * - portal (La zona pública de pacientes)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|portal).*)',
  ],
}