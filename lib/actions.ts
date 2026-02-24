"use server"; 

import { calendar } from './calendarAPI';
import { unstable_cache } from 'next/cache';
import nodemailer from 'nodemailer'; 
import { v4 as uuidv4 } from 'uuid';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase'; 
// Unificamos las importaciones de googleSheets y agregamos el motor de OKRs
import { getMedicos, getMensajesWhatsApp, getCatalogos, getOkrDashboardData } from "./googleSheets";
import { addMinutesToTime, generateTaskId } from './utils';

// --- ACCIÓN 1: AGENDAR (Mantiene lógica original) ---
export async function agendarCitaGoogle(cita: { 
    calendarId: string;
    doctorNombre: string;
    fecha: string;
    hora: string;
    duracionMinutos?: number;
    pacienteNombre: string;
    motivo: string;
    doctorId?: string;
    esTodoElDia?: boolean;
}) {
    const calendarId = cita.calendarId;
    if (!calendarId) return { success: true, warning: "Sin calendario vinculado" };

    const startDateTime = new Date(`${cita.fecha}T${cita.hora}:00-06:00`); 
    const endDateTime = new Date(startDateTime.getTime() + (cita.duracionMinutos || 30) * 60000);

    const evento: any = {
        summary: cita.motivo,
        description: `Paciente: ${cita.pacienteNombre}\nRegistrado desde App SANSCE`,
        colorId: cita.esTodoElDia ? '2' : '11', 
    };

    if (cita.esTodoElDia) {
        evento.start = { date: cita.fecha };
        evento.end = { date: cita.fecha };
    } else {
        evento.start = { dateTime: startDateTime.toISOString(), timeZone: 'America/Mexico_City' };
        evento.end = { dateTime: endDateTime.toISOString(), timeZone: 'America/Mexico_City' };
    }

    try {
        const respuesta = await calendar.events.insert({
            calendarId: calendarId,
            requestBody: evento,
        });
        // ✅ CORRECCIÓN: Estandarizamos el nombre a 'eventId' para que VentaForm lo reconozca
        return { success: true, eventId: respuesta.data.id };
    } catch (error: any) {
        console.error("Error creando evento en Google:", error);
        return { success: false, error: error.message };
    }
}

// --- UTILIDAD: chunkArray (Se mantiene por compatibilidad) ---
function chunkArray<T>(myArray: T[], chunk_size: number): T[][]{ 
    var results: T[][] = [];
    let tempArray = [...myArray];
    while (tempArray.length) {
        results.push(tempArray.splice(0, chunk_size));
    }
    return results;
}

// --- ACCIÓN 2: LEER BLOQUEOS (VERSIÓN MEJORADA CON ID) ---
const getBloqueosRaw = async (date: string, medicos: { id: string; calendarId: string }[]): Promise<any[]> => {
    const timeMin = new Date(`${date}T00:00:00-06:00`).toISOString();
    const timeMax = new Date(`${date}T23:59:59-06:00`).toISOString();
    const todosLosBloqueos: any[] = [];

    try {
        await Promise.all(medicos.map(async (medico) => {
            if (!medico.calendarId) return;

            const response = await calendar.events.list({
                calendarId: medico.calendarId,
                timeMin,
                timeMax,
                singleEvents: true,
                timeZone: 'America/Mexico_City'
            });

            const eventos = response.data.items || [];

            eventos.forEach(evento => {
                // Manejo de tiempos para eventos con hora o de todo el día
                let current = new Date(evento.start?.dateTime || (evento.start?.date + "T00:00:00"));
                const end = new Date(evento.end?.dateTime || (evento.end?.date + "T23:59:59"));
                
                // Ignorar eventos que son puramente de "Todo el día" (sin hora específica)
                if (evento.start?.date && !evento.start?.dateTime) return; 

                while (current < end) {
                    const hora = current.toLocaleTimeString('es-MX', { 
                        hour: '2-digit', minute: '2-digit', hour12: false,
                        timeZone: 'America/Mexico_City' 
                    });
                    
                    const horaFormateada = hora.length === 4 ? `0${hora}` : hora;
                    todosLosBloqueos.push({
                        key: `${medico.id}|${horaFormateada}`,
                        googleEventId: evento.id
                    });
                    current = new Date(current.getTime() + 30 * 60000);
                }
            });
        }));
        return todosLosBloqueos;
    } catch (error: any) {
        console.error("❌ Error en getBloqueosRaw:", error.message);
        return []; 
    }
};

export const getBloqueosAction = unstable_cache(
    getBloqueosRaw, 
    ['calendar-bloqueos-action-v3'], 
    { revalidate: 60 } 
);

export async function getMedicosAction() {
  try {
    const medicos = await getMedicos();
    return JSON.parse(JSON.stringify(medicos));
  } catch (error) {
    console.error("Error en getMedicosAction:", error);
    return [];
  }
}

// --- ACCIÓN 3: ENVIAR REPORTE (Mantiene lógica original) ---
export async function enviarCorteMedicoAction(datos: {
    medicoNombre: string;
    medicoEmail: string;
    periodo: string;
    resumen: { 
        cobrado: number; 
        comision: number; 
        pagar: number;
        efectivo?: number;
        transferencia?: number;
        tpvMP?: number;   
        tpvBAN?: number;
        debito?: number;  // 💳 NUEVO: Soporte para tarjetas de débito
        credito?: number; // 💳 NUEVO: Soporte para tarjetas de crédito
    };
    movimientos: any[];
}) {
    if (!datos.medicoEmail || !datos.medicoEmail.includes('@')) {
        return { success: false, error: "El médico no tiene un email válido." };
    }

    try {
        const tokenValidacion = uuidv4();
        // Guardamos el token en Firebase para que el médico pueda validar con un clic
        await addDoc(collection(db, "validaciones_medicos"), {
            medico: datos.medicoNombre,
            email: datos.medicoEmail,
            periodo: datos.periodo,
            montoAPagar: datos.resumen.pagar,
            token: tokenValidacion,
            estatus: "Pendiente", 
            creadoEn: serverTimestamp(),
            detalles: JSON.stringify(datos.resumen)
        });

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
        });

        const filasTabla = datos.movimientos.map(m => `
            <tr>
                <td style="padding:8px; border-bottom:1px solid #ddd;">${m.fecha}</td>
                <td style="padding:8px; border-bottom:1px solid #ddd;">${m.paciente}</td>
                <td style="padding:8px; border-bottom:1px solid #ddd;">${m.concepto}</td>
                <td style="padding:8px; border-bottom:1px solid #ddd; text-align:right;">$${m.monto}</td>
            </tr>
        `).join('');

        // Ajusta esta URL a tu dominio real cuando hagas deploy
        const enlaceValidacion = `https://sistema-atu.netlify.app/validar-corte/${tokenValidacion}`;
        
        // 🎨 TEMPLATE HTML ACTUALIZADO: Desglose de 4 Vías
        const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
            <div style="background-color: #2563eb; padding: 20px; text-align: center; color: white;">
                <h2 style="margin:0;">Corte de Caja: ${datos.periodo}</h2>
                <p>Hola, Dr(a). ${datos.medicoNombre}</p>
            </div>
            
            <div style="padding: 20px;">
                <p>Adjuntamos el desglose de movimientos del periodo solicitado.</p>
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 5px 0; font-size: 16px;"><strong>Total Cobrado:</strong> $${datos.resumen.cobrado.toLocaleString()}</p>
                    
                    <div style="margin: 15px 0; padding: 10px; border: 1px solid #e2e8f0; background-color: white; border-radius: 6px; font-size: 13px;">
                        <p style="margin: 4px 0; color: #15803d; border-bottom: 1px dashed #eee; padding-bottom: 4px;">
                            <strong>💵 Efectivo Total:</strong> $${(datos.resumen.efectivo || 0).toLocaleString()}
                        </p>
                        <p style="margin: 4px 0; color: #7e22ce; border-bottom: 1px dashed #eee; padding-bottom: 4px;">
                            <strong>🏦 Transferencias:</strong> $${(datos.resumen.transferencia || 0).toLocaleString()}
                        </p>
                        <p style="margin: 4px 0; color: #0284c7; border-bottom: 1px dashed #eee; padding-bottom: 4px;">
                            <strong>🧲 TPV Mercado Pago:</strong> $${(datos.resumen.tpvMP || 0).toLocaleString()}
                        </p>
                        <p style="margin: 4px 0; color: #059669; border-bottom: 1px dashed #eee; padding-bottom: 4px;">
                            <strong>📟 TPV Banorte:</strong> $${(datos.resumen.tpvBAN || 0).toLocaleString()}
                        </p>
                        <p style="margin: 4px 0; color: #475569; border-bottom: 1px dashed #eee; padding-bottom: 4px;">
                            <strong>💳 Tarjeta Débito:</strong> $${(datos.resumen.debito || 0).toLocaleString()}
                        </p>
                        <p style="margin: 4px 0; color: #475569;">
                            <strong>💳 Tarjeta Crédito:</strong> $${(datos.resumen.credito || 0).toLocaleString()}
                        </p>
                    </div>

                    <p style="margin: 5px 0; color: #64748b;"><strong>Retención Clínica:</strong> -$${datos.resumen.comision.toLocaleString()}</p>
                    <div style="margin-top: 15px; padding-top: 10px; border-top: 2px solid #2563eb;">
                        <h3 style="margin: 0; color: #2563eb; font-size: 20px;">Total a Liquidar: $${datos.resumen.pagar.toLocaleString()}</h3>
                    </div>
                </div>

                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <thead style="background-color: #f1f5f9;">
                            <tr>
                                <th>Fecha</th> <th>Paciente</th> <th>Servicio</th> <th style="text-align:right;">Monto</th>
                            </tr>
                        </thead>
                        <tbody>${filasTabla}</tbody>
                    </table>
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${enlaceValidacion}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                            ✅ VALIDAR Y ACEPTAR CORTE
                        </a>
                    </div>
                    <p style="font-size: 10px; color: #94a3b8; text-align: center; margin-top: 20px;">Este es un mensaje automático del sistema SANSCE OS.</p>
                </div>
            </div>
        `;

        await transporter.sendMail({
            from: '"Sistema SANSCE" <no-reply@sansce.com>',
            to: datos.medicoEmail,
            subject: `📊 Corte Validado - ${datos.medicoNombre}`,
            html: htmlContent,
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error enviando correo:", error);
        return { success: false, error: error.message };
    }
}

// --- ACCIÓN 4: CANCELAR CITA (Lógica Real) ---
export async function cancelarCitaGoogle(datos: { calendarId: string; eventId: string; }) {
    if (!datos.calendarId || !datos.eventId) {
        return { success: false, error: "Faltan datos para borrar en Google." };
    }

    try {
        await calendar.events.delete({ calendarId: datos.calendarId, eventId: datos.eventId });
        return { success: true, message: "Evento eliminado correctamente." };
    } catch (error: any) {
        console.error("Error borrando en Google:", error);
        return { success: true, warning: "Error al borrar en Google, se procedió localmente." };
    }
}

// --- NUEVA ACCIÓN: ACTUALIZAR EVENTO EN GOOGLE ---
export async function actualizarCitaGoogle(datos: { 
    calendarId: string;
    eventId: string;
    fecha: string;
    hora: string;
    duracionMinutos: number;
    pacienteNombre: string;
    motivo: string;
}) {
    if (!datos.calendarId || !datos.eventId) return { success: false, error: "Faltan IDs para actualizar" };

    const startDateTime = new Date(`${datos.fecha}T${datos.hora}:00-06:00`); 
    const endDateTime = new Date(startDateTime.getTime() + datos.duracionMinutos * 60000);

    const eventoActualizado = {
        summary: datos.motivo,
        description: `Paciente: ${datos.pacienteNombre}\n(Actualizado desde App SANSCE)`,
        start: { dateTime: startDateTime.toISOString(), timeZone: 'America/Mexico_City' },
        end: { dateTime: endDateTime.toISOString(), timeZone: 'America/Mexico_City' },
    };

    try {
        await calendar.events.patch({
            calendarId: datos.calendarId,
            eventId: datos.eventId,
            requestBody: eventoActualizado,
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error actualizando en Google:", error);
        return { success: false, error: error.message };
    }
}

// --- ACCIÓN 5: OBTENER PLANTILLAS WHATSAPP (Unificación) ---
export async function getMensajesConfigAction() {
  try {
    const mensajes = await getMensajesWhatsApp();
    // Normalizamos para asegurar que los datos sean serializables para Next.js
    return JSON.parse(JSON.stringify(mensajes));
  } catch (error) {
    console.error("Error en getMensajesConfigAction:", error);
    return [];
  }
}

export async function getDescuentosAction() {
  try {
    const { descuentos } = await getCatalogos();
    // Lo convertimos a texto y de regreso para que pase seguro por el puente
    return JSON.parse(JSON.stringify(descuentos));
  } catch (error) {
    console.error("Error en getDescuentosAction:", error);
    return [];
  }
}

// --- ACCIÓN 6: MOTOR DE OKRs (Puente Seguro) ---
export async function fetchOkrDataAction(email: string) {
  try {
    if (!email) return [];
    
    // 1. Invocamos al motor de cálculo en el servidor
    const data = await getOkrDashboardData(email);
    
    // 2. Serializamos (Deep Copy) para evitar errores de "Server to Client passing" en Next.js
    // Esto limpia cualquier referencia circular o tipo de dato no compatible (como Date puro)
    return JSON.parse(JSON.stringify(data));
    
  } catch (error) {
    console.error("❌ Error en fetchOkrDataAction:", error);
    return []; // Retornamos array vacío para no romper la UI
  }
}

// --- MÓDULO 7: ESCRITURA OPERATIVA (Minutas y Tareas con Trazabilidad) ---

export async function saveMinutaCompletaAction(datosMinuta: {
    fecha: string,
    moderador: string,
    temas: string,
    asistentes: string,
    conclusiones: string,
    compromisos: Array<{
        descripcion: string,
        responsable: string,
        fechaInicio: string,    // 📅 NUEVO: Trazabilidad de inicio
        fechaEntrega: string,   // 📅 NUEVO: Trazabilidad de fin
        area: string,
        proyecto: string,
        idHito: string
    }>
}) {
    try {
        const { GoogleSpreadsheet } = await import('google-spreadsheet');
        const { JWT } = await import('google-auth-library');

        const auth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, auth);
        await doc.loadInfo();

        // 1. Guardar el Acta en OPERACION_MINUTAS
        const sheetMinutas = doc.sheetsByTitle['OPERACION_MINUTAS'];
        await sheetMinutas.addRow({
            Fecha: datosMinuta.fecha,
            Moderador: datosMinuta.moderador,
            Temas: datosMinuta.temas,
            Asistentes: datosMinuta.asistentes,
            Conclusiones: datosMinuta.conclusiones
        });

        // 2. Desglosar Tareas en OPERACION_TAREAS
        const sheetTareas = doc.sheetsByTitle['OPERACION_TAREAS'];
        for (const tarea of datosMinuta.compromisos) {
            await sheetTareas.addRow({
                // Si la tarea ya trae un ID de la interfaz, lo usamos; si no, creamos uno nuevo con nuestra utilería.
                ID_Tarea: (tarea as any).idTarea || generateTaskId(),
                Descripcion: tarea.descripcion,
                EmailAsignado: tarea.responsable,
                FechaInicio: tarea.fechaInicio,     // ✅ Trazabilidad Activa
                FechaEntrega: tarea.fechaEntrega,   // ✅ Trazabilidad Activa
                Estado: 'Pendiente',
                ID_Hito: tarea.idHito || 'Gral',
                Area: tarea.area,
                Proyecto: tarea.proyecto,
                AsignadoPor: datosMinuta.moderador
            });
        }

        // 🛡️ REGLA DE ORO SANSCE: Sincronización de 3 capas
        // Notificamos que la Minuta, las Tareas y el Cronograma han cambiado
        const { revalidateTag } = await import('next/cache');
        revalidateTag('op-minutas-v1');
        revalidateTag('op-tareas-v1');
        revalidateTag('op-cronograma-v1');

        return { success: true, message: "Minuta y Tareas vinculadas correctamente" };
    } catch (error: any) {
        console.error("❌ Error en Trazabilidad de Minuta:", error);
        return { success: false, error: error.message };
    }
}

export async function updateTaskStatusAction(idTarea: string, nuevoEstado: string) {
    try {
        const { GoogleSpreadsheet } = await import('google-spreadsheet');
        const { JWT } = await import('google-auth-library');
        const { revalidateTag } = await import('next/cache');

        const auth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, auth);
        await doc.loadInfo();

        const sheet = doc.sheetsByTitle['OPERACION_TAREAS'];
        const rows = await sheet.getRows();
        
        // 🔍 Búsqueda Quirúrgica: Localizamos la fila por su ID único
        const row = rows.find(r => r.get('ID_Tarea') === idTarea);

        if (!row) throw new Error("No se encontró la tarea en el sistema.");

        // ✅ Actualización de Estado
        row.set('Estado', nuevoEstado);
        await row.save();

        // ⚡ Limpieza de Memoria: Forzamos al sistema a leer el dato nuevo
        revalidateTag('op-tareas-v1');

        return { success: true };
    } catch (error: any) {
        console.error("❌ Error actualizando estado de tarea:", error);
        return { success: false, error: error.message };
    }
}

/**
 * 🚀 ACCIÓN: GUARDAR CHECKLIST DIARIO
 * Registra o actualiza el cumplimiento de actividades en OPERACION_CHECKLIST_LOG.
 */
export async function saveChecklistAction(email: string, dateId: string, activityId: string, isCompleted: boolean) {
    try {
        const { GoogleSpreadsheet } = await import('google-spreadsheet');
        const { JWT } = await import('google-auth-library');
        const { revalidateTag } = await import('next/cache');

        const auth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, auth);
        await doc.loadInfo();

        const sheet = doc.sheetsByTitle['OPERACION_CHECKLIST_LOG'];
        const rows = await sheet.getRows();
        
        // 🔍 BUSCADOR: ¿Ya existe un registro para esta actividad hoy?
        const existingRow = rows.find(r => 
            r.get('DateID') === dateId && 
            r.get('Email') === email && 
            r.get('ActivityID') === activityId
        );

        if (existingRow) {
            // Actualizamos el existente
            existingRow.set('IsCompleted', isCompleted ? 'TRUE' : 'FALSE');
            await existingRow.save();
        } else {
            // Creamos uno nuevo
            await sheet.addRow({
                DateID: dateId,
                Email: email,
                ActivityID: activityId,
                IsPlanned: 'TRUE',
                IsCompleted: isCompleted ? 'TRUE' : 'FALSE'
            });
        }

        revalidateTag('op-checklist-v1'); // Limpiamos caché para ver el cambio
        return { success: true };
    } catch (error: any) {
        console.error("❌ Error en Checklist:", error);
        return { success: false, error: error.message };
    }
}

export async function saveHitoAction(formData: FormData) {
  try {
    const { GoogleSpreadsheet } = await import('google-spreadsheet');
    const { JWT } = await import('google-auth-library');
    const { revalidateTag } = await import('next/cache');

    const auth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, auth);
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle['OPERACION_CRONOGRAMA'];
    
    // Captura de trazabilidad completa: Proyecto -> Actividad -> Area -> Responsable
    await sheet.addRow({
      ID_Hito: `HITO-${Date.now()}`,
      'Nombre de la Actividad': String(formData.get('nombre_hito') ?? ''), // 🚀 Sincronizado con Google Sheets
      'Responsable': String(formData.get('responsable') ?? ''),
      'Fecha Inicio': String(formData.get('fecha_inicio') ?? ''),
      'Fecha Fin': String(formData.get('fecha_fin') ?? ''),
      'Estado': 'Pendiente',
      'Area': String(formData.get('area_responsable') ?? 'General'),
      'Proyecto': String(formData.get('pc_impactado') ?? ''),
    });

    // 🛡️ REGLA DE ORO: Limpiamos la caché para que el Gantt se actualice al instante
    revalidateTag('op-cronograma-v1');

    return { success: true };
  } catch (error: any) {
    console.error("❌ Error en saveHitoAction:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 🚀 ACCIÓN: REPROGRAMACIÓN SEGURA CON TRAZABILIDAD
 * Actualiza la fecha de entrega manteniendo el registro de la fecha original.
 */
export async function rescheduleHitoAction(idHito: string, nuevaFecha: string, motivo: string) {
  try {
    const { GoogleSpreadsheet } = await import('google-spreadsheet');
    const { JWT } = await import('google-auth-library');
    const { revalidateTag } = await import('next/cache');

    const auth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, auth);
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle['OPERACION_CRONOGRAMA'];
    const rows = await sheet.getRows();
    const row = rows.find(r => r.get('ID_Hito') === idHito);

    if (!row) throw new Error("No se encontró la actividad para reprogramar.");

    // 🛡️ TRAZABILIDAD SAGRADA:
    // Si no existe fecha original guardada, congelamos la que tiene actualmente el Gantt
    if (!row.get('Fecha_Original')) {
      row.set('Fecha_Original', row.get('Fecha Fin'));
    }

    // 📝 HISTORIAL DE CAMBIOS:
    // Acumulamos el motivo de la reprogramación para auditoría
    const historialPrevio = row.get('Observaciones') || '';
    const fechaHoy = new Date().toLocaleDateString();
    const nuevaNota = `[REPROG ${fechaHoy}]: Nueva fecha ${nuevaFecha} - Motivo: ${motivo}`;
    
    row.set('Fecha Fin', nuevaFecha);
    row.set('Observaciones', `${historialPrevio} | ${nuevaNota}`.trim());

    await row.save();

    // ⚡ Actualización instantánea del Gantt
    revalidateTag('op-cronograma-v1');

    return { success: true };
  } catch (error: any) {
    console.error("❌ Error en reprogramación:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 🚀 ACCIÓN: GUARDAR TAREA INDIVIDUAL
 * Registra una nueva tarea vinculada a un proyecto y tipo de actividad específico.
 */
export async function saveSingleTaskAction(formData: FormData) {
  try {
    const { GoogleSpreadsheet } = await import('google-spreadsheet');
    const { JWT } = await import('google-auth-library');
    const { revalidateTag } = await import('next/cache');

    const auth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, auth);
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle['OPERACION_TAREAS'];
    
    // Captura de datos con trazabilidad descendente
    await sheet.addRow({
      ID_Tarea: generateTaskId(),
      Descripcion: String(formData.get('descripcion') ?? ''),
      EmailAsignado: String(formData.get('responsable') ?? ''),
      FechaInicio: String(formData.get('fecha_inicio') ?? ''),
      FechaEntrega: String(formData.get('fecha_entrega') ?? ''),
      Estado: 'Pendiente',
      ID_Hito: String(formData.get('id_hito') ?? ''),
      Area: String(formData.get('area') ?? 'General'),
      Proyecto: String(formData.get('proyecto') ?? ''),
      AsignadoPor: 'SANSCE OS (Gantt View)'
    });

    // 🛡️ Sincronización instantánea
    revalidateTag('op-tareas-v1');

    return { success: true };
  } catch (error: any) {
    console.error("❌ Error en saveSingleTaskAction:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 🚀 ACCIÓN: TRASPLANTE DE TAREA ENTRE PROYECTOS
 * Mueve una tarea de un proyecto a otro, asegurando la integridad del hito.
 */
export async function moveTaskAction(idTarea: string, nuevoProyecto: string) {
  try {
    const { GoogleSpreadsheet } = await import('google-spreadsheet');
    const { JWT } = await import('google-auth-library');
    const { revalidateTag } = await import('next/cache');

    const auth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, auth);
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle['OPERACION_TAREAS'];
    const rows = await sheet.getRows();
    
    // 🔍 BÚSQUEDA QUIRÚRGICA: Localizamos la tarea por su ID único
    const row = rows.find(r => r.get('ID_Tarea') === idTarea);

    if (!row) throw new Error("La tarea no existe o fue eliminada previamente.");

    // 🛡️ REGLA DE INTEGRIDAD SANSCE OS:
    // 1. Cambiamos el Proyecto al destino seleccionado.
    // 2. Reseteamos el ID_Hito a 'Gral'. Esto es vital porque el hito original
    //    no existe en el nuevo proyecto. Así evitamos que la tarea desaparezca del radar.
    row.set('Proyecto', nuevoProyecto);
    row.set('ID_Hito', 'Gral'); 

    await row.save();

    // ⚡ SINCRONIZACIÓN: Forzamos al sistema a refrescar los datos del Cronograma
    revalidateTag('op-tareas-v1');

    return { success: true };
  } catch (error: any) {
    console.error("❌ Error en el trasplante de tarea:", error);
    return { success: false, error: error.message };
  }
}