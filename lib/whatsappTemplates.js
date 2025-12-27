// lib/whatsappTemplates.js

// Aquí centralizamos los mensajes para asegurar consistencia y ortografía.
// Puedes cambiar estos textos cuando quieras y se actualizarán en toda la app.

export const MENSAJES = {
  // 1. Para enviar cuando se agenda o recuerda una cita
  RECORDATORIO: (nombrePaciente, fecha, hora) => {
    return `Hola ${nombrePaciente}, te saludamos de Clínica SANSCE. 🌿\n\nTe recordamos tu cita programada para el *${fecha}* a las *${hora}*.\n\nPor favor confirma tu asistencia respondiendo a este mensaje. ¡Te esperamos!`;
  },

  // 2. Para enviar la ubicación (Google Maps)
  UBICACION: () => {
    return `Claro, aquí tienes nuestra ubicación:\n\n📍 *Clínica SANSCE*\nCalle Ejemplo 123, Ciudad de México.\n\nVer en mapa: https://maps.app.goo.gl/TU_ID_DE_GOOGLE_MAPS`;
  },

  // 3. Para enviar después de la consulta
  ENCUESTA: (nombrePaciente) => {
    return `Hola ${nombrePaciente}, gracias por confiar tu salud a SANSCE. ✨\n\nNos encantaría saber cómo te tratamos. ¿Nos regalas 1 minuto?\n\n👉 https://forms.gle/TU_ID_DE_GOOGLE_FORMS`;
  },

  // 4. Para enviar recibos o documentos
  DOCUMENTO_LISTO: (nombrePaciente, tipoDocumento) => {
    return `Hola ${nombrePaciente}, ya está listo tu documento: *${tipoDocumento}*.\n\nPuedes descargarlo o pasar a recogerlo en recepción. Saludos.`;
  },

  // 5. Para recuperación de pacientes inactivos (Radar)
  RECUPERACION: (nombrePaciente) => {
    return `Hola ${nombrePaciente}, notamos que ha pasado un tiempo desde tu última visita en SANSCE. 🌿\n\n¿Cómo te has sentido? Nos gustaría agendar un chequeo de seguimiento. ¡Saludos!`;
  }
};

/**
 * Función auxiliar para limpiar el número de teléfono.
 * WhatsApp necesita el formato internacional (52 + 10 dígitos).
 * Esta función quita espacios, guiones y agrega el 52 si falta.
 */
export const formatearCelular = (telefono) => {
  if (!telefono) return "";
  // Quitar todo lo que no sea número
  let limpio = telefono.replace(/\D/g, ""); 
  
  // Si tiene 10 dígitos (ej. 5512345678), le agregamos el 52 de México
  if (limpio.length === 10) {
    return `52${limpio}`;
  }
  return limpio;
};