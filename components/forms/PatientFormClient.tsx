"use client";
import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useRouter } from "next/navigation";
import { verificarStock, descontarStockPEPS } from "../../lib/inventoryController";
import { agendarCitaGoogle } from "../../lib/actions"; 
import Button from "../ui/Button"; 
import { toast } from 'sonner';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../lib/firebase"; 
import SmartAvatarUploader from "../ui/SmartAvatarUploader";
import { cleanPrice, calculateAge, generateSearchTags } from "../../lib/utils";

// --- CATÁLOGOS ESTÁTICOS ---
const ESTADOS_MX = ["Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas", "Extranjero"];
const GENEROS = ["Masculino", "Femenino", "Transgénero", "No binario", "Prefiero no decir"];
const ESTADO_CIVIL = ["Soltero", "Casado", "Divorciado", "Viudo", "Concubinato"];
const RELIGIONES = ["Ninguna", "Catolicismo", "Cristianismo", "Testigo de Jehová", "Judaísmo", "Islam", "Budismo", "Hinduismo", "Otra"];
const ESCOLARIDAD = ["Analfabeta", "Sabe leer y escribir", "Preescolar", "Primaria", "Secundaria", "Preparatoria", "Licenciatura", "Postgrado", "Otro"];
const OCUPACIONES = ["Empleado", "Empresario", "Comerciante", "Profesional de la salud", "Oficinista", "Obrero", "Ama de casa", "Desempleado", "Estudiante", "Jubilado", "Otro"];
const MEDIOS_MARKETING = ["Pacientes", "Google", "Doctoralia", "Facebook", "Instagram", "Página Web", "WhatsApp", "Recomendación Familiar", "Recomendación Profesional Salud", "Otro"];
const GRUPOS_ETNICOS = ["Nahuas", "Mayas", "Zapotecas", "Mixtecas", "Otomíes", "Totonacas", "Tsotsiles", "Tzeltales", "Mazahuas", "Mazatecos", "Hispanos", "Latinoamericanos", "Anglosajones", "Otros"];
const REGIMENES_FISCALES = [
  "601 - General de Ley Personas Morales",
  "603 - Personas Morales con Fines no Lucrativos",
  "605 - Sueldos y Salarios e Ingresos Asimilados a Salarios",
  "606 - Arrendamiento",
  "607 - Régimen de Enajenación o Adquisición de Bienes",
  "608 - Demás ingresos",
  "610 - Residentes en el Extranjero sin Establecimiento Permanente en México",
  "611 - Ingresos por Dividendos (socios y accionistas)",
  "612 - Personas Físicas con Actividades Empresariales y Profesionales",
  "614 - Ingresos por intereses",
  "615 - Régimen de los ingresos por obtención de premios",
  "616 - Sin obligaciones fiscales",
  "620 - Sociedades Cooperativas de Producción que optan por diferir sus ingresos",
  "621 - Incorporación Fiscal",
  "622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras",
  "623 - Opcional para Grupos de Sociedades",
  "624 - Coordinados",
  "625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas",
  "626 - Régimen Simplificado de Confianza"
];
const USOS_CFDI = [
  "G01 - Adquisición de mercancías",
  "G02 - Devoluciones, descuentos o bonificaciones",
  "G03 - Gastos en general",
  "I01 - Construcciones",
  "I02 - Mobiliario y equipo de oficina por inversiones",
  "I03 - Equipo de transporte",
  "I04 - Equipo de cómputo y accesorios",
  "I05 - Dados, troqueles, moldes, matrices y herramental",
  "I06 - Comunicaciones telefónicas",
  "I07 - Comunicaciones satelitales",
  "I08 - Otra maquinaria y equipo",
  "D01 - Honorarios médicos, dentales y gastos hospitalarios",
  "D02 - Gastos médicos por incapacidad o discapacidad",
  "D03 - Gastos funerales",
  "D04 - Donativos",
  "D05 - Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación)",
  "D06 - Aportaciones voluntarias al SAR",
  "D07 - Primas por seguros de gastos médicos",
  "D08 - Gastos de transportación escolar obligatoria",
  "D09 - Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones",
  "D10 - Pagos por servicios educativos (Colegiaturas)",
  "S01 - Sin efectos fiscales",
  "CP01 - Pagos",
  "CN01 - Nómina"
];

interface Servicio {
  sku: string;
  nombre: string;
  precio: string | number;
  tipo?: string;
  duracion?: string; 
  area?: string;
}

interface PatientFormProps {
  servicios: any[];
  medicos: any[];     
  descuentos: any[];
}

export default function PatientFormClient({ servicios, medicos, descuentos }: PatientFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [age, setAge] = useState<number | null>(null);
  const [esLaboratorio, setEsLaboratorio] = useState(false);
  const router = useRouter();
  
  // --- ESTADOS PARA SELECCIÓN EN CASCADA (NUEVO) ---
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedMedicoId, setSelectedMedicoId] = useState("");
  const [selectedTipo, setSelectedTipo] = useState("");
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null);

  // Estados financieros y archivos
  const [requiereFactura, setRequiereFactura] = useState(false);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [constanciaFile, setConstanciaFile] = useState<File | null>(null); // Nuevo: Constancia Fiscal
  const [descuentoSeleccionado, setDescuentoSeleccionado] = useState<any>(null);
  const [montoFinal, setMontoFinal] = useState(0);
  const [esServicioMedico, setEsServicioMedico] = useState(false);
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm();
  const fechaNacimiento = watch("fechaNacimiento");

  // 🧠 LÓGICA DE FILTRADO (CASCADA)
  // 1. Áreas Disponibles
  const areasDisponibles = useMemo(() => {
    const areas = new Set<string>();
    servicios.forEach(s => s.area && areas.add(s.area));
    medicos.forEach(m => m.especialidad && areas.add(m.especialidad));
    return Array.from(areas).sort();
  }, [servicios, medicos]);

  // 2. Médicos Filtrados
  const medicosFiltrados = useMemo(() => {
  if (!selectedArea) return [];
  
  // Si es Laboratorio, mostramos toda la lista de profesionales para asignar el responsable
  if (selectedArea === "Laboratorio") return medicos;
  
  // Filtro normal para consultas médicas
  return medicos.filter(m => 
    m.especialidad === selectedArea || 
    m.especialidad === "Medicina General" || 
    m.especialidad === "General"
  );
}, [selectedArea, medicos]);

  // 3. Tipos de Servicio
  const tiposDisponibles = useMemo(() => {
    if (!selectedArea) return [];
    const servsDelArea = servicios.filter(s => s.area === selectedArea);
    const tipos = new Set<string>();
    servsDelArea.forEach(s => {
        if (s.tipo === "Laboratorio") tipos.add("Estudios de Laboratorio");
        else if (s.tipo === "Producto") tipos.add("Farmacia / Productos");
        else if (s.nombre.toLowerCase().includes("paquete")) tipos.add("Paquetes");
        else tipos.add("Consulta / Terapia");
    });
    return Array.from(tipos).sort();
  }, [selectedArea, servicios]);

  // 4. Servicios Finales
  const serviciosFinales = useMemo(() => {
    if (!selectedArea || !selectedTipo) return [];
    return servicios.filter(s => {
        const coincideArea = s.area === selectedArea;
        let coincideTipo = false;
        if (selectedTipo === "Estudios de Laboratorio") coincideTipo = s.tipo === "Laboratorio";
        else if (selectedTipo === "Farmacia / Productos") coincideTipo = s.tipo === "Producto";
        else if (selectedTipo === "Paquetes") coincideTipo = s.nombre.toLowerCase().includes("paquete");
        else coincideTipo = s.tipo === "Servicio" && !s.nombre.toLowerCase().includes("paquete");
        return coincideArea && coincideTipo;
    });
  }, [selectedArea, selectedTipo, servicios]);

  // 🧠 CEREBRO FINANCIERO ACTUALIZADO
  useEffect(() => {
    if (!servicioSeleccionado) {
        setMontoFinal(0);
        setEsServicioMedico(false);
        setEsLaboratorio(false);
        return;
    }

    const isLab = servicioSeleccionado.tipo === "Laboratorio";
    setEsLaboratorio(isLab);

    // Habilitamos el bloque de agenda/seguimiento si es Servicio O Laboratorio
    const esAgenda = (servicioSeleccionado.tipo === "Servicio") || isLab;
    setEsServicioMedico(esAgenda);

    // Limpieza precio
    let precioBase = cleanPrice(servicioSeleccionado.precio); 
    
    // Descuento
    if (descuentoSeleccionado && precioBase > 0) {
      if (descuentoSeleccionado.tipo === "Porcentaje") {
        precioBase = precioBase - ((precioBase * descuentoSeleccionado.valor) / 100);
      } else {
        precioBase = precioBase - descuentoSeleccionado.valor;
      }
    }
    setMontoFinal(Math.max(0, precioBase || 0));
  }, [servicioSeleccionado, descuentoSeleccionado]);

  // Cálculo de edad (Se mantiene igual, no lo toques)
  useEffect(() => {
  if (fechaNacimiento) {
    const edadCalculada = calculateAge(fechaNacimiento);
    setAge(typeof edadCalculada === 'number' ? edadCalculada : 0);
  }
}, [fechaNacimiento]);

  const handleServicioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sku = e.target.value;
    const servicio = servicios.find(s => s.sku === sku);
    setServicioSeleccionado(servicio || null);
  };

  const onSubmit = async (data: any) => {
    // 1. VALIDACIONES INICIALES
    if (!servicioSeleccionado) return toast.warning("Por favor completa la selección del servicio.");
    // Validación para Laboratorio
    if (esLaboratorio && !selectedMedicoId) {
        return toast.warning("⚠️ Debes seleccionar un Profesional para el seguimiento de laboratorio.");
    }

    // Validación para Servicios Médicos (Consulta/Terapia)
    if (!esLaboratorio && esServicioMedico) {
        if (!selectedMedicoId) return toast.warning("Debes seleccionar un Profesional de la Salud.");
        if (!data.fechaCita || !data.horaCita) return toast.error("Faltan datos de fecha/hora para la cita.");
    }

    setIsSubmitting(true);
    
    try {
      // 2. STOCK (Conservado)
      if (servicioSeleccionado.tipo === "Producto") {
        const verificacion = await verificarStock(servicioSeleccionado.sku, 1);
        if (!verificacion.suficiente) {
          toast.error("❌ Stock insuficiente.");
          setIsSubmitting(false);
          return;
        }
        await descontarStockPEPS(servicioSeleccionado.sku, servicioSeleccionado.nombre, 1);
      }

      // 3. SUBIDA DE ARCHIVOS (Mejorado: Foto + Constancia)
      let fotoUrl = null;
      let constanciaUrl = null;

      if (fotoFile) {
          const snap = await uploadBytes(ref(storage, `pacientes/fotos/${Date.now()}_${fotoFile.name}`), fotoFile);
          fotoUrl = await getDownloadURL(snap.ref);
      }
      if (constanciaFile) {
          const snap = await uploadBytes(ref(storage, `pacientes/fiscales/${Date.now()}_${constanciaFile.name}`), constanciaFile);
          constanciaUrl = await getDownloadURL(snap.ref);
      }

      // 4. PREPARAR DATOS DEL PACIENTE (Mejorado: Nuevos Campos)
      const nombreConstruido = `${data.nombres} ${data.apellidoPaterno} ${data.apellidoMaterno || ''}`.trim().toUpperCase();

    const patientData = {
        nombres: data.nombres.toUpperCase(),
        apellidoPaterno: data.apellidoPaterno.toUpperCase(),
        apellidoMaterno: data.apellidoMaterno ? data.apellidoMaterno.toUpperCase() : "",
        nombreCompleto: nombreConstruido,
        searchKeywords: generateSearchTags(nombreConstruido),
        fechaNacimiento: data.fechaNacimiento,
        edad: age || 0,
        genero: data.genero,
        tutor: (age !== null && age < 18) ? (data.tutor || null) : null,
        fotoUrl, 
        constanciaFiscalUrl: constanciaUrl, // ✅ Nuevo

        telefonoCelular: data.telefonoCelular,
        telefonoFijo: data.telefonoFijo || null,
        email: data.email,

        lugarNacimiento: data.lugarNacimiento,
        lugarResidencia: data.lugarResidencia,
        estadoCivil: data.estadoCivil,
        religion: data.religion,
        escolaridad: data.escolaridad,
        ocupacion: data.ocupacion,
        curp: data.curp ? data.curp.toUpperCase() : null, // ✅ Nuevo
        grupoEtnico: data.grupoEtnico || null, // ✅ Nuevo

        medioMarketing: data.medioMarketing,
        referidoPor: data.referidoPor || null,

        datosFiscales: requiereFactura ? {
            tipoPersona: data.tipoPersona,
            razonSocial: data.razonSocial.toUpperCase(),
            rfc: data.rfc.toUpperCase(),
            regimenFiscal: data.regimenFiscal,
            usoCFDI: data.usoCFDI,
            cpFiscal: data.cpFiscal,
            emailFacturacion: data.emailFacturacion
        } : null,

        fechaRegistro: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(db, "pacientes"), patientData);

      // 5. AGENDA GOOGLE Y LOCAL (Conservado y Adaptado)
      let doctorFinalId = selectedMedicoId || null;
      let doctorFinalNombre = medicos.find(m => m.id === selectedMedicoId)?.nombre || null;

      if (esServicioMedico && doctorFinalId) {
          const medicoObj = medicos.find(m => m.id === doctorFinalId);
          
          // Si es laboratorio y no hay hora, se marca como evento de todo el día
          const esTodoElDia = esLaboratorio && !data.horaCita;

          // ✅ AQUÍ ESTÁ LA INTEGRACIÓN CON GOOGLE
          const resultadoGoogle = await agendarCitaGoogle({
              calendarId: medicoObj.calendarId,
              doctorNombre: medicoObj.nombre,
              fecha: data.fechaCita,
              hora: data.horaCita || "00:00",
              pacienteNombre: nombreConstruido,
              motivo: (esLaboratorio ? "🔬 LAB: " : "🩺 1ra Vez: ") + servicioSeleccionado.nombre,
              duracionMinutos: parseInt(servicioSeleccionado?.duracion || "30"),
              esTodoElDia: esTodoElDia // Enviamos la nueva instrucción
          });

          await addDoc(collection(db, "citas"), {
              doctorId: medicoObj.id,
              doctorNombre: medicoObj.nombre,
              paciente: nombreConstruido,
              pacienteId: docRef.id,
              fecha: data.fechaCita,
              hora: data.horaCita,
              motivo: servicioSeleccionado.nombre,
              creadoEn: new Date(),
              googleEventId: resultadoGoogle.googleEventId || null,
              confirmada: true 
          });
      }

      // 6. OPERACIÓN FINANCIERA (Mejorado: Desglose)
      await addDoc(collection(db, "operaciones"), {
        pacienteId: docRef.id,
        pacienteNombre: patientData.nombreCompleto,
        servicioSku: servicioSeleccionado.sku,
        servicioNombre: servicioSeleccionado.nombre,
        
        monto: montoFinal, 
        montoOriginal: typeof servicioSeleccionado.precio === 'string' ? parseFloat(servicioSeleccionado.precio.replace(/[$,]/g, '')) : servicioSeleccionado.precio,
        descuentoAplicado: descuentoSeleccionado ? descuentoSeleccionado.nombre : null,
        
        fecha: serverTimestamp(),
        estatus: montoFinal === 0 ? "Pagado (Cortesía)" : "Pendiente de Pago", 
        
        esCita: esServicioMedico,
        doctorId: doctorFinalId,
        doctorNombre: doctorFinalNombre
      });
      
      toast.success("✅ Paciente registrado.");
      router.push('/pacientes'); 
      
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error al guardar: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = "w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 text-sm border";
  const labelStyle = "block text-xs font-bold text-slate-600 mb-1 uppercase";
  const sectionTitle = "text-lg font-bold text-slate-800 border-b pb-2 mb-4 flex items-center gap-2";

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 bg-white rounded-xl shadow-lg border border-slate-100">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Registro de Nuevo Paciente</h1>
      <p className="text-slate-500 mb-8 text-sm">Complete todos los campos para el expediente clínico y administrativo.</p>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        {/* === SECCIÓN 0: SERVICIO EN CASCADA (CORREGIDO PARA PATIENT FORM) === */}
        <section className="bg-blue-50 p-6 rounded-lg border border-blue-200 shadow-sm">
          <h2 className="text-xl font-bold text-blue-800 border-b border-blue-200 pb-2 mb-4">
             1. Selección del Servicio (Cascada)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            
            {/* PASO 1: ESPECIALIDAD */}
            <div>
                <label className={labelStyle}>1. Especialidad / Área</label>
                <select 
                    className={inputStyle} 
                    value={selectedArea}
                    onChange={e => {
                        setSelectedArea(e.target.value);
                        setSelectedMedicoId(""); 
                        setSelectedTipo(""); 
                        setServicioSeleccionado(null); // 👈 CORREGIDO: Antes decía setServicioSku
                    }}
                    required
                >
                    <option value="">-- Seleccionar --</option>
                    {areasDisponibles.map((a: string) => <option key={a} value={a}>{a}</option>)}
                </select>
            </div>

            {/* PASO 2: PROFESIONAL */}
            <div>
                <label className={labelStyle}>2. Profesional</label>
                <select 
                    className={inputStyle}
                    value={selectedMedicoId}
                    onChange={e => setSelectedMedicoId(e.target.value)}
                    disabled={!selectedArea}
                >
                    <option value="">-- Opcional / N/A --</option>
                    {medicosFiltrados.map((m: any) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
            </div>

            {/* PASO 3: TIPO DE SERVICIO */}
            <div>
                <label className={labelStyle}>3. Tipo de Consulta</label>
                <select 
                    className={inputStyle}
                    value={selectedTipo}
                    onChange={e => {
                        setSelectedTipo(e.target.value);
                        setServicioSeleccionado(null); // 👈 CORREGIDO: Antes decía setServicioSku
                    }}
                    disabled={!selectedArea}
                >
                    <option value="">-- Seleccionar --</option>
                    {tiposDisponibles.map((t: string) => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            {/* PASO 4: SERVICIO FINAL */}
            <div>
                <label className={labelStyle}>4. Servicio Específico</label>
                <select 
                    className={inputStyle}
                    // 👇 CORREGIDO: Usamos el objeto servicioSeleccionado
                    value={servicioSeleccionado?.sku || ""}
                    onChange={e => {
                        const s = servicios.find(x => x.sku === e.target.value);
                        setServicioSeleccionado(s || null);
                    }}
                    disabled={!selectedTipo}
                    required
                >
                    <option value="">-- Seleccionar --</option>
                    {serviciosFinales.map((s: any) => (
                        <option key={s.sku} value={s.sku}>{s.nombre}</option>
                    ))}
                </select>
            </div>
          </div>

          {/* DESCUENTO Y TOTAL */}
          <div className="flex flex-col md:flex-row gap-4 items-end bg-white p-4 rounded border border-blue-100">
             <div className="flex-1 w-full">
                <label className={labelStyle}>🏷️ Descuento / Convenio</label>
                <select 
                    className={inputStyle}
                    onChange={(e) => setDescuentoSeleccionado(descuentos.find(d => d.id === e.target.value) || null)}
                >
                    <option value="">-- Ninguno (Precio Lista) --</option>
                    {descuentos.map((d: any) => (
                        <option key={d.id} value={d.id}>
                            {d.nombre} ({d.tipo === 'Porcentaje' ? `-${d.valor}%` : `-$${d.valor}`})
                        </option>
                    ))}
                </select>
             </div>
             
             {servicioSeleccionado && (
                 <div className="text-right">
                    <p className="text-xs text-slate-400 line-through">
                        {/* Validación de tipo para evitar errores de .toFixed */}
                        ${typeof servicioSeleccionado.precio === 'number' ? servicioSeleccionado.precio.toFixed(2) : servicioSeleccionado.precio}
                    </p>
                    <p className="text-3xl font-bold text-blue-700">${montoFinal.toFixed(2)}</p>
                 </div>
             )}
          </div>

          {/* AGENDA (Solo si aplica) */}
          {esServicioMedico && (
             <div className="mt-4 pt-4 border-t border-blue-200">
                <h3 className="text-sm font-bold text-blue-900 mb-2 uppercase">
                    {esLaboratorio ? "📋 Responsable de Seguimiento" : "📅 Datos de la Cita"}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelStyle}>Fecha</label>
                        <input type="date" className={inputStyle} {...register("fechaCita", { required: true })} />
                    </div>
                    <div>
                        <label className={labelStyle}>Hora</label>
                        <input 
                            type="time" 
                            className={inputStyle} 
                            {...register("horaCita", { required: !esLaboratorio })} 
                        />
                        {esLaboratorio && (
                            <p className="text-[10px] text-slate-400 mt-1 italic">
                                * Opcional: Dejar vacío para evento de todo el día.
                            </p>
                        )}
                    </div>
                </div>
                {!selectedMedicoId && <p className="text-xs text-red-500 mt-1">⚠️ Selecciona un Profesional en el paso 2 para agendar.</p>}
             </div>
          )}
        </section>

        {/* === SECCIÓN 1: IDENTIDAD === */}
        <section>
            <h2 className={sectionTitle}>👤 Identidad y Contacto</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* CORRECCIÓN AQUÍ: 
                   Se usa SOLAMENTE el SmartAvatarUploader.
                   Se ha eliminado el antiguo <label> con <input onChange={handleImageChange}>
                */}
                <div className="flex justify-center mb-6">
                   <SmartAvatarUploader 
                      onImageSelected={(file) => setFotoFile(file)} 
                   />
                </div>

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Nombre(s)</label>
                        <input className="w-full border rounded p-2 text-sm" {...register("nombres", { required: true })} 
                               onChange={(e) => setValue('nombres', e.target.value.toUpperCase())}/>
                    </div>
                    <div>
                        <label className={labelStyle}>Apellido Paterno</label>
                        <input type="text" className={inputStyle} {...register("apellidoPaterno", { required: true })}
                               onChange={(e) => setValue('apellidoPaterno', e.target.value.toUpperCase())} placeholder="EJ. PÉREZ" />
                    </div>
                    <div>
                        <label className={labelStyle}>Apellido Materno</label>
                        <input type="text" className={inputStyle} {...register("apellidoMaterno")}
                               onChange={(e) => setValue('apellidoMaterno', e.target.value.toUpperCase())} placeholder="EJ. LÓPEZ" />
                    </div>
                </div>
                <div>
                    <label className={labelStyle}>Fecha Nacimiento</label>
                    <input type="date" className={inputStyle} {...register("fechaNacimiento", { required: true })} />
                </div>
                <div>
                    <label className={labelStyle}>Género</label>
                    <select className={inputStyle} {...register("genero", { required: true })}>
                        <option value="">Seleccionar...</option>
                        {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelStyle}>Celular (WhatsApp)</label>
                    <input type="tel" className={inputStyle} {...register("telefonoCelular", { required: true })} />
                </div>
                <div>
                    <label className={labelStyle}>Email Personal</label>
                    <input type="email" className={inputStyle} {...register("email", { required: true })} />
                </div>
            </div>
            
            {age !== null && age < 18 && (
                <div className="mt-4 bg-amber-50 p-4 rounded border border-amber-200">
                    <label className={`${labelStyle} text-amber-700`}>Nombre del Tutor (Obligatorio por ser menor de edad)</label>
                    <input type="text" className={inputStyle} {...register("tutor", { required: true })} />
                </div>
            )}
        </section>

        {/* === SECCIÓN 2: SOCIODEMOGRÁFICOS === */}
        {/* === SECCIONES 2 y 3: DATOS COMPLEMENTARIOS (Acordeón simplificado) === */}
        <details className="group border rounded-lg bg-gray-50 mb-6">
            <summary className="cursor-pointer p-4 font-bold text-slate-700 list-none flex justify-between items-center">
                <span>📋 Datos Demográficos y Marketing</span>
                <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-4 pt-0 border-t grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                {/* Campos Sociodemográficos */}
                <div>
                    <label className={labelStyle}>Lugar de Nacimiento</label>
                    <select className={inputStyle} {...register("lugarNacimiento")}>
                        <option value="">Seleccionar...</option>
                        {ESTADOS_MX.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelStyle}>Lugar de Residencia</label>
                    <select className={inputStyle} {...register("lugarResidencia")}>
                        <option value="">Seleccionar...</option>
                        {ESTADOS_MX.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelStyle}>Estado Civil</label>
                    <select className={inputStyle} {...register("estadoCivil")}>
                        <option value="">Seleccionar...</option>
                        {ESTADO_CIVIL.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelStyle}>Religión</label>
                    <select className={inputStyle} {...register("religion")}>
                        <option value="">Seleccionar...</option>
                        {RELIGIONES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelStyle}>Escolaridad</label>
                    <select className={inputStyle} {...register("escolaridad")}>
                        <option value="">Seleccionar...</option>
                        {ESCOLARIDAD.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelStyle}>Ocupación</label>
                    <select className={inputStyle} {...register("ocupacion")}>
                        <option value="">Seleccionar...</option>
                        {OCUPACIONES.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelStyle}>CURP</label>
                    <input 
                        type="text" 
                        className={inputStyle} 
                        {...register("curp")} 
                        onChange={(e) => setValue('curp', e.target.value.toUpperCase())}
                        placeholder="18 caracteres"
                    />
                </div>
                <div>
                    <label className={labelStyle}>Grupo Étnico</label>
                    <select className={inputStyle} {...register("grupoEtnico", { required: true })}>
                        <option value="">Seleccionar...</option>
                        {GRUPOS_ETNICOS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                    {errors.grupoEtnico && <span className="text-[10px] text-red-500 font-bold">Campo requerido</span>}
                </div>
                
                {/* Campos Marketing */}
                <div>
                    <label className={labelStyle}>¿Cómo se enteró?</label>
                    <select className={inputStyle} {...register("medioMarketing", { required: true })}>
                        <option value="">Seleccionar...</option>
                        {MEDIOS_MARKETING.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                    {errors.medioMarketing && <span className="text-[10px] text-red-500 font-bold">Campo requerido</span>}
                </div>
                <div>
                    <label className={labelStyle}>Nombre del referente / Recomendado por</label>
                    <input type="text" className={inputStyle} {...register("referidoPor", { required: true })} placeholder="Escribe el nombre completo" />
                    {errors.referidoPor && <span className="text-[10px] text-red-500 font-bold">Campo requerido</span>}
                </div>
            </div>
        </details>

        {/* === SECCIÓN 4: DATOS FISCALES === */}
        <section className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">💼 Datos de Facturación</h2>
                <label className="flex items-center gap-2 cursor-pointer bg-slate-100 px-4 py-2 rounded-full border hover:bg-slate-200">
                    <input type="checkbox" className="rounded text-blue-600" checked={requiereFactura} onChange={(e) => setRequiereFactura(e.target.checked)} />
                    <span className="text-sm font-bold text-slate-700">¿Requiere Factura?</span>
                </label>
            </div>

            {requiereFactura && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-lg border border-slate-200 animate-fade-in-down">
                    <div>
                        <div className="md:col-span-3 mb-2">
                            <button
                                type="button"
                                onClick={() => {
                                    const nombreCompleto = `${watch("nombres")} ${watch("apellidoPaterno")} ${watch("apellidoMaterno") || ""}`.trim().toUpperCase();
                                    setValue("razonSocial", nombreCompleto);
                                    toast.info("Nombre del paciente copiado a Razón Social");
                                }}
                                className="text-[10px] bg-blue-100 text-blue-700 px-3 py-1 rounded font-bold hover:bg-blue-200 transition"
                            >
                                👤 ¿EL PACIENTE ES LA PERSONA QUE FACTURA? (Clic aquí para auto-rellenar nombre)
                            </button>
                        </div>
                        <label className={labelStyle}>Tipo de Persona</label>
                        <select className={inputStyle} {...register("tipoPersona", { required: requiereFactura })}>
                            <option value="Fisica">Física</option>
                            <option value="Moral">Moral</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className={labelStyle}>Razón Social / Nombre</label>
                        <input type="text" className={inputStyle} {...register("razonSocial", { required: requiereFactura })} 
                               onChange={(e) => setValue('razonSocial', e.target.value.toUpperCase())}/>
                    </div>
                    <div>
                        <label className={labelStyle}>RFC</label>
                        <input type="text" className={inputStyle} {...register("rfc", { required: requiereFactura })} 
                               onChange={(e) => setValue('rfc', e.target.value.toUpperCase())}/>
                    </div>
                    <div>
                        <label className={labelStyle}>Código Postal Fiscal</label>
                        <input type="text" className={inputStyle} {...register("cpFiscal", { required: requiereFactura })} />
                    </div>
                    <div>
                        <label className={labelStyle}>Email para Factura</label>
                        <input type="email" className={inputStyle} {...register("emailFacturacion", { required: requiereFactura })} />
                    </div>
                    <div className="md:col-span-3">
                        <label className={labelStyle}>Régimen Fiscal</label>
                        <select className={inputStyle} {...register("regimenFiscal", { required: requiereFactura })}>
                            <option value="">Seleccionar...</option>
                            {REGIMENES_FISCALES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-3">
                        <label className={labelStyle}>Uso de CFDI</label>
                        <select className={inputStyle} {...register("usoCFDI", { required: requiereFactura })}>
                            <option value="">Seleccionar...</option>
                            {USOS_CFDI.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                </div>
            )}
        </section>

        <Button 
          type="submit" 
          isLoading={isSubmitting}
          className="w-full text-lg mt-8 py-4"
        >
          💾 Guardar Expediente y Generar Cobro
        </Button>
      </form>
    </div>
  );
}