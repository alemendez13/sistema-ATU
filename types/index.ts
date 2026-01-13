// Definición de qué es un PACIENTE en tu sistema
export interface Paciente {
  id?: string;
  nombreCompleto: string;
  folioExpediente?: string | null;
  fechaNacimiento: string;
  edad: number;
  genero: string;
  email: string;
  fotoUrl?: string | null;
  telefonos: string[]; // Array para manejar múltiples números opcionales
  telefonoCelular?: string;
  convenioId?: string | null; // Vínculo con catálogo de descuentos

  // --- CAMPOS QUE FALTABAN ---
  tutor?: string | null; 
  lugarNacimiento?: string;
  lugarResidencia?: string;  
  estadoCivil?: string;      
  religion?: string;         
  escolaridad?: string;      
  ocupacion?: string;        
  medioMarketing?: string;
  referidoPor?: string;
  curp?: string | null;
  grupoEtnico?: string | null;

  // Datos Fiscales
  datosFiscales?: {
    tipoPersona: string;
    razonSocial: string;
    rfc: string;
    regimenFiscal: string;
    usoCFDI: string;
    cpFiscal: string;
    emailFacturacion: string;
  } | null;

  fechaRegistro?: any;
}

// Definición de qué es una CITA
export interface Cita {
  id?: string;
  doctorId: string;
  doctorNombre: string;
  paciente: string; // Nombre del paciente
  motivo: string;
  fecha: string; // Formato YYYY-MM-DD
  hora: string;  // Formato HH:MM
  creadoEn?: any;
  googleEventId?: string | null;
  mensajeEnviado?: boolean;
  telefonoCelular?: string;
}

// Definición de una OPERACIÓN (Deuda o Pago)
export interface Operacion {
  id?: string;
  pacienteId: string;
  pacienteNombre: string;
  servicioSku: string;
  servicioNombre: string;
  monto: number | string; // Aceptamos ambos por ahora para evitar errores con Excel
  estatus: "Pendiente de Pago" | "Pagado";
  metodoPago?: "Efectivo" | "Tarjeta" | "Transferencia" | "Otro";
  requiereFactura?: boolean;
  fecha: any;
  fechaPago?: any;
  fechaCita?: string;
  // Para vincular la venta con un responsable de seguimiento (Laboratorio o Consulta)
  doctorId?: string | null;
  doctorNombre?: string | null;
}

// Definición de un PRODUCTO o SERVICIO (Del catálogo)
export interface ProductoCatalogo {
  sku: string;
  nombre: string;
  precio: string; // Viene como texto desde Google Sheets ("$500")
  tipo: "Producto" | "Servicio" | "Equipo";
  duracion?: string;
  observaciones?: string; 
  area?: string;          
}

// ... (resto del código anterior)

// Definición de un MÉDICO (Con horarios flexibles)
export interface Medico {
  id: string;
  nombre: string;
  especialidad: string;
  color: string;
  // Reemplazamos los campos viejos por uno solo potente:
  reglasHorario: string; // Ej: "1,2,3,4|11:00-19:00; 6|09:00-14:00"
  calendarId?: string; // <--- AGREGAR ESTA LÍNEA (El ? significa que es opcional)
}

export interface Descuento {
  id: string;
  nombre: string;
  tipo: "Porcentaje" | "Monto";
  valor: number;
  activo: boolean;
}