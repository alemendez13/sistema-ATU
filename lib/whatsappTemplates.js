// lib/whatsappTemplates.js

// Aquí centralizamos los mensajes para asegurar consistencia y ortografía.
// Puedes cambiar estos textos cuando quieras y se actualizarán en toda la app.

import { parseWhatsAppTemplate } from "./utils";

/**
 * 🌿 MOTOR DE TRADUCCIÓN SANSCE (Dinámico)
 * Esta función toma una plantilla de Google Sheets y la convierte en un mensaje real.
 */
export const procesarMensajeDinamico = (listaPlantillas, idOEtiqueta, datos) => {
  // Buscamos la fila en Excel que coincida con el ID (ej: MENS-001) o la Etiqueta (ej: Ubicación)
  const plantilla = listaPlantillas?.find(p => 
    p.id === idOEtiqueta || 
    p.etiqueta?.toUpperCase() === idOEtiqueta?.toUpperCase()
  );

  if (!plantilla) {
    return "⚠️ Error: Plantilla no encontrada en la configuración de Google Sheets.";
  }

  // Usamos la utilería para reemplazar los corchetes [Nombre], [Hora], etc.
  return parseWhatsAppTemplate(plantilla.texto, datos);
};

/**
 * Función auxiliar para limpiar el número de teléfono.
 * WhatsApp necesita el formato internacional (52 + 10 dígitos).
 * Esta función quita espacios, guiones y agrega el 52 si falta.
 */
export const formatearCelular = (telefono) => {
  if (!telefono) return "";
  
  // 1. Limpieza profunda: Solo números
  let limpio = telefono.toString().replace(/\D/g, ""); 
  
  // 2. Eliminar prefijos basura de México (044, 045, 1)
  if (limpio.startsWith("521") && limpio.length === 13) limpio = "52" + limpio.substring(3);
  if (limpio.length === 12 && limpio.startsWith("044")) limpio = limpio.substring(3);
  if (limpio.length === 12 && limpio.startsWith("045")) limpio = limpio.substring(3);
  
  // 3. Estandarización SANSCE: Siempre 52 + 10 dígitos
  if (limpio.length === 10) return `52${limpio}`;
  if (limpio.length === 12 && limpio.startsWith("52")) return limpio;

  return limpio; // Devuelve el número tal cual si ya es internacional o desconocido
};