"use client";
import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { collection, addDoc, serverTimestamp } from "@/lib/firebase-guard";
import { db, storage } from "../../lib/firebase";
import { useRouter } from "next/navigation";
import { verificarStock, descontarStockPEPS } from "../../lib/inventoryController";
import { agendarCitaGoogle } from "../../lib/actions"; 
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { cleanPrice, calculateAge, generateSearchTags } from "../../lib/utils";
import { toast } from 'sonner';

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
}

interface PatientFormProps {
  servicios: any[];
  medicos: any[];     
  descuentos: any[];
}

export default function PatientFormClient({ servicios, medicos, descuentos }: PatientFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [age, setAge] = useState<number | null>(null);
  const [esLaboratorio, setEsLaboratorio] = useState(false);
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB límite Plan Spark

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
    return Array.from(areas).sort();
  }, [servicios, medicos]);

  const medicosFiltrados = useMemo(() => {
    if (!selectedArea) return [];
    if (selectedArea === "Laboratorio") return medicos;
    return medicos.filter(m => 
      m.especialidad === selectedArea || m.especialidad === "Medicina General" || m.especialidad === "General"
    );
  }, [selectedArea, medicos]);

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

  const onSubmit = async (data: any) => {
    if (!servicioSeleccionado) return toast.warning("Selecciona un servicio.");
    if (esServicioMedico && !selectedMedicoId) return toast.warning("Selecciona un Profesional.");
    if (esServicioMedico && !esLaboratorio && (!data.fechaCita || !data.horaCita)) return toast.error("Faltan datos de la cita.");

    setIsSubmitting(true);
    try {
      // 1. INVENTARIO
      if (servicioSeleccionado.tipo === "Producto") {
        const check = await verificarStock(servicioSeleccionado.sku, 1);
        if (!check.suficiente) { toast.error("Stock insuficiente."); setIsSubmitting(false); return; }
        await descontarStockPEPS(servicioSeleccionado.sku, servicioSeleccionado.nombre, 1);
      }

      // 2. FOTOS
      let fotoUrl = null;
      if (fotoFile) {
          const snap = await uploadBytes(ref(storage, `pacientes/fotos/${Date.now()}_${fotoFile.name}`), fotoFile);
          fotoUrl = await getDownloadURL(snap.ref);
      }

      // 3. TRAZABILIDAD DE DATOS (Expediente)
      const nombreConstruido = `${data.nombres} ${data.apellidoPaterno} ${data.apellidoMaterno || ''}`.trim().toUpperCase();
      const patientData = {
          ...data,
          nombreCompleto: nombreConstruido,
          searchKeywords: generateSearchTags(nombreConstruido),
          edad: age || 0,
          fotoUrl,
          // ✅ Trazabilidad Dual de Teléfonos
          telefonos: listaTelefonos.filter(t => t.trim() !== ""),
          telefonoCelular: listaTelefonos[0] || "", 
          convenioId: descuentoSeleccionado?.id || null,
          fechaRegistro: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(db, "pacientes"), patientData);

      // 4. AGENDA (Google + Firebase)
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
              esTodoElDia: esLaboratorio && !data.horaCita
          });

          await addDoc(collection(db, "citas"), {
              doctorId: medicoObj.id,
              doctorNombre: medicoObj.nombre,
              paciente: nombreConstruido,
              pacienteId: docRef.id,
              fecha: data.fechaCita,
              hora: data.horaCita,
              creadoEn: new Date(),
              googleEventId: resGoogle.googleEventId || null,
              confirmada: true 
          });
      }

      // 5. OPERACIÓN FINANCIERA (Reporte Ingresos)
      await addDoc(collection(db, "operaciones"), {
        pacienteId: docRef.id,
        pacienteNombre: nombreConstruido,
        servicioSku: servicioSeleccionado.sku,
        servicioNombre: servicioSeleccionado.nombre,
        monto: montoFinal, 
        montoOriginal: cleanPrice(servicioSeleccionado.precio),
        descuentoAplicado: descuentoSeleccionado?.nombre || null,
        fecha: serverTimestamp(),
        estatus: montoFinal === 0 ? "Pagado (Cortesía)" : "Pendiente de Pago", 
        esCita: esServicioMedico,
        doctorNombre: medicos.find(m => m.id === selectedMedicoId)?.nombre || null
      });
      
      toast.success("✅ Registro completo.");
      router.push('/pacientes'); 
    } catch (e: any) { toast.error("Error: " + e.message); } 
    finally { setIsSubmitting(false); }
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
        />

        <Button type="submit" isLoading={isSubmitting} className="w-full text-lg py-4">
          💾 Guardar Expediente y Generar Cobro
        </Button>
      </form>
    </div>
  );
}