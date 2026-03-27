//middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// @ts-ignore - Evita que VSC marque error por falta de tipos en la librería jose
import { jwtVerify } from 'jose';

// --- MAPA DE ACCESOS (Alineado estrictamente al PDF CONTROL_DOCUMENTAL_RBAC) ---
const ROLE_ACCESS: Record<string, string[]> = {
  // RECURSOS HUMANOS: Acceso al Reloj Checador, Expedientes e Incidencias.
  '/personal': ['admin_general', 'coordinacion_admin', 'atu'],

  // CONTROL TOTAL: Configuración del Sistema.
  '/configuracion': ['admin_general'],
  
  // GESTIÓN INTEGRAL: Finanzas y Reportes.
  '/reportes': ['admin_general', 'coordinacion_admin', 'atu'],
  '/finanzas': ['admin_general', 'coordinacion_admin', 'atu'], 
  
  // OPERACIÓN CLÍNICA: Agenda y Directorio.
  '/agenda': ['admin_general', 'coordinacion_admin', 'atu', 'medico_renta', 'profesional_salud'],
  '/pacientes': ['admin_general', 'coordinacion_admin', 'atu', 'profesional_salud'],
  
  // ÁREA MÉDICA E INVENTARIOS.
  '/expedientes': ['admin_general', 'medico_renta', 'profesional_salud'],
  '/inventarios': ['admin_general', 'coordinacion_admin', 'profesional_salud', 'atu'],
};

export async function middleware(request: NextRequest) {
  const tokenCookie = request.cookies.get('token'); 
  const { pathname } = request.nextUrl;

  // 1. ZONA LIBRE (Archivos estáticos, API, Login, Portal Paciente, Aprobación de Gastos)
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') || 
    pathname.startsWith('/static') || 
    pathname.includes('.') || 
    pathname === '/login' ||
    pathname.startsWith('/portal') ||
    pathname.startsWith('/validar-gasto') // 🎟️ Pase VIP SANSCE: Aprobación vía Email
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
      
      // COMODÍN DE MANDO: El admin_general siempre tiene paso libre.
      if (userRole === 'admin' || userRole === 'admin_general') return NextResponse.next();

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