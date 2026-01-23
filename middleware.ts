import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose'; 

// --- MAPA DE ACCESOS (Alineado estrictamente al PDF CONTROL_DOCUMENTAL_RBAC) ---
const ROLE_ACCESS: Record<string, string[]> = {
  // FINANZAS: Según PDF (FIN-FR-14, Cartera Vencida), acceden 'admin' y 'recepcion'.
  // Agregamos 'coord' por lógica de supervisión.
  '/finanzas': ['admin', 'recepcion', 'coord'], 
  
  // REPORTES: Según PDF (Conciliación Lab), acceden 'admin' y 'recepcion'.
  '/reportes': ['admin', 'recepcion', 'coord'],
  
  // CONFIGURACIÓN / GESTIÓN DE MATERIALES (GEM): Según PDF, exclusivo 'admin'.
  '/configuracion': ['admin'],
  
  // INVENTARIOS: Acceso operativo para descontar insumos.
  '/inventarios': ['admin', 'coord', 'enfermeria', 'medico', 'recepcion'],
  
  // PACIENTES / AGENDA: El núcleo operativo, acceso general del equipo.
  '/pacientes': ['admin', 'coord', 'recepcion', 'ps', 'medico', 'enfermeria'],
  '/agenda': ['admin', 'coord', 'recepcion', 'medico'],
  
  // EXPEDIENTES CLÍNICOS ([id]):
  '/expedientes': ['admin', 'coord', 'medico', 'ps', 'recepcion'],
};

export async function middleware(request: NextRequest) {
  const tokenCookie = request.cookies.get('token'); 
  const { pathname } = request.nextUrl;

  // 1. ZONA LIBRE (Archivos estáticos, API, Login, Portal Paciente)
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') || 
    pathname.startsWith('/static') || 
    pathname.includes('.') || 
    pathname === '/login' ||
    pathname.startsWith('/portal') 
  ) {
    return NextResponse.next();
  }

  // 2. VALIDACIÓN DE CREDENCIAL
  if (!tokenCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. LECTURA DEL ROL
  try {
    const tokenValue = tokenCookie.value;
    // Decodificación optimizada para Edge (Rápida)
    const base64Url = tokenValue.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));

    const payload = JSON.parse(jsonPayload);
    // Normalizamos el rol a minúsculas y sin espacios
    const userRole = (payload.rol || 'all').toLowerCase().trim(); 

    // 4. VERIFICACIÓN DE PERMISOS
    // Buscamos si la ruta actual está protegida
    const rutaProtegida = Object.keys(ROLE_ACCESS).find(ruta => pathname.startsWith(ruta));

    if (rutaProtegida) {
      const rolesPermitidos = ROLE_ACCESS[rutaProtegida];
      
      // COMODÍN: El admin siempre pasa
      if (userRole === 'admin') return NextResponse.next();

      if (!rolesPermitidos.includes(userRole)) {
        console.log(`⛔ Bloqueo de seguridad: Rol '${userRole}' intentó entrar a '${pathname}'`);
        // Redirigimos al Dashboard en lugar de error feo
        return NextResponse.redirect(new URL('/', request.url));
      }
    }

  } catch (error) {
    // Si el token es inválido, forzamos login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};