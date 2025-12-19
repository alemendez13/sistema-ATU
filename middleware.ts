import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ZONAS SEGURAS
const protectedRoutes = [
  '/dashboard',
  '/pacientes',
  '/agenda',
  '/finanzas',
  '/inventarios',
  '/reportes'
];

export function middleware(request: NextRequest) {
  // 🟢 El guardia busca el gafete llamado "token"
  const token = request.cookies.get('token'); 
  const { pathname } = request.nextUrl;

  // Si intenta entrar a zona privada...
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    // ...y NO trae gafete
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Si ya tiene gafete y quiere ir al login, lo mandamos al inicio
  if (pathname === '/login' && token) {
      return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|portal).*)'],
}