"use server"; 

import { calendar } from './calendarAPI';
import { unstable_cache } from 'next/cache';
import nodemailer from 'nodemailer'; 
import { v4 as uuidv4 } from 'uuid';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase'; 
// Unificamos las importaciones de googleSheets y agregamos el motor de OKRs
import { getMedicos, getMensajesWhatsApp, getCatalogos, getOkrDashboardData } from "./googleSheets";
import { addMinutesToTime } from './utils';

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
        tpvMP?: number;   // 🎯 Opcional para retrocompatibilidad
        tpvBAN?: number;  // 🎯 Opcional
    };
    movimientos: any[];
}) {
    if (!datos.medicoEmail || !datos.medicoEmail.includes('@')) {
        return { success: false, error: "El médico no tiene un email válido." };
    }

    try {
        const tokenValidacion = uuidv4();
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
        const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
            <div style="background-color: #2563eb; padding: 20px; text-align: center; color: white;">
                <h2 style="margin:0;">Corte de Caja: ${datos.periodo}</h2>
                <p>Hola, Dr(a). ${datos.medicoNombre}</p>
            </div>
            
            <div style="padding: 20px;">
                <p>Adjuntamos el desglose de movimientos del periodo solicitado.</p>
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 5px 0;"><strong>Total Cobrado:</strong> $${datos.resumen.cobrado.toLocaleString()}</p>
                    
                    <div style="margin: 10px 0; padding: 10px; border: 1px dashed #cbd5e1; border-radius: 6px; font-size: 13px;">
                        <p style="margin: 2px 0; color: #0284c7;"><strong>En TPV Mercado Pago:</strong> $${(datos.resumen.tpvMP || 0).toLocaleString()}</p>
                        <p style="margin: 2px 0; color: #059669;"><strong>En TPV Banorte:</strong> $${(datos.resumen.tpvBAN || 0).toLocaleString()}</p>
                    </div>

                    <p style="margin: 5px 0;"><strong>Retención Clínica:</strong> -$${datos.resumen.comision.toLocaleString()}</p>
                    <h3 style="margin: 10px 0; color: #2563eb;">Total a Liquidar: $${datos.resumen.pagar.toLocaleString()}</h3>
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
                        <a href="${enlaceValidacion}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                            ✅ VALIDAR Y ACEPTAR CORTE
                        </a>
                    </div>
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