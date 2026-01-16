/* middleware.ts */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Definimos las rutas que SÍ o SÍ requieren protección
const protectedRoutes = [
  '/dashboard',
  '/pacientes',
  '/agenda',
  '/finanzas',
  '/inventarios',
  '/reportes',
  '/configuracion',
  '/expedientes'
];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token'); 
  const { pathname } = request.nextUrl;

  // 1. EXCEPCIONES: Si es archivo estático, api interna o portal externo, DEJAR PASAR.
  // Esto previene bloqueos accidentales a imágenes o scripts.
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') || 
    pathname.startsWith('/static') || 
    pathname.includes('.') || // Archivos con extensión (.png, .css)
    pathname.startsWith('/portal') // Portal de pacientes externo
  ) {
    return NextResponse.next();
  }

  // 2. PROTECCIÓN: Si intenta entrar a zona privada...
  // Verificamos si la ruta actual empieza con alguna de las protegidas
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route)) || pathname === '/';

  if (isProtectedRoute) {
    // ...y NO trae gafete (token)
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      // Guardamos a donde quería ir para redirigirlo después (Opcional, pero buena práctica)
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. REDIRECCIÓN INVERSA: Si ya tiene gafete y quiere ir al login, lo mandamos al Dashboard
  if (pathname === '/login' && token) {
      return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // El matcher se simplifica porque ya manejamos las excepciones arriba manualmente
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}