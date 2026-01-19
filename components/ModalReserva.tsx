"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, deleteDoc, doc } from "@/lib/firebase-guard";
import { db, storage } from "../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { agendarCitaGoogle, cancelarCitaGoogle, actualizarCitaGoogle } from "../lib/actions"; 
import { toast } from "sonner";
import { addMinutesToTime, cleanPrice, generateSearchTags, superNormalize } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import { useForm } from "react-hook-form";

// COMPONENTES COMPARTIDOS
import FormularioPacienteBase from "./forms/FormularioPacienteBase";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    doctor: any;
    hora: string;
    fecha: string;
    prefilledName?: string;
    waitingListId?: string;
  } | null;
  catalogoServicios: any[];
  bloqueos: any[]; 
  descuentos: any[]; 
  citaExistente?: any;
}

const sumarMinutos = (hora: string, minutos: number) => {
  const [h, m] = hora.split(':').map(Number);
  const totalMinutos = h * 60 + m + minutos;
  const newH = Math.floor(totalMinutos / 60);
  const newM = totalMinutos % 60;
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
};

export default function ModalReserva({ isOpen, onClose, data, catalogoServicios, bloqueos, descuentos, citaExistente }: ModalProps) {
  const { user } = useAuth() as any;
  const [loading, setLoading] = useState(false);
  
  // Estados de Cita
  const [servicioSku, setServicioSku] = useState(""); 
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  const [horaSeleccionada, setHoraSeleccionada] = useState("");
  const [precioFinal, setPrecioFinal] = useState<number | "">(""); 
  const [notaInterna, setNotaInterna] = useState(""); 
  const [historialCitas, setHistorialCitas] = useState<number>(0); 

  // Estados de Paciente y Formulario Base
  const [modo, setModo] = useState<'nuevo' | 'buscar'>('buscar');
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<any[]>([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<any>(null);
  const [bloqueoDuplicado, setBloqueoDuplicado] = useState(false);
  
  // Props para FormularioPacienteBase
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm();
  const [listaTelefonos, setListaTelefonos] = useState<string[]>([""]);
  const [requiereFactura, setRequiereFactura] = useState(false);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [descuentoId, setDescuentoId] = useState("");
  const [descuentoSeleccionado, setDescuentoSeleccionado] = useState<any>(null);

  // Lógica Teléfonos
  const agregarTelefono = () => setListaTelefonos([...listaTelefonos, ""]);
  const actualizarTelefono = (i: number, v: string) => { const n = [...listaTelefonos]; n[i] = v; setListaTelefonos(n); };
  const eliminarTelefono = (i: number) => { if (listaTelefonos.length > 1) setListaTelefonos(listaTelefonos.filter((_, idx) => idx !== i)); };

  useEffect(() => {
    if (isOpen) {
        setServicioSku(""); setPrecioFinal(""); setNotaInterna(""); setHistorialCitas(0);
        setFechaSeleccionada(data?.fecha || ""); setHoraSeleccionada(data?.hora || "");
        setBloqueoDuplicado(false);
        if (data?.prefilledName) { setModo('nuevo'); setValue("nombres", data.prefilledName.toUpperCase()); }
    }
  }, [isOpen, data, setValue]);

  // 🧠 CEREBRO FINANCIERO E HISTORIAL
  useEffect(() => {
    const calcularDatosInteligentes = async () => {
        if (!servicioSku) return;
        const servicio = catalogoServicios.find(s => s.sku === servicioSku);
        if (servicio) {
            let precioBase = cleanPrice(servicio.precio);
            const desc = descuentos.find((d: any) => d.id === (descuentoSeleccionado?.id || descuentoId));
            if (desc) {
                precioBase = desc.tipo === "Porcentaje" ? precioBase - (precioBase * desc.valor / 100) : precioBase - desc.valor;
            }
            setPrecioFinal(Math.max(0, precioBase));
        }

        if (pacienteSeleccionado?.id && servicioSku) {
            try {
                const q = query(collection(db, "operaciones"), where("pacienteId", "==", pacienteSeleccionado.id), where("servicioSku", "==", servicioSku));
                const snap = await getDocs(q);
                setHistorialCitas(snap.size);
            } catch (e) { console.error(e); }
        } else { setHistorialCitas(0); }
    };
    calcularDatosInteligentes();
  }, [servicioSku, descuentoId, descuentoSeleccionado, pacienteSeleccionado, catalogoServicios, descuentos]);

  // 🛡️ VERIFICACIÓN DISPONIBILIDAD
  const verificarDisponibilidadMultiples = async (doctorId: string, fecha: string, horaInicio: string, cantidadBloques30min: number, googleEventIdAExcluir?: string) => {
    let horaCheck = horaInicio;
    for (let i = 0; i < cantidadBloques30min; i++) {
        const llaveBloqueo = `${doctorId}|${horaCheck}`;
        const bloqueoEnGoogle = bloqueos.find((b: any) => b.key === llaveBloqueo);
        if (bloqueoEnGoogle && bloqueoEnGoogle.googleEventId !== googleEventIdAExcluir) return false;
        
        const q = query(collection(db, "citas"), where("doctorId", "==", doctorId), where("fecha", "==", fecha), where("hora", "==", horaCheck));
        const snapshot = await getDocs(q);
        if (!snapshot.empty && snapshot.docs.some(d => d.data().googleEventId !== googleEventIdAExcluir)) return false;
        horaCheck = addMinutesToTime(horaCheck, 30); 
    }
    return true; 
  };

  // 🔍 BÚSQUEDA INTELIGENTE
  useEffect(() => {
    const buscarPacientes = async () => {
      if (busqueda.length < 3) { setResultados([]); return; }
      const tokensBusqueda = busqueda.trim().toUpperCase().split(/\s+/);
      const q = query(collection(db, "pacientes"), where("searchKeywords", "array-contains", tokensBusqueda[0]), limit(20));
      const snap = await getDocs(q);
      let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (tokensBusqueda.length > 1) {
          docs = docs.filter((p: any) => tokensBusqueda.every(token => p.nombreCompleto.includes(token)));
      }
      setResultados(docs);
    };
    const timer = setTimeout(buscarPacientes, 300);
    return () => clearTimeout(timer);
  }, [busqueda]);

  const handleGuardar = async (formData: any) => {
    if (!servicioSku) return toast.warning("Selecciona un servicio.");
    if (modo === 'buscar' && !pacienteSeleccionado) return toast.warning("Selecciona un paciente.");
    
    // --- 1. PREPARACIÓN DE VARIABLES ---
    const servicioDetalle = catalogoServicios.find(s => s.sku === servicioSku);
    const duracionMinutos = parseInt(servicioDetalle?.duracion || "30");
    const bloquesNecesarios = Math.ceil(duracionMinutos / 30); 
    const tituloCita = notaInterna ? `${servicioDetalle?.nombre} (${notaInterna})` : servicioDetalle?.nombre;

    // Normalización de identidad
    const nombreParaNormalizar = `${formData.nombres} ${formData.apellidoPaterno} ${formData.apellidoMaterno || ''}`;
    let nombreFinal = modo === 'buscar' 
        ? pacienteSeleccionado?.nombreCompleto 
        : superNormalize(nombreParaNormalizar);
    
    const idParaLimpieza = pacienteSeleccionado?.id || citaExistente?.pacienteId || null;

    setLoading(true);

    try {
      // 🛡️ VERIFICACIÓN DISPONIBILIDAD
      // Pasamos el googleEventId actual para que el sistema sepa que "nosotros mismos" no somos un bloqueo
      const hayEspacio = await verificarDisponibilidadMultiples(
          data!.doctor.id, 
          fechaSeleccionada, 
          horaSeleccionada, 
          bloquesNecesarios, 
          citaExistente?.googleEventId
      );
      
      if (!hayEspacio) { toast.error("El horario ya no está disponible."); setLoading(false); return; }

      // -----------------------------------------------------------------------
      // 🧠 LÓGICA CORE: GESTIÓN DE ID DE GOOGLE (Corrección Fase 8)
      // -----------------------------------------------------------------------
      let googleEventIdFinal = ""; // Aquí guardaremos el ID definitivo (sea viejo o nuevo)
      const cambioDeDoctor = citaExistente ? citaExistente.doctorId !== data!.doctor.id : false;

      // >>> CASO A: EDICIÓN DE CITA EXISTENTE <<<
      if (citaExistente) {
          
          // 1. Limpieza de Firebase (Borramos los bloques visuales viejos para regenerarlos luego)
          const qOldCitas = query(collection(db, "citas"), where("googleEventId", "==", citaExistente.googleEventId));
          const snapOldCitas = await getDocs(qOldCitas);
          for (const d of snapOldCitas.docs) { await deleteDoc(doc(db, "citas", d.id)); }

          // 2. Limpieza Financiera (Solo si no está pagado, para evitar duplicidad de deuda)
          if (idParaLimpieza) {
              const qOldOp = query(
                  collection(db, "operaciones"),
                  where("pacienteId", "==", idParaLimpieza),
                  where("fechaCita", "==", citaExistente.fecha), // Buscamos por la fecha ORIGINAL
                  where("estatus", "in", ["Pendiente de Pago", "Pagado (Cortesía)"])
              );
              const snapOldOp = await getDocs(qOldOp);
              for (const d of snapOldOp.docs) { await deleteDoc(doc(db, "operaciones", d.id)); }
          }

          // 3. Gestión con Google Calendar
          if (!cambioDeDoctor && citaExistente.googleEventId) {
              // ESCENARIO 1: Mismo Doctor -> ACTUALIZAMOS (PATCH)
              // No borramos ni creamos nuevo. Mantenemos el ID original. Trazabilidad intacta.
              await actualizarCitaGoogle({
                  calendarId: data!.doctor.calendarId,
                  eventId: citaExistente.googleEventId,
                  fecha: fechaSeleccionada,
                  hora: horaSeleccionada,
                  duracionMinutos: duracionMinutos,
                  pacienteNombre: nombreFinal,
                  motivo: tituloCita
              });
              googleEventIdFinal = citaExistente.googleEventId; // ✅ Reusamos el ID
          
          } else if (citaExistente.googleEventId && citaExistente.doctorCalendarId) {
              // ESCENARIO 2: Cambio de Doctor -> BORRAR VIEJO + CREAR NUEVO
              // Borramos del calendario del doctor anterior
              await cancelarCitaGoogle({
                  calendarId: citaExistente.doctorCalendarId,
                  eventId: citaExistente.googleEventId
              });
              
              // Creamos en el calendario del nuevo doctor
              const resGoogle = await agendarCitaGoogle({
                  calendarId: data!.doctor.calendarId,
                  doctorNombre: data!.doctor.nombre,
                  fecha: fechaSeleccionada,
                  hora: horaSeleccionada,
                  pacienteNombre: nombreFinal,
                  motivo: tituloCita,
                  duracionMinutos: duracionMinutos,
                  esTodoElDia: servicioDetalle?.tipo === 'Laboratorio'
              });
              googleEventIdFinal = resGoogle.googleEventId || ""; 
          }

      } else {
          // >>> CASO B: CITA TOTALMENTE NUEVA <<<
          const resGoogle = await agendarCitaGoogle({
              calendarId: data!.doctor.calendarId,
              doctorNombre: data!.doctor.nombre,
              fecha: fechaSeleccionada,
              hora: horaSeleccionada,
              pacienteNombre: nombreFinal,
              motivo: tituloCita,
              duracionMinutos: duracionMinutos,
              esTodoElDia: servicioDetalle?.tipo === 'Laboratorio'
          });
          googleEventIdFinal = resGoogle.googleEventId || "";
      }

      // 2. REGISTRO DE PACIENTE (Si es nuevo) - Lógica Original mantenida
      let idFinal = pacienteSeleccionado?.id;
      let telFinal = pacienteSeleccionado?.telefonoCelular;

      if (modo === 'nuevo') {
          let fotoUrl = null;
          if (fotoFile) {
              const snap = await uploadBytes(ref(storage, `pacientes/fotos/${Date.now()}_${fotoFile.name}`), fotoFile);
              fotoUrl = await getDownloadURL(snap.ref);
          }
          const { 
            razonSocial, rfc, regimenFiscal, usoCFDI, cpFiscal, emailFacturacion, tipoPersona,
            ...datosRestantes 
          } = formData;

          const patientData = {
              ...datosRestantes,
              nombreCompleto: nombreFinal,
              searchKeywords: generateSearchTags(nombreFinal),
              fotoUrl,
              telefonos: listaTelefonos.filter(t => t.trim() !== ""),
              telefonoCelular: listaTelefonos[0] || "",
              convenioId: descuentoSeleccionado?.id || null,
              fechaRegistro: serverTimestamp(),
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
          const docPac = await addDoc(collection(db, "pacientes"), patientData);
          idFinal = docPac.id;
          telFinal = patientData.telefonoCelular;
      }

      // 3. GENERACIÓN DE BLOQUES EN FIREBASE (Agenda Visual)
      // Usamos googleEventIdFinal que calculamos arriba
      let horaActual = horaSeleccionada;
      for (let i = 0; i < bloquesNecesarios; i++) {
          await addDoc(collection(db, "citas"), {
            doctorId: data!.doctor.id, doctorNombre: data!.doctor.nombre,
            paciente: nombreFinal, pacienteId: idFinal,
            telefonoCelular: telFinal,
            motivo: i === 0 ? tituloCita : "(Continuación)", 
            fecha: fechaSeleccionada, hora: horaActual,
            creadoEn: serverTimestamp(), 
            googleEventId: googleEventIdFinal, // 👈 AQUÍ ESTÁ LA CLAVE DE LA CORRECCIÓN
            elaboradoPor: user?.email || "Admin"
          });
          horaActual = sumarMinutos(horaActual, 30);
      }

      // 4. OPERACIÓN FINANCIERA (Reporte Ingresos)
      // Solo creamos la deuda si no es una edición de "Solo cambio de hora" donde ya existía un pago,
      // pero como arriba borramos las deudas pendientes, aquí regeneramos la deuda actualizada.
      await addDoc(collection(db, "operaciones"), {
        pacienteId: idFinal, pacienteNombre: nombreFinal,
        requiereFactura: requiereFactura,
        servicioSku: servicioDetalle?.sku, servicioNombre: tituloCita,
        monto: Number(precioFinal), 
        montoOriginal: cleanPrice(servicioDetalle?.precio),
        descuentoAplicado: descuentoSeleccionado?.nombre || null,
        // Corrección para alinear con Caja y Reportes:
        estatus: Number(precioFinal) === 0 ? "Pagado (Cortesía)" : "Pendiente de Pago",
        // Si es cortesía ($0), registramos la fecha de pago HOY para que salga en el corte:
        fechaPago: Number(precioFinal) === 0 ? serverTimestamp() : null,
        metodoPago: Number(precioFinal) === 0 ? "Cortesía" : null,
        fecha: serverTimestamp(), fechaCita: fechaSeleccionada,
        doctorNombre: data!.doctor.nombre, origen: "Agenda"
      });

      if (data?.waitingListId) await deleteDoc(doc(db, "lista_espera", data.waitingListId));
      onClose(); 
      toast.success(citaExistente ? "✅ Cita re-programada con éxito." : "✅ Cita agendada correctamente.");
    } catch (e) { 
        console.error(e); 
        toast.error("Error al procesar."); 
    } finally { 
        setLoading(false); 
    }
  };

  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">Agendar Nueva Cita</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-3xl">×</button>
        </div>

        <form onSubmit={handleSubmit(handleGuardar)} className="overflow-y-auto p-6 space-y-6 flex-1">
            {/* DATOS DE CITA */}
            <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div><label className="text-xs font-bold text-blue-600 uppercase">Fecha</label>
                <input type="date" className="w-full border rounded p-2" value={fechaSeleccionada} onChange={e => setFechaSeleccionada(e.target.value)} /></div>
                <div><label className="text-xs font-bold text-blue-600 uppercase">Hora Inicio</label>
                <input type="time" className="w-full border rounded p-2" value={horaSeleccionada} onChange={e => setHoraSeleccionada(e.target.value)} /></div>
            </div>

            {/* SELECTOR MODO PACIENTE */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button type="button" onClick={() => setModo('buscar')} className={`flex-1 py-2 text-sm font-bold rounded-md transition ${modo === 'buscar' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>🔍 Buscar Existente</button>
              <button type="button" onClick={() => setModo('nuevo')} className={`flex-1 py-2 text-sm font-bold rounded-md transition ${modo === 'nuevo' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>✨ Registrar Nuevo</button>
            </div>

            {modo === 'buscar' ? (
                <div className="relative">
                    <input type="text" className="w-full border rounded p-3 uppercase" placeholder="Nombre del paciente..." value={busqueda} onChange={e => {setBusqueda(e.target.value); setPacienteSeleccionado(null);}} />
                    {resultados.length > 0 && !pacienteSeleccionado && (
                        <ul className="absolute z-10 w-full bg-white border rounded shadow-xl mt-1 max-h-40 overflow-y-auto">
                            {resultados.map(p => <li key={p.id} className="p-3 hover:bg-blue-50 cursor-pointer border-b text-sm font-bold" onClick={() => {setPacienteSeleccionado(p); setBusqueda(p.nombreCompleto); setResultados([]); if(p.convenioId) setDescuentoId(p.convenioId);const tieneRFC = !!(p.datosFiscales?.rfc || p.rfc);
                            setRequiereFactura(tieneRFC);}}>{p.nombreCompleto}</li>)}
                        </ul>
                    )}
                </div>
            ) : (
                <FormularioPacienteBase 
                  register={register} 
                  errors={errors} 
                  watch={watch} 
                  setValue={setValue} 
                  listaTelefonos={listaTelefonos} 
                  actualizarTelefono={actualizarTelefono} 
                  agregarTelefono={agregarTelefono} 
                  eliminarTelefono={eliminarTelefono} 
                  descuentos={descuentos} 
                  setDescuentoSeleccionado={setDescuentoSeleccionado} 
                  requiereFactura={requiereFactura} 
                  setRequiereFactura={setRequiereFactura} 
                  setFotoFile={setFotoFile}
                  setBloqueoDuplicado={setBloqueoDuplicado} 
                />
            )}

            {/* SECTOR SERVICIO Y COSTO */}
            <div className="space-y-4 border-t pt-4">
                <div><label className="text-xs font-bold text-slate-500 uppercase">Servicio o Paquete</label>
                <select className="w-full border p-3 rounded-lg font-bold" value={servicioSku} onChange={e => setServicioSku(e.target.value)} required>
                    <option value="">-- Seleccionar --</option>
                    {catalogoServicios.map(s => <option key={s.sku} value={s.sku}>{s.nombre} ({s.duracion} min)</option>)}
                </select></div>

                {servicioSku && (
                    <div className="bg-slate-50 p-4 rounded-lg border flex justify-between items-center">
                        <div><p className="text-xs text-slate-500 uppercase font-bold">Total a cobrar hoy</p>
                        <input type="number" className="text-2xl font-bold text-blue-700 bg-transparent outline-none w-32" value={precioFinal} onChange={e => setPrecioFinal(Number(e.target.value))} /></div>
                        <div className="text-right text-xs text-slate-400 italic">
                            {Math.ceil(parseInt(catalogoServicios.find(s=>s.sku===servicioSku).duracion)/30)} bloques de agenda
                        </div>
                    </div>
                )}
            </div>
        </form>

        <div className="p-6 border-t bg-slate-50 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 border rounded-lg font-bold text-slate-600 hover:bg-slate-200">Cancelar</button>
            {/* ✅ CORRECCIÓN EN BOTÓN: Bloqueamos si hay duplicado */}
            <button 
              type="submit" 
              onClick={handleSubmit(handleGuardar)} 
              disabled={loading || !servicioSku || (modo === 'nuevo' && bloqueoDuplicado)} 
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50"
            >
                {bloqueoDuplicado ? "⛔ Duplicado" : (loading ? "Procesando..." : "Confirmar Cita y Registro")}
            </button>
        </div>
      </div>
    </div>
  );
}