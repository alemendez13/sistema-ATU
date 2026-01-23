import { NextResponse } from 'next/server';
import { db, auth } from 'lib/firebase-admin'; 

export async function GET() {
  try {
    // 1. Obtenemos todos los usuarios registrados en Firestore
    // Asumimos que existe una colección "usuarios" donde guardas el perfil de cada persona
    const usersSnapshot = await db.collection('usuarios').get();
    
    const reporte = [];
    const rolesValidos = ['admin', 'coord', 'recepcion', 'ps', 'medico', 'all'];

    for (const doc of usersSnapshot.docs) {
      const datos = doc.data();
      const uid = doc.id;
      
      // 2. Buscamos el campo 'rol' en el documento del usuario.
      // Convertimos a minúsculas para evitar errores (Admin vs admin)
      let rolUsuario = (datos.rol || 'all').toLowerCase().trim();

      // Validación de seguridad: Si tiene un rol raro, lo bajamos a 'all'
      if (!rolesValidos.includes(rolUsuario)) {
        rolUsuario = 'all'; 
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