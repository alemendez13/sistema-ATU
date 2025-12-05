"use server"; 

import { calendar } from './calendarAPI';
import { unstable_cache } from 'next/cache';
import nodemailer from 'nodemailer'; 
import { v4 as uuidv4 } from 'uuid';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase'; 
import { getMedicos } from "./googleSheets";

// --- ACCIÓN 1: AGENDAR (Ahora devuelve el ID de Google) ---
export async function agendarCitaGoogle(cita: { 
    calendarId: string;
    doctorNombre: string;
    fecha: string;
    hora: string;
    duracionMinutos?: number;
    pacienteNombre: string;
    motivo: string;
    doctorId?: string;
}) {
    const calendarId = cita.calendarId;
    
    if (!calendarId) {
        return { success: true, warning: "Sin calendario vinculado" };
    }

    const startDateTime = new Date(`${cita.fecha}T${cita.hora}:00-06:00`); 
    const endDateTime = new Date(startDateTime.getTime() + (cita.duracionMinutos || 30) * 60000);

    const evento = {
        summary: `🩺 Cita: ${cita.pacienteNombre}`,
        description: `Motivo: ${cita.motivo}\nRegistrado desde App SANSCE`,
        start: { dateTime: startDateTime.toISOString(), timeZone: 'America/Mexico_City' },
        end: { dateTime: endDateTime.toISOString(), timeZone: 'America/Mexico_City' },
        colorId: '11', 
    };

    try {
        const respuesta = await calendar.events.insert({
            calendarId: calendarId,
            requestBody: evento,
        });

        // 👇 ¡ESTO ES LO NUEVO! Devolvemos el ID que nos dio Google
        return { success: true, googleEventId: respuesta.data.id };

    } catch (error: any) { 
        console.error("Error creando evento en Google:", error);
        return { success: false, error: error.message };
    }
}

// --- UTILIDAD: Dividir array en trozos (Chunks) ---
function chunkArray<T>(myArray: T[], chunk_size: number): T[][]{ 
    var results: T[][] = [];
    while (myArray.length) {
        results.push(myArray.splice(0, chunk_size));
    }
    return results;
}

// --- ACCIÓN 2: LEER (OPTIMIZADA CON BATCH/LOTES) ---
const getBloqueosRaw = async (date: string, medicos: {
    id: string;
    calendarId: string;
}[]): Promise<string[]> => {
    
    const timeMin = new Date(`${date}T00:00:00-06:00`).toISOString();
    const timeMax = new Date(`${date}T23:59:59-06:00`).toISOString();
    
    // Usamos copia [...medicos] para no alterar el array original al filtrar
    let listaItems = [...medicos]
        .filter(m => m.calendarId)
        .map(m => ({ id: m.calendarId }));

    if (listaItems.length === 0) return [];

    const lotes = chunkArray(listaItems, 10);
    const tiemposOcupados: string[] = [];

    try {
        const respuestas = await Promise.all(lotes.map(async (lote) => {
            try {
                const response = await calendar.freebusy.query({
                    requestBody: {
                        timeMin,
                        timeMax,
                        timeZone: 'America/Mexico_City',
                        items: lote 
                    }
                });
                return response.data.calendars || {};
            } catch (err: any) {
                console.error("Error en un lote de calendarios:", err.message);
                return {}; 
            }
        }));

        const calendariosGoogleUnificados = Object.assign({}, ...respuestas);

        medicos.forEach(medico => {
            const calId = medico.calendarId;
            if (!calId) return;

            const datosCalendario = calendariosGoogleUnificados[calId];
            if (!datosCalendario || datosCalendario.errors) return;

            const busy = datosCalendario.busy || [];

            for (const block of busy) {
                let current = new Date(block.start);
                const end = new Date(block.end);
                
                while (current < end) {
                    const hora = current.toLocaleTimeString('es-MX', { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        hour12: false,
                        timeZone: 'America/Mexico_City' 
                    });
                    
                    const horaFormateada = hora.length === 4 ? `0${hora}` : hora;
                    tiemposOcupados.push(`${medico.id}|${horaFormateada}`);
                    current.setMinutes(current.getMinutes() + 30);
                }
            }
        });

        return tiemposOcupados;

    } catch (error: any) {
        console.error("❌ Error general en getBloqueosRaw:", error.message);
        return []; 
    }
};

export const getBloqueosAction = unstable_cache(
    getBloqueosRaw, 
    ['calendar-bloqueos-action-v2'], 
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

// --- ACCIÓN 3: ENVIAR REPORTE Y GENERAR VALIDACIÓN (REQUERIMIENTO NUEVO) ---
export async function enviarCorteMedicoAction(datos: {
    medicoNombre: string;
    medicoEmail: string;
    periodo: string;
    resumen: { cobrado: number; comision: number; pagar: number };
    movimientos: any[];
}) {
    if (!datos.medicoEmail || !datos.medicoEmail.includes('@')) {
        return { success: false, error: "El médico no tiene un email válido." };
    }

    try {
        const tokenValidacion = uuidv4();

        // Guardar solicitud en Firebase
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

         // Configurar Nodemailer (Asegúrate de tener las variables en .env.local)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER, // Usa variables de entorno, es más seguro
                pass: process.env.GMAIL_PASS 
            }
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
                        <p style="margin: 5px 0;"><strong>Total Cobrado:</strong> $${datos.resumen.cobrado}</p>
                        <p style="margin: 5px 0;"><strong>Retención Clínica:</strong> -$${datos.resumen.comision}</p>
                        <h3 style="margin: 10px 0; color: #2563eb;">A Depositar: $${datos.resumen.pagar}</h3>
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

// --- INICIO DE MODIFICACIÓN: Reemplazo de función cancelarCitaGoogle ---

// --- ACCIÓN 4: CANCELAR CITA (Lógica Real) ---
export async function cancelarCitaGoogle(datos: {
    calendarId: string;
    eventId: string; // 👈 Ahora es obligatorio para poder borrar
}) {
    // Validación de seguridad
    if (!datos.calendarId || !datos.eventId) {
        return { success: false, error: "Faltan datos (ID de calendario o evento) para borrar en Google." };
    }

    try {
        // Ejecutamos el borrado en la API de Google
        await calendar.events.delete({
            calendarId: datos.calendarId,
            eventId: datos.eventId
        });
        
        return { success: true, message: "Evento eliminado correctamente de Google Calendar." };

    } catch (error: any) {
        console.error("Error borrando en Google:", error);
        
        // Si el evento ya no existe en Google (404) o hay otro error, 
        // devolvemos success: true con advertencia para permitir que se borre en Firebase de todos modos.
        return { success: true, warning: "Se borró localmente, pero Google reportó error o ya no existía." };
    }
}
// --- FIN DE MODIFICACIÓN ---