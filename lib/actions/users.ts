//lib/actions/users.ts
"use server";
import { getUsuariosSheet } from "@/lib/googleSheets";
import { auth, db } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";

/**
 * Genera una contraseña aleatoria de 12 caracteres
 */
function generateRandomPassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  return Array.from({ length: 12 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
}

/**
 * ACCIÓN: Crear Usuario con Súper Poderes
 */
export async function createSANSCEUser(formData: {
  email: string;
  nombre: string;
  rol: 'admin_general' | 'coordinacion_admin' | 'atu' | 'medico_renta' | 'profesional_salud' | 'reloj_checador';
  especialidad?: string;
  pin: string; // 👈 NUEVO: Campo PIN obligatorio
}) {
  try {
    const temporaryPassword = generateRandomPassword();

    // 1. Crear en Firebase Auth
    const userRecord = await auth.createUser({
      email: formData.email,
      password: temporaryPassword,
      displayName: formData.nombre,
    });

    // 2. Definir Permisos Base por Rol (Estructura Flexible)
    const defaultPermissions = {
      admin_general: ["all"],
      coordinacion_admin: ["view_reports", "manage_agenda", "view_kpis"],
      atu: ["manage_agenda", "process_payments", "fill_checklists"],
      medico_renta: ["view_own_agenda", "clinical_record_write"],
      profesional_salud: ["view_agenda", "clinical_record_full", "view_own_kpis"],
      reloj_checador: ["clock_in_out_only"]
    };

    // 3. Guardar en Firestore (Colección usuarios_roles)
    await db.collection("usuarios_roles").doc(userRecord.uid).set({
      email: formData.email,
      nombre: formData.nombre,
      rol: formData.rol,
      pin: formData.pin, // 👈 REGISTRO: Guardamos el PIN en la ficha del empleado
      especialidad: formData.especialidad || "N/A",
      permisos: defaultPermissions[formData.rol] || [],
      fechaCreacion: new Date().toISOString(),
      estatus: "activo"
    });

    // 4. TODO: Aquí integrarás tu servicio de mailing (ej. Resend) para enviar la password
    console.log(`✅ Usuario creado: ${formData.email} | Password Temporal: ${temporaryPassword}`);

    revalidatePath("/configuracion");
    return { success: true, message: "Usuario creado exitosamente" };

  } catch (error: any) {
    console.error("Error creando usuario:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ACCIÓN: Obtener lista de personal (Supervisión)
 */
export async function getSANSCEUsers() {
  try {
    const snapshot = await db.collection("usuarios_roles").orderBy("fechaCreacion", "desc").get();
    const users = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));
    return { success: true, users: JSON.parse(JSON.stringify(users)) };
  } catch (error: any) {
    console.error("Error listando usuarios:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ACCIÓN: KILL SWITCH (Baja definitiva)
 */
export async function deleteSANSCEUser(uid: string) {
  try {
    // 1. Revocar acceso en Firebase Auth (No podrá loguearse más)
    await auth.deleteUser(uid);

    // 2. Eliminar perfil en Firestore
    await db.collection("usuarios_roles").doc(uid).delete();

    revalidatePath("/configuracion");
    return { success: true, message: "Usuario eliminado del sistema" };
  } catch (error: any) {
    console.error("Error eliminando usuario:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ACCIÓN: MOTOR DE MIGRACIÓN HÍBRIDA (Sheets -> Firebase)
 * Une los dos mundos: respeta a los usuarios actuales y da de alta a los nuevos.
 */
export async function migrateUsersFromSheet() {
  try {
    const sheetUsers = await getUsuariosSheet();
    let created = 0;
    let updated = 0;

    for (const sUser of sheetUsers) {
      if (!sUser.email) continue;

      let authUser;
      try {
        // 🔍 COTEJO: ¿Ya existe en Firebase Auth?
        authUser = await auth.getUserByEmail(sUser.email);
      } catch (e) {
        // No existe, procederemos a crear
      }

      // 🧠 CLASIFICACIÓN DINÁMICA DE ROLES SANSCE
      type ValidRoles = 'admin_general' | 'coordinacion_admin' | 'atu' | 'profesional_salud' | 'medico_renta';
      let finalRol: ValidRoles = 'atu';
      const rawRol = (sUser.rol || "").toLowerCase();
      const equipo = sUser.equipoId; 

      if (rawRol === 'admin') {
        finalRol = 'admin_general'; 
      } else if (rawRol === 'coordinador') {
        finalRol = 'coordinacion_admin';
      } else {
        finalRol = (equipo === 'Cli') ? 'profesional_salud' : 'atu';
      }

      let uid: string = "";

      // 1. GESTIÓN EN FIREBASE AUTH
      if (!authUser) {
        const tempPass = generateRandomPassword();
        const newUser = await auth.createUser({
          email: sUser.email,
          password: tempPass,
          displayName: sUser.nombre,
        });
        uid = newUser.uid;
        console.log(`📦 Migración: Nuevo acceso para ${sUser.email} | Pass: ${tempPass}`);
        created++;
      } else {
        uid = authUser.uid; // Si ya existe, tomamos su ID real
        updated++;
      }

      // 2. GESTIÓN DE PERMISOS (Firestore)
      const defaultPermissions = {
        admin_general: ["all"],
        coordinacion_admin: ["view_reports", "manage_agenda", "view_kpis"],
        atu: ["manage_agenda", "process_payments", "fill_checklists"],
        profesional_salud: ["view_agenda", "clinical_record_full", "view_own_kpis"],
        medico_renta: ["view_own_agenda", "clinical_record_write"]
      };

      await db.collection("usuarios_roles").doc(uid).set({
        email: sUser.email,
        nombre: sUser.nombre,
        rol: finalRol,
        especialidad: (equipo === 'Cli') ? "Clínica" : "Administración",
        permisos: defaultPermissions[finalRol] || [],
        fechaCreacion: new Date().toISOString(),
        estatus: "activo",
        fuente: "migracion_sheets_v1"
      });
    }

    revalidatePath("/configuracion");
    return { 
      success: true, 
      message: `Migración exitosa: ${created} nuevos accesos creados y ${updated} perfiles actualizados.` 
    };

  } catch (error: any) {
    console.error("❌ Error en Motor de Migración:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ACCIÓN: Actualizar Usuario (Edición Quirúrgica)
 * Sincroniza el cambio en Auth y Firestore simultáneamente.
 */
export async function updateSANSCEUser(uid: string, data: {
  nombre: string;
  rol: 'admin_general' | 'coordinacion_admin' | 'atu' | 'medico_renta' | 'profesional_salud' | 'reloj_checador';
  especialidad: string;
  pin: string;
  fotoMaestraUrl?: string; // 👈 BIOMETRÍA: Recibimos el enlace al patrón oficial
}) {
  try {
    // 1. Actualizar Nombre en Firebase Auth
    await auth.updateUser(uid, {
      displayName: data.nombre,
    });

    // 2. Mapeo de Permisos según nuevo Rol (Gobernanza SANSCE)
    const defaultPermissions = {
      admin_general: ["all"],
      coordinacion_admin: ["view_reports", "manage_agenda", "view_kpis"],
      atu: ["manage_agenda", "process_payments", "fill_checklists"],
      medico_renta: ["view_own_agenda", "clinical_record_write"],
      profesional_salud: ["view_agenda", "clinical_record_full", "view_own_kpis"],
      reloj_checador: ["clock_in_out_only"]
    };

    // 3. Actualizar Perfil en Firestore
    const updatePayload: any = {
      nombre: data.nombre,
      rol: data.rol,
      pin: data.pin,
      especialidad: data.especialidad,
      permisos: defaultPermissions[data.rol] || [],
      ultimaModificacion: new Date().toISOString()
    };

    // 🛡️ REGLA SANSCE: Solo actualizamos la foto si se envía una nueva.
    // Esto evita que al editar el nombre se borre accidentalmente el patrón biométrico.
    if (data.fotoMaestraUrl) updatePayload.fotoMaestraUrl = data.fotoMaestraUrl;

    await db.collection("usuarios_roles").doc(uid).update(updatePayload);

    revalidatePath("/configuracion");
    return { success: true, message: "Usuario actualizado correctamente" };

  } catch (error: any) {
    console.error("Error actualizando usuario:", error);
    return { success: false, error: error.message };
  }
}