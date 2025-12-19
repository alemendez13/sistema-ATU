"use client";
import { useState, useEffect } from "react";
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

// --- CATÁLOGOS ESTÁTICOS ---
const ESTADOS_MX = ["Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas", "Extranjero"];
const GENEROS = ["Masculino", "Femenino", "Transgénero", "No binario", "Prefiero no decir"];
const ESTADO_CIVIL = ["Soltero", "Casado", "Divorciado", "Viudo", "Concubinato"];
const RELIGIONES = ["Ninguna", "Catolicismo", "Cristianismo", "Testigo de Jehová", "Judaísmo", "Islam", "Budismo", "Hinduismo", "Otra"];
const ESCOLARIDAD = ["Analfabeta", "Sabe leer y escribir", "Preescolar", "Primaria", "Secundaria", "Preparatoria", "Licenciatura", "Postgrado", "Otro"];
const OCUPACIONES = ["Empleado", "Empresario", "Comerciante", "Profesional de la salud", "Oficinista", "Obrero", "Ama de casa", "Desempleado", "Estudiante", "Jubilado", "Otro"];
const MEDIOS_MARKETING = ["Google", "Doctoralia", "Facebook", "Instagram", "Página Web", "WhatsApp", "Recomendación Familiar", "Recomendación Profesional Salud", "Otro"];
const REGIMENES_FISCALES = [
  "601 - General de Ley Personas Morales",
  "603 - Personas Morales con Fines no Lucrativos",
  "605 - Sueldos y Salarios e Ingresos Asimilados a Salarios",
  "606 - Arrendamiento",
  "612 - Personas Físicas con Actividades Empresariales y Profesionales",
  "621 - Incorporación Fiscal",
  "624 - Coordinados",
  "625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas",
  "626 - Régimen Simplificado de Confianza"
];
const USOS_CFDI = [
  "G01 - Adquisición de mercancías",
  "G03 - Gastos en general",
  "D01 - Honorarios médicos, dentales y gastos hospitalarios",
  "D02 - Gastos médicos por incapacidad o discapacidad",
  "S01 - Sin efectos fiscales",
  "CP01 - Pagos"
];

interface Servicio {
  sku: string;
  nombre: string;
  precio: string;
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
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null);
  const [requiereFactura, setRequiereFactura] = useState(false);
  const router = useRouter();
  
  // FOTO DEL PACIENTE (Solo el File, el preview lo maneja el componente Smart)
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [descuentoSeleccionado, setDescuentoSeleccionado] = useState<any>(null);
  const [montoFinal, setMontoFinal] = useState(0);
  const [esServicioMedico, setEsServicioMedico] = useState(false); // Detecta si requiere agenda
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm();
  const fechaNacimiento = watch("fechaNacimiento");


  // 🧠 CEREBRO FINANCIERO: Recalcula precio al cambiar servicio o descuento
  useEffect(() => {
    if (!servicioSeleccionado) {
        setMontoFinal(0);
        setEsServicioMedico(false);
        return;
    }

    // 1. Detectar si es servicio médico (busca palabras clave o tipo)
    const esServ = servicioSeleccionado.tipo === "Servicio" || servicioSeleccionado.nombre.toLowerCase().includes("consulta");
    setEsServicioMedico(esServ);

    // 2. Limpieza de precio
    let precioBase = parseFloat(servicioSeleccionado.precio.toString().replace(/[$,]/g, '')) || 0;
    
    // 3. Aplicar Descuento
    if (descuentoSeleccionado && precioBase > 0) {
      if (descuentoSeleccionado.tipo === "Porcentaje") {
        const cantidadDescontar = (precioBase * descuentoSeleccionado.valor) / 100;
        precioBase = precioBase - cantidadDescontar;
      } else if (descuentoSeleccionado.tipo === "Monto") {
        precioBase = precioBase - descuentoSeleccionado.valor;
      }
    }
    
    setMontoFinal(Math.max(0, precioBase));
  }, [servicioSeleccionado, descuentoSeleccionado]);

  // Cálculo de edad
  useEffect(() => {
    if (fechaNacimiento) {
      const today = new Date();
      const birthDate = new Date(fechaNacimiento);
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      setAge(calculatedAge);
    }
  }, [fechaNacimiento]);

  const handleServicioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sku = e.target.value;
    const servicio = servicios.find(s => s.sku === sku);
    setServicioSeleccionado(servicio || null);
  };

  const onSubmit = async (data: any) => {
    if (!servicioSeleccionado) return toast.warning("Por favor selecciona un servicio inicial.");
    if (esServicioMedico && (!data.medicoId || !data.fechaCita || !data.horaCita)) {
        return toast.error("⚠️ Para este servicio debes asignar Médico, Fecha y Hora.");
    }
    setIsSubmitting(true);
    
    try {
      // 1. Validación de Stock (Solo Productos)
      if (servicioSeleccionado.tipo === "Producto") {
        const verificacion = await verificarStock(servicioSeleccionado.sku, 1);
        if (!verificacion.suficiente) {
          toast.error("❌ Stock insuficiente para este servicio.");
          setIsSubmitting(false);
          return;
        }
        await descontarStockPEPS(servicioSeleccionado.sku, servicioSeleccionado.nombre, 1);
      }

      // 2.1 SUBIDA DE FOTO
      let fotoUrl = null;
      if (fotoFile) {
        try {
          const storageRef = ref(storage, `pacientes/${Date.now()}_${fotoFile.name}`);
          const snapshot = await uploadBytes(storageRef, fotoFile);
          fotoUrl = await getDownloadURL(snapshot.ref);
        } catch (uploadError) {
          console.error("Error subiendo foto:", uploadError);
        }
      }

      // 2.2 Preparar datos COMPLETOS del Paciente
      const nombreConstruido = `${data.nombres} ${data.apellidoPaterno} ${data.apellidoMaterno || ''}`.trim().toUpperCase();

      const patientData = {
        nombres: data.nombres.toUpperCase(),
        apellidoPaterno: data.apellidoPaterno.toUpperCase(),
        apellidoMaterno: data.apellidoMaterno ? data.apellidoMaterno.toUpperCase() : "",
        nombreCompleto: nombreConstruido,
        fechaNacimiento: data.fechaNacimiento,
        edad: age || 0,
        genero: data.genero,
        tutor: (age !== null && age < 18) ? (data.tutor || null) : null,
        fotoUrl: fotoUrl, // URL obtenida de Firebase Storage
        
        telefonoCelular: data.telefonoCelular,
        telefonoFijo: data.telefonoFijo || null,
        email: data.email,

        lugarNacimiento: data.lugarNacimiento,
        lugarResidencia: data.lugarResidencia,
        estadoCivil: data.estadoCivil,
        religion: data.religion,
        escolaridad: data.escolaridad,
        ocupacion: data.ocupacion,

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

      if (esServicioMedico) {
          const medicoElegido = medicos.find(m => m.id === data.medicoId);
          
          // A. Google Calendar
          const resultadoGoogle = await agendarCitaGoogle({
              calendarId: medicoElegido.calendarId,
              doctorNombre: medicoElegido.nombre,
              fecha: data.fechaCita,
              hora: data.horaCita,
              pacienteNombre: nombreConstruido,
              motivo: "Primera Vez: " + servicioSeleccionado.nombre,
              duracionMinutos: parseInt(servicioSeleccionado?.duracion || "30")
          });

          // B. Firebase Citas
          await addDoc(collection(db, "citas"), {
              doctorId: medicoElegido.id,
              doctorNombre: medicoElegido.nombre,
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

      await addDoc(collection(db, "operaciones"), {
        pacienteId: docRef.id,
        pacienteNombre: patientData.nombreCompleto,
        servicioSku: servicioSeleccionado.sku,
        servicioNombre: servicioSeleccionado.nombre,
        
        // --- DATOS FINANCIEROS ACTUALIZADOS ---
        monto: montoFinal, 
        montoOriginal: parseFloat(servicioSeleccionado.precio.toString().replace(/[$,]/g, '')) || 0,
        descuentoAplicado: descuentoSeleccionado ? descuentoSeleccionado.nombre : null,
        
        fecha: serverTimestamp(),
        // Autopago si es cortesía ($0)
        estatus: montoFinal === 0 ? "Pagado (Cortesía)" : "Pendiente de Pago", 
        
        esCita: esServicioMedico,
        doctorId: data.medicoId || null,
        doctorNombre: medicos.find(m => m.id === data.medicoId)?.nombre || null
      });
      
      toast.success("✅ Paciente registrado exitosamente.");
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
        
        {/* === SECCIÓN 0: SERVICIO INICIAL === */}
        {/* === SECCIÓN 0: SERVICIO Y AGENDA (MEJORADA) === */}
        <section className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h2 className="text-xl font-bold text-blue-800 border-b border-blue-200 pb-2 mb-4 flex items-center gap-2">
             📅 Cita y Servicio Inicial
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div>
              <label className={labelStyle}>Servicio a Realizar</label>
              <select className={inputStyle} onChange={handleServicioChange} required>
                <option value="">-- Selecciona del Catálogo --</option>
                {servicios.map(s => (
                  <option key={s.sku} value={s.sku}>{s.nombre}</option>
                ))}
              </select>
            </div>

            {/* Selector de Descuento */}
            <div>
                <label className={labelStyle}>🏷️ Descuento / Convenio</label>
                <select 
                    className={inputStyle}
                    onChange={(e) => {
                        const id = e.target.value;
                        setDescuentoSeleccionado(descuentos.find(d => d.id === id) || null);
                    }}
                >
                    <option value="">-- Ninguno (Precio Lista) --</option>
                    {descuentos.map(d => (
                        <option key={d.id} value={d.id}>
                            {d.nombre} ({d.tipo === 'Porcentaje' ? `-${d.valor}%` : `-$${d.valor}`})
                        </option>
                    ))}
                </select>
            </div>
          </div>

          {/* VISUALIZADOR DE TOTAL */}
          {servicioSeleccionado && (
             <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-blue-100 mb-6">
                 <div>
                    <p className="text-xs text-slate-500">Precio Lista: <span className="line-through">${servicioSeleccionado.precio}</span></p>
                    {descuentoSeleccionado && <p className="text-xs text-green-600 font-bold">Aplicado: {descuentoSeleccionado.nombre}</p>}
                 </div>
                 <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase">Total a Pagar</p>
                    <p className="text-3xl font-bold text-blue-700">${montoFinal.toFixed(2)}</p>
                 </div>
             </div>
          )}

          {/* CAMPOS DE AGENDA (Solo aparecen si es servicio médico) */}
          {esServicioMedico && (
             <div className="bg-white p-4 rounded-lg border border-blue-200 animate-fade-in">
                <h3 className="text-sm font-bold text-blue-900 mb-3 uppercase">Datos de la Cita</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className={labelStyle}>Médico / Especialista</label>
                        <select className={inputStyle} {...register("medicoId", { required: true })}>
                            <option value="">-- Seleccionar --</option>
                            {/* Filtramos médicos según el área del servicio si existe */}
                            {/* Filtramos médicos con seguridad usando ?. */}
{medicos.filter(m => !servicioSeleccionado?.area || m.especialidad === servicioSeleccionado?.area || m.especialidad === "General")
    .map(m => (
    <option key={m.id} value={m.id}>{m.nombre} ({m.especialidad})</option>
))}
                        </select>
                    </div>
                    <div>
                        <label className={labelStyle}>Fecha Cita</label>
                        <input type="date" className={inputStyle} {...register("fechaCita", { required: true })} />
                    </div>
                    <div>
                        <label className={labelStyle}>Hora Inicio</label>
                        <input type="time" className={inputStyle} {...register("horaCita", { required: true })} />
                    </div>
                </div>
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
                <span>📋 Datos Demográficos y Marketing (Opcional)</span>
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
                    <label className={labelStyle}>Ocupación</label>
                    <select className={inputStyle} {...register("ocupacion")}>
                        <option value="">Seleccionar...</option>
                        {OCUPACIONES.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>
                
                {/* Campos Marketing */}
                <div>
                    <label className={labelStyle}>¿Cómo se enteró?</label>
                    <select className={inputStyle} {...register("medioMarketing")}>
                        <option value="">Seleccionar...</option>
                        {MEDIOS_MARKETING.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelStyle}>Referido Por</label>
                    <input type="text" className={inputStyle} {...register("referidoPor")} placeholder="Opcional" />
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