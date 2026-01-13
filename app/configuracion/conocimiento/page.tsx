// app/configuracion/conocimiento/page.tsx
"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trash2, Plus, ExternalLink, FileText, AppWindow, 
  Loader2, X, ChevronDown, ChevronRight, BookOpen 
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { 
  collection, onSnapshot, query, orderBy, doc, 
  deleteDoc, addDoc, writeBatch 
} from "@/lib/firebase-guard";
import { toast } from 'sonner';
import { useAuth } from "@/hooks/useAuth";

// --- ORDEN DE PRESENTACIÓN REQUERIDO (Punto 1 y 2) ---
const GROUPS_ORDER = [
  "MG", "PMR", "GEC", "COM", "AUD", "MEJ", "RIE", "MKT", 
  "ATU", "CLI", "EDU", "GEM", "FIN", "RHU", "IYM"
];

// --- SUSTITUCIÓN: LISTADO COMPLETO GEC-FR-02 (136 DOCUMENTOS) ---
const initialDocs = [
  // ESTRATEGIA Y GOBERNANZA (MG)
  { codigo: "MG", nombre: "Roles, responsabilidades y autoridades", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "MG", nombre: "Visión estratégica del negocio", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "MG", nombre: "Visión y fundamentos", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "MG", nombre: "Partes interesadas", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "MG", nombre: "Recorrido del usuario", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "MG", nombre: "Alcance", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "MG", nombre: "Estructura documental", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "MG", nombre: "Organigrama", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "MG", nombre: "Modelo de gestión", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "MG", nombre: "Lista de proceso", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "MG", nombre: "Plan de continuidad", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  
  // PLANEACIÓN, MEDICIÓN Y REVISIÓN (PMR)
  { codigo: "PMR-PC", nombre: "Planeación, medición y revisión", edicion: "Ed. 1", modulo: "Módulo 2", estado: "Documento" },
  { codigo: "PMR-IT-01", nombre: "Plan de reacción a la satisfacción y experiencia del usuario", edicion: "Ed. 0", modulo: "Módulo 2", estado: "Documento" },
  { codigo: "PMR-FR-01", nombre: "Portafolio de prioridades", edicion: "Ed. 0", modulo: "Módulo 2", estado: "Documento" },
  { codigo: "PMR-FR-02", nombre: "Simulador de consultas del PS", edicion: "Ed. 0", modulo: "Módulo 2", estado: "Documento" },
  { codigo: "PMR-FR-03", nombre: "Simulador de consultas de dirección", edicion: "Ed. 0", modulo: "Módulo 2", estado: "Documento" },
  { codigo: "PMR-FR-04", nombre: "Tabla de planeación", edicion: "Ed. 0", modulo: "Módulo 2", estado: "Documento" },
  { codigo: "PMR-FR-05", nombre: "Satisfacción del usuario", edicion: "Ed. 0", modulo: "Módulo 2", estado: "Documento" },
  { codigo: "PMR-FR-06", nombre: "Revisión del sistema", edicion: "Ed. 0", modulo: "Módulo 2", estado: "Documento" },
  { codigo: "PMR-FR-07", nombre: "Revisiones periódicas", edicion: "Ed. 1", modulo: "Módulo 2", estado: "Documento" },

  // GESTIÓN DEL CONOCIMIENTO (GEC)
  { codigo: "GEC-PC", nombre: "Gestión del conocimiento", edicion: "Ed. 1", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "GEC-FR-01", nombre: "Listado de documentos y conocimiento", edicion: "Ed. 1", modulo: "Módulo 1", estado: "Integrado" },
  { codigo: "GEC-FR-02", nombre: "Matriz de requisitos normativos", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "GEC-FR-03", nombre: "Glosario", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "GEC-FR-04", nombre: "Listado de políticas", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "GEC-FR-05", nombre: "Contras", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  
  // COMUNICACIÓN Y AUDITORÍA (COM/AUD)
  { codigo: "COM-PC", nombre: "Comunicación", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "COM-FR-01", nombre: "Minuta", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "COM-FR-02", nombre: "Checklist diario", edicion: "Ed. 1", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "AUD-PC", nombre: "Auditoría interna", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "AUD-FR-01", nombre: "Programa de auditoría", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "AUD-FR-02", nombre: "Plan de auditoría", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "AUD-FR-03", nombre: "Lista de verificación", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "AUD-FR-04", nombre: "Informe de auditoría", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "AUD-FR-05", nombre: "Evaluación de auditores", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },

  // MEJORA Y RIESGOS (MEJ/GER)
  { codigo: "MEJ-PC", nombre: "Mejora continua", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "MEJ-FR-01", nombre: "Acciones de mejora", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "MEJ-FR-02", nombre: "Seguimiento y monitoreo de acciones de mejora", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "MEJ-FR-03", nombre: "Planificación y control del proyecto", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "MEJ-FR-04", nombre: "Mejoras y proyectos", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "GER-PC", nombre: "Gestión de riesgos", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "GER-IT-01", nombre: "Cambio climático", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "GER-IT-02", nombre: "Continuidad de negocio", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "GER-FR-01", nombre: "Análisis a modo de falla y efectos", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "GER-FR-02", nombre: "Ambiente de proceso", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },
  { codigo: "GER-FR-03", nombre: "Propiedad de terceros", edicion: "Ed. 0", modulo: "Módulo 1", estado: "Documento" },

  // MERCADOTECNIA (MKT)
  { codigo: "MKT-PC", nombre: "Marketing", edicion: "Ed. 0", modulo: "Módulo 2", estado: "Documento" },
  { codigo: "MKT-MA-01", nombre: "Manual de mercadotecnia (identidad)", edicion: "Ed. 0", modulo: "Módulo 2", estado: "Documento" },
  { codigo: "MKT-MA-02", nombre: "Manual de estilo", edicion: "Ed. 0", modulo: "Módulo 2", estado: "Documento" },
  { codigo: "MKT-FR-01", nombre: "Plan anual de mercadotecnia", edicion: "Ed. 0", modulo: "Módulo 2", estado: "Documento" },
  { codigo: "MKT-FR-02", nombre: "Calendario de actividades", edicion: "Ed. 0", modulo: "Módulo 2", estado: "Documento" },
  { codigo: "MKT-FR-03", nombre: "Plan de campaña", edicion: "Ed. 0", modulo: "Módulo 2", estado: "Documento" },
  { codigo: "MKT-FR-04", nombre: "Templates de contenido por áreas", edicion: "Ed. 0", modulo: "Módulo 2", estado: "Documento" },
  { codigo: "MKT-FR-05", nombre: "Evaluación del contenido", edicion: "Ed. 0", modulo: "Módulo 2", estado: "Documento" },
  { codigo: "MKT-FR-06", nombre: "Seguimiento de campaña", edicion: "Ed. 0", modulo: "Módulo 2", estado: "Documento" },
  { codigo: "MKT-FR-07", nombre: "Documentación de cambios", edicion: "Ed. 0", modulo: "Módulo 2", estado: "Documento" },
  { codigo: "MKT-FR-08", nombre: "Evaluación de resultados", edicion: "Ed. 0", modulo: "Módulo 2", estado: "Documento" },

  // ATENCIÓN A USUARIOS (ATU)
  { codigo: "ATU-PC", nombre: "Atención a usuarios", edicion: "Ed. 0", modulo: "Módulo 4", estado: "Documento" },
  { codigo: "ATU-MA-01", nombre: "Manual de atención a usuarios", edicion: "Ed. 1", modulo: "Módulo 4", estado: "Documento" },
  { codigo: "ATU-MA-02", nombre: "Manual del conmutador", edicion: "Ed. 0", modulo: "Módulo 4", estado: "Documento" },
  { codigo: "ATU-IT-11", nombre: "Términos y condiciones", edicion: "Ed. 0", modulo: "Módulo 4", estado: "Documento" },
  { codigo: "ATU-IT-12", nombre: "Aviso de privacidad", edicion: "Ed. 0", modulo: "Módulo 4", estado: "Documento" },
  { codigo: "ATU-FR-01", nombre: "Listado de actividades de atención a usuarios", edicion: "Ed. 0", modulo: "Módulo 4", estado: "Documento" },
  { codigo: "ATU-FR-02", nombre: "Calendario de Google", edicion: "Ed. 0", modulo: "Módulo 4", estado: "App Externa" },
  { codigo: "ATU-FR-04", nombre: "Libreta de registro diario de pacientes", edicion: "Ed. 0", modulo: "Módulo 4", estado: "Documento" },
  { codigo: "ATU-FR-05", nombre: "Cotización", edicion: "Ed. 0", modulo: "Módulo 4", estado: "Integrado" },
  { codigo: "ATU-FR-06", nombre: "Préstamo de equipo al profesional de la salud", edicion: "Ed. 0", modulo: "Módulo 4", estado: "Documento" },
  { codigo: "ATU-FR-07", nombre: "Control de vacunas", edicion: "Ed. 0", modulo: "Módulo 4", estado: "Documento" },
  { codigo: "ATU-FR-08", nombre: "Registro de información de Usuarios", edicion: "Ed. 0", modulo: "Módulo 4", estado: "Documento" },
  { codigo: "ATU-FR-09", nombre: "Lista de espera y cancelaciones", edicion: "Ed. 0", modulo: "Módulo 4", estado: "Documento" },
  { codigo: "ATU-FR-10", nombre: "Diálogos", edicion: "Ed. 0", modulo: "Módulo 4", estado: "Documento" },
  { codigo: "ATU-FR-11", nombre: "Listado de estudios", edicion: "Ed. 0", modulo: "Módulo 4", estado: "Documento" },

  // CLÍNICA (CLI)
  { codigo: "CLI-PC", nombre: "Servicios clínicos", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-GUI-01", nombre: "Guía de la documentación para la implementación de servicios clínicos", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-IT-01", nombre: "Expediente clínico", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Integrado" },
  { codigo: "CLI-IT-02", nombre: "Atención a personas con discapacidad", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-IT-03", nombre: "Atención de casos de urgencia y traslado", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-IT-04", nombre: "Detección de casos de violencia", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-IT-05", nombre: "Telesalud", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-IT-06", nombre: "Signos vitales, mediciones antropométricas y estudios de laboratorio y gabinete", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-IT-07", nombre: "Escalas de medición", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-IT-08", nombre: "Toma de muestras para estudios de laboratorio", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-IT-09", nombre: "Checkup", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-IT-10", nombre: "Programa de activación física", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-IT-11", nombre: "Prevención primaria", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-IT-12", nombre: "Uso de dispositivos médicos", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-IT-13", nombre: "Manejo de medicamentos y vacunas", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-IT-14", nombre: "Suplementos", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-IT-15", nombre: "Pruebas ortopédicas", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-IT-16", nombre: "Uso de compresero y equipo de electroterapia", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-IT-17", nombre: "Dosificación de ejercicio", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-IT-18", nombre: "Programa de nutrición sin límites", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-IT-19", nombre: "Fragilidad", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-PR-MED-01", nombre: "Protocolo de medicina", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-PR-NUT-01", nombre: "Protocolo de nutrición", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-PR-FT-01", nombre: "Protocolo de fisioterapia", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-PR-PSI-01", nombre: "Protocolo de psicología", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-FR-01", nombre: "Expediente clínico", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Integrado" },
  { codigo: "CLI-FR-02", nombre: "Censo diario de pacientes", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-FR-03", nombre: "Listado de diagnósticos", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-FR-04", nombre: "Listados de protocolos", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-FR-05", nombre: "Protocolo de atención", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-FR-06", nombre: "Evaluación de la implementación del protocolo", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-FR-07", nombre: "Base de datos de pacientes", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-AN-01", nombre: "Hoja de porciones", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-AN-02", nombre: "Menú", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-AN-03", nombre: "Poster del plato del buen comer", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },
  { codigo: "CLI-AN-04", nombre: "Hoja de porciones didáctica", edicion: "Ed. 0", modulo: "Módulo 3", estado: "Documento" },

  // RECURSOS HUMANOS (RHU)
  { codigo: "RHU-PC", nombre: "Recursos humanos", edicion: "Ed. 1", modulo: "Módulo 5", estado: "Documento" },
  { codigo: "RHU-IT-01", nombre: "Programa de inducción y capacitación", edicion: "Ed. 0", modulo: "Módulo 5", estado: "Documento" },
  { codigo: "RHU-IT-02", nombre: "Reclutamiento y selección de personal", edicion: "Ed. 0", modulo: "Módulo 5", estado: "Documento" },
  { codigo: "RHU-IT-03", nombre: "Reglamento interno", edicion: "Ed. 0", modulo: "Módulo 5", estado: "Documento" },
  { codigo: "RHU-IT-04", nombre: "Prevención de riesgos psicosociales", edicion: "Ed. 0", modulo: "Módulo 5", estado: "Documento" },
  { codigo: "RHU-FR-01", nombre: "Organigrama", edicion: "Ed. 0", modulo: "Módulo 5", estado: "Documento" },
  { codigo: "RHU-FR-02", nombre: "Perfil de puesto", edicion: "Ed. 0", modulo: "Módulo 5", estado: "Documento" },
  { codigo: "RHU-FR-03", nombre: "Entrevista", edicion: "Ed. 0", modulo: "Módulo 5", estado: "Documento" },
  { codigo: "RHU-FR-04", nombre: "Programa de capacitación e inducción", edicion: "Ed. 0", modulo: "Módulo 5", estado: "Documento" },
  { codigo: "RHU-FR-05", nombre: "Solicitud de recurso humano", edicion: "Ed. 0", modulo: "Módulo 5", estado: "Documento" },
  { codigo: "RHU-FR-06", nombre: "Expediente del trabajador, arrendatario o prestador de servicio social", edicion: "Ed. 0", modulo: "Módulo 5", estado: "Documento" },
  { codigo: "RHU-FR-07", nombre: "Detección de necesidades de capacitación", edicion: "Ed. 0", modulo: "Módulo 5", estado: "Documento" },
  { codigo: "RHU-FR-08", nombre: "Solicitud y control de incidencias", edicion: "Ed. 0", modulo: "Módulo 5", estado: "Documento" },
  { codigo: "RHU-FR-09", nombre: "Evaluación de la capacitación", edicion: "Ed. 0", modulo: "Módulo 5", estado: "Documento" },
  { codigo: "RHU-FR-10", nombre: "Evaluación de desempeño", edicion: "Ed. 0", modulo: "Módulo 5", estado: "Documento" },
  { codigo: "RHU-FR-11", nombre: "Encuesta de satisfacción laboral", edicion: "Ed. 0", modulo: "Módulo 5", estado: "Documento" },
  { codigo: "RHU-FR-12", nombre: "Encuesta de salida del trabajador", edicion: "Ed. 0", modulo: "Módulo 5", estado: "Documento" },
  { codigo: "RHU-FR-13", nombre: "Constancia laboral", edicion: "Ed. 0", modulo: "Módulo 5", estado: "Documento" },
  { codigo: "RHU-FR-14", nombre: "Carta de recomendación", edicion: "Ed. 0", modulo: "Módulo 5", estado: "Documento" },
  { codigo: "RHU-FR-15", nombre: "Cuestionario de eventos traumáticos", edicion: "Ed. 0", modulo: "Módulo 5", estado: "Documento" },
  { codigo: "RHU-FR-16", nombre: "Control de verificación de expedientes laborales", edicion: "Ed. 0", modulo: "Módulo 5", estado: "Documento" },
  { codigo: "RHU-FR-17", nombre: "Control de asistencia", edicion: "Ed. 0", modulo: "Módulo 5", estado: "Documento" },

  // INFRAESTRUCTURA Y MANTENIMIENTO (IYM)
  { codigo: "IYM-PC", nombre: "Infraestructura y mantenimiento", edicion: "Ed. 0", modulo: "Módulo 7", estado: "Documento" },
  { codigo: "IYM-IT-01", nombre: "Técnicas de Limpieza y Desinfección", edicion: "Ed. 0", modulo: "Módulo 7", estado: "Documento" },
  { codigo: "IYM-FR-01", nombre: "Programa de mantenimiento", edicion: "Ed. 0", modulo: "Módulo 7", estado: "Documento" },
  { codigo: "IYM-FR-02", nombre: "Programa de limpieza y desinfección", edicion: "Ed. 0", modulo: "Módulo 7", estado: "Documento" },
  { codigo: "IYM-FR-03", nombre: "Solicitud de mantenimiento", edicion: "Ed. 0", modulo: "Módulo 7", estado: "Documento" },
  { codigo: "IYM-FR-04", nombre: "Bitácora de limpieza", edicion: "Ed. 0", modulo: "Módulo 7", estado: "Documento" },
  { codigo: "IYM-FR-05", nombre: "Orden de salida de equipos", edicion: "Ed. 0", modulo: "Módulo 7", estado: "Documento" },
  { codigo: "IYM-FR-06", nombre: "Control de tinaco y cisterna", edicion: "Ed. 0", modulo: "Módulo 7", estado: "Documento" },

  // FINANZAS (FIN)
  { codigo: "FIN-PC", nombre: "Finanzas", edicion: "Ed. 0", modulo: "Módulo 8", estado: "Documento" },
  { codigo: "FIN-FR-01", nombre: "Presupuesto y reporte de resultados", edicion: "Ed. 0", modulo: "Módulo 8", estado: "Documento" },
  { codigo: "FIN-FR-02", nombre: "Costo por hora", edicion: "Ed. 0", modulo: "Módulo 8", estado: "Documento" },
  { codigo: "FIN-FR-03", nombre: "Catálogo de profesionales de la salud", edicion: "Ed. 0", modulo: "Módulo 8", estado: "App Externa" },
  { codigo: "FIN-FR-04", nombre: "Control de facturación", edicion: "Ed. 0", modulo: "Módulo 8", estado: "Integrado" },
  { codigo: "FIN-FR-05", nombre: "Caja chica", edicion: "Ed. 0", modulo: "Módulo 8", estado: "Integrado" },
  { codigo: "FIN-FR-06", nombre: "Control de cambios de facturación", edicion: "Ed. 0", modulo: "Módulo 8", estado: "Documento" },
  { codigo: "FIN-FR-07", nombre: "Reporte de falta de efectivo", edicion: "Ed. 0", modulo: "Módulo 8", estado: "Documento" },
  { codigo: "FIN-FR-08", nombre: "Reportes de ingreso diario", edicion: "Ed. 0", modulo: "Módulo 8", estado: "Integrado" },
  { codigo: "FIN-FR-09", nombre: "Recibo de pago", edicion: "Ed. 0", modulo: "Módulo 8", estado: "Integrado" },
  { codigo: "FIN-FR-10", nombre: "Cálculo de pago a especialistas", edicion: "Ed. 0", modulo: "Módulo 8", estado: "Integrado" },
  { codigo: "FIN-FR-11", nombre: "Gestión de facturas", edicion: "Ed. 0", modulo: "Módulo 8", estado: "Integrado" },
  { codigo: "FIN-FR-12", nombre: "Cartera vencida", edicion: "Ed. 0", modulo: "Módulo 8", estado: "Integrado" },
  { codigo: "FIN-FR-13", nombre: "Conciliación de estudios de laboratorio", edicion: "Ed. 0", modulo: "Módulo 8", estado: "Integrado" },

  // GESTIÓN DE MATERIALES (GEM)
  { codigo: "GEM-PC", nombre: "Gestión de materiales", edicion: "Ed. 0", modulo: "Módulo 6", estado: "Documento" },
  { codigo: "GEM-IT-01", nombre: "Gestión de residuos", edicion: "Ed. 0", modulo: "Módulo 6", estado: "Documento" },
  { codigo: "GEM-IT-02", nombre: "Gestión de medicamentos", edicion: "Ed. 0", modulo: "Módulo 6", estado: "Documento" },
  { codigo: "GEM-LI-01", nombre: "Lineamientos de adquisiciones", edicion: "Ed. 0", modulo: "Módulo 6", estado: "Documento" },
  { codigo: "GEM-FR-01", nombre: "Solicitud de insumos", edicion: "Ed. 0", modulo: "Módulo 6", estado: "Documento" },
  { codigo: "GEM-FR-02", nombre: "Inventario", edicion: "Ed. 0", modulo: "Módulo 6", estado: "Integrado" },
  { codigo: "GEM-FR-03", nombre: "Directorio de representantes médicos y muestras médicas", edicion: "Ed. 0", modulo: "Módulo 6", estado: "Documento" },
  { codigo: "GEM-FR-04", nombre: "Catálogo de proveedores", edicion: "Ed. 0", modulo: "Módulo 6", estado: "Documento" },
  { codigo: "GEM-FR-05", nombre: "Evaluación de proveedores", edicion: "Ed. 0", modulo: "Módulo 6", estado: "Documento" },
  { codigo: "GEM-FR-06", nombre: "Requerimientos compra", edicion: "Ed. 0", modulo: "Módulo 6", estado: "Documento" },
  { codigo: "GEM-FR-07", nombre: "Entrega de materiales", edicion: "Ed. 0", modulo: "Módulo 6", estado: "Documento" },
];

export default function CerebroConocimientoISO() {
  const { user } = useAuth(); 
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Estado para controlar qué grupos están expandidos
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const [newDoc, setNewDoc] = useState({
    codigo: '', nombre: '', edicion: 'Ed. 0', modulo: 'Módulo 1', estado: 'Documento'
  });

  // --- LÓGICA DE AGRUPACIÓN Y CLASIFICACIÓN (Punto 1 y 2) ---
  const groupedDocs = useMemo(() => {
    const groups: Record<string, any[]> = {};
    GROUPS_ORDER.forEach(g => groups[g] = []);

    docs.forEach(d => {
      let prefix = d.codigo.split('-')[0].toUpperCase();
      // Mapeo especial: GER (Gestión de Riesgos) -> RIE (Riesgos)
      if (prefix === "GER") prefix = "RIE";
      
      if (groups[prefix]) {
        groups[prefix].push(d);
      } else {
        if (!groups["OTROS"]) groups["OTROS"] = [];
        groups["OTROS"].push(d);
      }
    });
    return groups;
  }, [docs]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "conocimiento"), orderBy("codigo", "asc"));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        // --- OPTIMIZACIÓN DE ESCRITURA (Punto 3) ---
        // Usamos Batch para enviar los 136 registros en una sola transacción
        const batch = writeBatch(db);
        initialDocs.forEach((docInit) => {
          const newDocRef = doc(collection(db, "conocimiento"));
          batch.set(newDocRef, docInit);
        });
        await batch.commit();
        toast.success("Cerebro normativo inicializado con éxito.");
      } else {
        const docsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setDocs(docsData);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Eliminar este documento maestro?")) {
      try {
        await deleteDoc(doc(db, "conocimiento", id));
        toast.success("Registro eliminado.");
      } catch (e) { toast.error("Error al eliminar."); }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await addDoc(collection(db, "conocimiento"), {
        ...newDoc,
        fechaCreacion: new Date().toISOString()
      });
      toast.success("Documento registrado en el cerebro.");
      setIsModalOpen(false);
      setNewDoc({ codigo: '', nombre: '', edicion: 'Ed. 0', modulo: 'Módulo 1', estado: 'Documento' });
    } catch (error) {
      toast.error("Error al guardar en Firebase.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <Loader2 className="animate-spin text-[#78c9cf]" size={48} />
    </div>
  );

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-light text-gray-800 flex items-center gap-3">
            <BookOpen className="text-[#78c9cf]" /> Cerebro de Conocimiento
          </h1>
          <p className="text-gray-500 mt-2 text-sm italic">Control Documental Basado en ISO 7101:2023</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#78c9cf] text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg hover:scale-105 transition-all"
        >
          <Plus size={20} /> NUEVO DOCUMENTO / APP
        </button>
      </div>

      <div className="space-y-4">
        {GROUPS_ORDER.map(groupKey => {
          const groupDocs = groupedDocs[groupKey];
          if (groupDocs.length === 0) return null;
          const isExpanded = expandedGroups[groupKey];

          return (
            <div key={groupKey} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* HEADER DEL GRUPO */}
              <button 
                onClick={() => toggleGroup(groupKey)}
                className="w-full p-4 flex justify-between items-center bg-white hover:bg-gray-50 transition-colors border-b border-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-cyan-50 text-[#78c9cf] flex items-center justify-center font-black text-xs">
                    {groupKey}
                  </div>
                  <span className="font-bold text-gray-700 uppercase tracking-widest text-xs">
                    Capítulo: {groupKey}
                  </span>
                  <span className="bg-gray-100 text-gray-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {groupDocs.length} DOCS
                  </span>
                </div>
                {isExpanded ? <ChevronDown className="text-gray-300" /> : <ChevronRight className="text-gray-300" />}
              </button>

              {/* LISTADO DEL GRUPO */}
              {isExpanded && (
                <div className="overflow-x-auto animate-in slide-in-from-top-2 duration-200">
                  <table className="w-full text-left text-xs">
                    <tbody className="divide-y divide-gray-50">
                      {groupDocs.map((doc: any) => (
                        <tr key={doc.id} className="hover:bg-blue-50/20 transition-colors group">
                          <td className="p-4 font-mono font-bold text-[#78c9cf] w-32">{doc.codigo}</td>
                          <td className="p-4 text-gray-600 font-medium">{doc.nombre}</td>
                          <td className="p-4 text-center text-gray-400 w-16">{doc.edicion}</td>
                          <td className="p-4 w-40">
                            <div className="flex items-center gap-2">
                              {doc.estado === "Integrado" && <span className="text-green-600 flex items-center gap-1 font-bold"><AppWindow size={14}/> APP NATIVA</span>}
                              {doc.estado === "App Externa" && <span className="text-blue-500 flex items-center gap-1 font-bold"><ExternalLink size={14}/> EXTERNO</span>}
                              {doc.estado === "Documento" && <span className="text-orange-400 flex items-center gap-1 font-bold"><FileText size={14}/> ADMIN</span>}
                            </div>
                          </td>
                          <td className="p-4 text-right w-16">
                             <button onClick={() => handleDelete(doc.id)} className="text-red-100 group-hover:text-red-400 transition-colors">
                               <Trash2 size={16} />
                             </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* --- MODAL DE REGISTRO (INTEGRACIÓN SPRINT) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="bg-[#78c9cf] p-6 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Nuevo Conocimiento</h2>
              <button onClick={() => setIsModalOpen(false)}><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">Código (Ej: FIN-FR-01)</label>
                  <input required className="w-full border-b-2 border-gray-100 focus:border-[#78c9cf] outline-none py-2 uppercase font-bold text-gray-700" value={newDoc.codigo} onChange={e => setNewDoc({...newDoc, codigo: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">Edición</label>
                  <input required className="w-full border-b-2 border-gray-100 focus:border-[#78c9cf] outline-none py-2" value={newDoc.edicion} onChange={e => setNewDoc({...newDoc, edicion: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase">Nombre del Proceso o Documento</label>
                <input required className="w-full border-b-2 border-gray-100 focus:border-[#78c9cf] outline-none py-2 text-gray-700" value={newDoc.nombre} onChange={e => setNewDoc({...newDoc, nombre: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">Módulo Sistema Operativo</label>
                  <select className="w-full bg-gray-50 border-none rounded-lg p-2 mt-1 text-sm font-bold" value={newDoc.modulo} onChange={e => setNewDoc({...newDoc, modulo: e.target.value})}>
                    {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={`Módulo ${n}`}>Módulo {n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">Estado / Formato</label>
                  <select className="w-full bg-gray-50 border-none rounded-lg p-2 mt-1 text-sm font-bold" value={newDoc.estado} onChange={e => setNewDoc({...newDoc, estado: e.target.value})}>
                    <option value="Documento">Administrativo (Doc/Excel)</option>
                    <option value="Integrado">App Nativa (.tsx)</option>
                    <option value="App Externa">Software Externo</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full bg-[#78c9cf] text-white py-4 rounded-2xl font-black mt-4 shadow-lg hover:shadow-cyan-200/50 transition-all flex justify-center items-center gap-2"
              >
                {isSaving ? <Loader2 className="animate-spin" /> : "REGISTRAR EN EL CEREBRO"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}