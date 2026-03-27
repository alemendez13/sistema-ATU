/* app/api/admin/sync-roles/route.ts */
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db, auth } from 'lib/firebase-admin';

import { cookies } from 'next/headers';

export async function GET() {
  try {
    // 🛡️ CERROJO DE SEGURIDAD SANSCE
    const cookieStore = cookies();
    const tokenValue = cookieStore.get('token')?.value;

    if (!tokenValue) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // Decodificamos el rol directamente del token para no gastar lecturas de base de datos
    const base64Url = tokenValue.split('.')[1];
    const payload = JSON.parse(atob(base64Url));
    
    if (payload.rol !== 'admin_general' && payload.rol !== 'admin') {
      return NextResponse.json({ error: "Acceso restringido solo a Dirección" }, { status: 403 });
    }
    // 1. UNIFICACIÓN SANSCE: Ahora leemos de la colección maestra de roles
    const usersSnapshot = await db.collection('usuarios_roles').get();
    
    const reporte = [];
    // NUEVA MATRIZ DE ROLES SANSCE OS
    const rolesValidos = [
      'admin_general', 
      'coordinacion_admin', 
      'atu', 
      'medico_renta', 
      'profesional_salud'
    ];

    for (const doc of usersSnapshot.docs) {
      const datos = doc.data();
      const uid = doc.id;
      
      // Buscamos el rol en el nuevo campo 'rol' o en el antiguo para compatibilidad
      let rolUsuario = (datos.rol || 'invitado').toLowerCase().trim();

      // Mapeo de transición (Opcional: convierte roles viejos a nuevos automáticamente)
      // Traduce el lenguaje del Excel al lenguaje del Sistema
      if (rolUsuario === 'admin') rolUsuario = 'admin_general';
      if (rolUsuario === 'coordinador') rolUsuario = 'coordinacion_admin';
      if (rolUsuario === 'recepcion') rolUsuario = 'atu';

      if (!rolesValidos.includes(rolUsuario)) {
        rolUsuario = 'invitado'; 
      }

      // 3. Escribimos el "Sello Digital" (Custom Claim) en Firebase Auth
      await auth.setCustomUserClaims(uid, { rol: rolUsuario });
      
      reporte.push(`Usuario: ${datos.email || uid} -> Rol asignado: [${rolUsuario}]`);
    }

    return NextResponse.json({ 
      mensaje: "Sincronización Completada. Roles 'tatuados' en el sistema.", 
      roles_detectados: rolesValidos,
      detalles: reporte 
    });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}