"use client";
import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { collection, addDoc, serverTimestamp, doc, runTransaction } from "@/lib/firebase-guard";
import { Transaction } from "firebase/firestore";
import { db, storage } from "../../lib/firebase";
import { useRouter } from "next/navigation";
import { verificarStock, descontarStockPEPS } from "../../lib/inventoryController";
import { agendarCitaGoogle } from "../../lib/actions"; 
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { cleanPrice, calculateAge, generateSearchTags, superNormalize } from "../../lib/utils";
import { toast } from 'sonner';
import { useAuth } from "@/hooks/useAuth";

// COMPONENTES UI
import Button from "../ui/Button"; 
import FormularioPacienteBase from "./FormularioPacienteBase";

interface Servicio {
  sku: string;
  nombre: string;
  precio: string | number;
  tipo?: string;
  duracion?: string; 
  area?: string;
  requiereStock?: boolean;
}

interface PatientFormProps {
  servicios: any[];
  medicos: any[];     
  descuentos: any[];
}

export default function PatientFormClient({ servicios, medicos, descuentos }: PatientFormProps) {
  const router = useRouter();
  const { user } = useAuth() as any; // Obtenemos la identidad de quien está logueado
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [age, setAge] = useState<number | null>(null);
  const [esLaboratorio, setEsLaboratorio] = useState(false);
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB límite Plan Spark
  const [bloqueoDuplicado, setBloqueoDuplicado] = useState(false);

  // --- ESTADOS DE SELECCIÓN (CASCADA) ---
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedMedicoId, setSelectedMedicoId] = useState("");
  const [selectedTipo, setSelectedTipo] = useState("");
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null);

  // --- ESTADOS DE DATOS DINÁMICOS ---
  const [listaTelefonos, setListaTelefonos] = useState<string[]>([""]);
  const [requiereFactura, setRequiereFactura] = useState(false);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [descuentoSeleccionado, setDescuentoSeleccionado] = useState<any>(null);
  const [montoFinal, setMontoFinal] = useState(0);
  const [esServicioMedico, setEsServicioMedico] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm();
  const fechaNacimiento = watch("fechaNacimiento");

  // 🧠 LÓGICA DE FILTRADO (CASCADA)
  const areasDisponibles = useMemo(() => {
    const areas = new Set<string>();
    servicios.forEach(s => s.area && areas.add(s.area));
    medicos.forEach(m => m.especialidad && areas.add(m.especialidad));
    
    // 💉 INYECCIÓN QUIRÚRGICA: Si hay laboratorios cargados, agregamos la opción
    if (servicios.some(s => s.tipo === "Laboratorio")) {
        areas.add("Laboratorio");
    }
    
    return Array.from(areas).sort();
  }, [servicios, medicos]);

  const medicosFiltrados = useMemo(() => {
    if (!selectedArea) return [];
    // Si es Lab, permitimos elegir cualquier médico (el solicitante)
    if (selectedArea === "Laboratorio") return medicos;
    
    return medicos.filter(m => 
      m.especialidad === selectedArea || m.especialidad === "Medicina General" || m.especialidad === "General"
    );
  }, [selectedArea, medicos]);

  const tiposDisponibles = useMemo(() => {
    if (!selectedArea) return [];
    
    // 🚀 ATAJO: Si eligió Especialidad "Laboratorio", solo mostramos esa opción
    if (selectedArea === "Laboratorio") return ["Estudios de Laboratorio"];

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

  // 🧠 CEREBRO FINANCIERO (PRECIOS Y CONVENIOS)
  useEffect(() => {
    if (!servicioSeleccionado) {
        setMontoFinal(0); setEsServicioMedico(false); setEsLaboratorio(false); return;
    }
    const isLab = servicioSeleccionado.tipo === "Laboratorio";
    setEsLaboratorio(isLab);
    setEsServicioMedico(servicioSeleccionado.tipo === "Servicio" || isLab);

    let precioBase = cleanPrice(servicioSeleccionado.precio); 
    if (descuentoSeleccionado && precioBase > 0) {
      precioBase = descuentoSeleccionado.tipo === "Porcentaje" 
        ? precioBase - ((precioBase * descuentoSeleccionado.valor) / 100)
        : precioBase - descuentoSeleccionado.valor;
    }
    setMontoFinal(Math.max(0, precioBase || 0));
  }, [servicioSeleccionado, descuentoSeleccionado]);

  useEffect(() => {
    if (fechaNacimiento) setAge(Number(calculateAge(fechaNacimiento)) || 0);
  }, [fechaNacimiento]);

  // Lógica Teléfonos
  const agregarTelefono = () => setListaTelefonos([...listaTelefonos, ""]);
  const actualizarTelefono = (i: number, v: string) => { const n = [...listaTelefonos]; n[i] = v; setListaTelefonos(n); };
  const eliminarTelefono = (i: number) => { if (listaTelefonos.length > 1) setListaTelefonos(listaTelefonos.filter((_, idx) => idx !== i)); };

  // components/forms/PatientFormClient.tsx

const onSubmit = async (data: any) => {
  if (!servicioSeleccionado) return toast.warning("Selecciona un servicio.");
  if (esServicioMedico && !selectedMedicoId) return toast.warning("Selecciona un Profesional.");
  if (esServicioMedico && !esLaboratorio && (!data.fechaCita || !data.horaCita)) return toast.error("Faltan datos de la cita.");

  setIsSubmitting(true);

  try {
    // 1. VERIFICAR INVENTARIO (Regla Original VSC)
    const requiereStock = servicioSeleccionado.requiereStock !== false;

    if (servicioSeleccionado.tipo === "Producto" && requiereStock) {
      const check = await verificarStock(servicioSeleccionado.sku, 1);
      if (!check.suficiente) { 
        toast.error("Stock insuficiente para este producto.");
        setIsSubmitting(false); 
        return; 
      }
    }

    // 2. PROCESAR FOTO (Regla Original VSC)
    let fotoUrl = null;
    if (fotoFile) {
        const snap = await uploadBytes(ref(storage, `pacientes/fotos/${Date.now()}_${fotoFile.name}`), fotoFile);
        fotoUrl = await getDownloadURL(snap.ref);
    }

    // 3. TRANSACCIÓN MAESTRA (Folio + Registro de Paciente en un solo paso)
    const counterRef = doc(db, "metadata", "pacientes_control");
    const nombreConstruido = superNormalize(`${data.nombres} ${data.apellidoPaterno} ${data.apellidoMaterno || ''}`);
    
    const result = await runTransaction(db, async (transaction: Transaction) => {
      const counterDoc = await transaction.get(counterRef);
      if (!counterDoc.exists()) throw new Error("Contador no inicializado en Firebase");

      const nuevoNumero = (counterDoc.data().ultimoFolio || 0) + 1;
      const folioExpediente = `SANSCE-${new Date().getFullYear()}-${nuevoNumero.toString().padStart(4, '0')}`;

      // A. Actualizamos el contador
      transaction.update(counterRef, { ultimoFolio: nuevoNumero });

      // B. Preparamos el expediente (Incluyendo 'tutor' para paridad con web)
      const { 
        razonSocial, rfc, regimenFiscal, usoCFDI, cpFiscal, emailFacturacion, tipoPersona,
        ...datosLimpios 
      } = data;

      const patientData = {
        ...datosLimpios,
        folioExpediente,
        nombreCompleto: nombreConstruido,
        searchKeywords: generateSearchTags(nombreConstruido),
        edad: age || 0,
        fotoUrl,
        telefonos: listaTelefonos.filter(t => t.trim() !== ""),
        telefonoCelular: listaTelefonos[0] || "", 
        convenioId: descuentoSeleccionado?.id || null,
        fechaRegistro: serverTimestamp(),
        origen: "mostrador_clinica",
        tutor: data.tutor || null,
        elaboradoPor: user?.email || "Usuario Desconocido",
        // Agrupación correcta de datos fiscales
        datosFiscales: requiereFactura ? {
            tipoPersona: tipoPersona || "Fisica",
            razonSocial: razonSocial?.toUpperCase(),
            rfc: rfc?.toUpperCase(),
            regimenFiscal: regimenFiscal,
            usoCFDI: usoCFDI,
            cpFiscal: cpFiscal,
            emailFacturacion: emailFacturacion,
        } : null
      };

      // C. Guardamos al paciente DENTRO de la transacción (Seguridad Máxima)
      const newPacRef = doc(collection(db, "pacientes"));
      transaction.set(newPacRef, patientData);

      return { id: newPacRef.id, folio: folioExpediente };
    });

    // 4. DESCONTAR STOCK (Mejora: Homologado con VentaForm para trazabilidad Folio + Nombre)
    if (servicioSeleccionado.tipo === "Producto" && requiereStock) {
      // @ts-ignore
      await descontarStockPEPS(
        servicioSeleccionado.sku, 
        servicioSeleccionado.nombre, 
        1, 
        `${result.folio} - ${nombreConstruido}` // 👈 CAMBIO CLAVE: Concatenamos el nombre
      );
    }

    // 5. AGENDA (Google + Firebase) - RECUPERADO: 'esTodoElDia'
    if (esServicioMedico && selectedMedicoId) {
        const medicoObj = medicos.find(m => m.id === selectedMedicoId);
        const resGoogle = await agendarCitaGoogle({
            calendarId: medicoObj.calendarId,
            doctorNombre: medicoObj.nombre,
            fecha: data.fechaCita,
            hora: data.horaCita || "00:00",
            pacienteNombre: nombreConstruido,
            motivo: (esLaboratorio ? "🔬 LAB: " : "🩺 ") + servicioSeleccionado.nombre,
            duracionMinutos: parseInt(servicioSeleccionado?.duracion || "30"),
            esTodoElDia: esLaboratorio && !data.horaCita // <-- RESTAURADO
        });

        await addDoc(collection(db, "citas"), {
            doctorId: medicoObj.id,
            doctorNombre: medicoObj.nombre,
            paciente: nombreConstruido,
            pacienteId: result.id, 
            fecha: data.fechaCita,
            hora: data.horaCita,
            creadoEn: new Date(),
            // ✅ CORRECCIÓN FINAL: Usamos 'eventId' (estándar unificado)
            googleEventId: resGoogle.eventId || null,
            confirmada: true 
        });
    }

    // 6. OPERACIÓN FINANCIERA - BLINDADA PARA CORTE DEL DÍA
    const esPagadoAlMomento = montoFinal === 0; // Detecta si es Cortesía o $0

    await addDoc(collection(db, "operaciones"), {
      pacienteId: result.id,
      pacienteNombre: nombreConstruido,
      folioPaciente: result.folio,
      elaboradoPor: user?.email || "Usuario Desconocido",
      requiereFactura,
      servicioSku: servicioSeleccionado.sku,
      servicioNombre: servicioSeleccionado.nombre,
      monto: montoFinal, 
      montoOriginal: cleanPrice(servicioSeleccionado.precio),
      descuentoAplicado: descuentoSeleccionado?.nombre || null,
      fecha: serverTimestamp(), // Fecha de creación del registro
      
      // 👇 CAMBIO CLAVE: Asignamos fechaPago si se paga hoy. Si no, queda null.
      estatus: esPagadoAlMomento ? "Pagado (Cortesía)" : "Pendiente de Pago", 
      fechaPago: esPagadoAlMomento ? serverTimestamp() : null, 
      metodoPago: esPagadoAlMomento ? "Cortesía" : null,
      // 👆 FIN CAMBIO CLAVE

      esCita: esServicioMedico,
      fechaCita: data.fechaCita || null, 
      horaCita: data.horaCita || null,
      doctorId: selectedMedicoId || null, // <--- AGREGAR ESTA LÍNEA
      doctorNombre: medicos.find(m => m.id === selectedMedicoId)?.nombre || null
    });
    
    toast.success(`✅ Registro completo. Folio: ${result.folio}`);
    router.push('/pacientes'); 

  } catch (e: any) { 
    console.error(e); // <-- RESTAURADO (Para diagnóstico VSC)
    toast.error("Error en registro: " + e.message); 
  } finally { 
    setIsSubmitting(false); 
  }
};

  const inputStyle = "w-full rounded-md border-slate-300 shadow-sm py-2 px-3 text-sm border";
  const labelStyle = "block text-xs font-bold text-slate-600 mb-1 uppercase";

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 bg-white rounded-xl shadow-lg border border-slate-100">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Registro de Nuevo Paciente</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* SECCIÓN CASCADA */}
        <section className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h2 className="text-xl font-bold text-blue-800 pb-2 mb-4 border-b border-blue-200">1. Selección del Servicio</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
                <label className={labelStyle}>Especialidad</label>
                <select className={inputStyle} value={selectedArea} onChange={e => {setSelectedArea(e.target.value); setSelectedMedicoId(""); setSelectedTipo(""); setServicioSeleccionado(null);}} required>
                    <option value="">-- Seleccionar --</option>
                    {areasDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
            </div>
            <div>
                <label className={labelStyle}>Profesional</label>
                <select className={inputStyle} value={selectedMedicoId} onChange={e => setSelectedMedicoId(e.target.value)} disabled={!selectedArea}>
                    <option value="">-- Opcional --</option>
                    {medicosFiltrados.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
            </div>
            <div>
                <label className={labelStyle}>Tipo</label>
                <select className={inputStyle} value={selectedTipo} onChange={e => {setSelectedTipo(e.target.value); setServicioSeleccionado(null);}} disabled={!selectedArea}>
                    <option value="">-- Seleccionar --</option>
                    {tiposDisponibles.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
            <div>
                <label className={labelStyle}>Servicio Final</label>
                <select className={inputStyle} value={servicioSeleccionado?.sku || ""} onChange={e => setServicioSeleccionado(servicios.find(x => x.sku === e.target.value) || null)} disabled={!selectedTipo} required>
                    <option value="">-- Seleccionar --</option>
                    {serviciosFinales.map(s => <option key={s.sku} value={s.sku}>{s.nombre}</option>)}
                </select>
            </div>
          </div>

          {servicioSeleccionado && (
             <div className="mt-4 text-right">
                <p className="text-xs text-slate-400 line-through">${cleanPrice(servicioSeleccionado.precio).toFixed(2)}</p>
                <p className="text-3xl font-bold text-blue-700">${montoFinal.toFixed(2)}</p>
             </div>
          )}

          {esServicioMedico && (
             <div className="mt-4 pt-4 border-t border-blue-200 grid grid-cols-2 gap-4">
                <div><label className={labelStyle}>Fecha Cita</label><input type="date" className={inputStyle} {...register("fechaCita", { required: true })} /></div>
                <div><label className={labelStyle}>Hora Cita</label><input type="time" className={inputStyle} {...register("horaCita", { required: !esLaboratorio })} /></div>
             </div>
          )}
        </section>

        {/* FORMULARIO BASE HOMOLOGADO */}
        <FormularioPacienteBase 
            register={register} errors={errors} watch={watch} setValue={setValue}
            listaTelefonos={listaTelefonos} actualizarTelefono={actualizarTelefono}
            agregarTelefono={agregarTelefono} eliminarTelefono={eliminarTelefono}
            descuentos={descuentos} setDescuentoSeleccionado={setDescuentoSeleccionado}
            requiereFactura={requiereFactura} setRequiereFactura={setRequiereFactura}
            setFotoFile={setFotoFile}
            setBloqueoDuplicado={setBloqueoDuplicado}
        />

        <Button 
            type="submit" 
            isLoading={isSubmitting} 
            disabled={bloqueoDuplicado} // <--- AQUÍ LA MAGIA
            className={`w-full text-lg py-4 ${bloqueoDuplicado ? 'opacity-50 cursor-not-allowed bg-slate-400' : ''}`}
        >
          {bloqueoDuplicado ? "⛔ DUPLICADO DETECTADO - NO SE PUEDE GUARDAR" : "💾 Guardar Expediente y Generar Cobro"}
        </Button>
      </form>
    </div>
  );
}