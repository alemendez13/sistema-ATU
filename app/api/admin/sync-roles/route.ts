/* app/api/admin/sync-roles/route.ts */
import { NextResponse } from 'next/server';
import { db, auth } from 'lib/firebase-admin'; 

export async function GET() {
  try {
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
      if (rolUsuario === 'admin') rolUsuario = 'admin_general';
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