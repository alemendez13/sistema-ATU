"use client";
import { useState, useEffect, useMemo } from "react";
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, deleteDoc, doc } from "@/lib/firebase-guard";
import { db, storage } from "../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { agendarCitaGoogle, cancelarCitaGoogle, actualizarCitaGoogle } from "../lib/actions"; 
import { toast } from "sonner";
import { addMinutesToTime, cleanPrice, generateSearchTags, superNormalize, formatCurrency } from "../lib/utils";
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
  const [extras, setExtras] = useState<any[]>([]); // Lista de items extra
  const [extraSku, setExtraSku] = useState("");    // Selector temporal para el extra

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

  // 🔍 Estado para el término de búsqueda
  const [searchTerm, setSearchTerm] = useState("");

  // 🛡️ Filtro Quirúrgico: Consultas del Médico + Productos + Laboratorio + Servicios Generales
  const serviciosFiltrados = useMemo(() => {
    if (!catalogoServicios || catalogoServicios.length === 0) return [];

    const especialidadMedico = superNormalize(data?.doctor?.especialidad || "");
    const busquedaNormalizada = superNormalize(searchTerm);

    return catalogoServicios.filter(item => {
      // 1. Extraemos los valores con soporte para múltiples nombres de columna (Flexibilidad de Excel)
      const nombre = item['Nombre Servicio/Producto'] || item.Estudio || item.nombre || "";
      const especialidad = item.Especialidad || item.especialidad || "";
      
      const nombreNorm = superNormalize(nombre);
      const especialidadNorm = superNormalize(especialidad);

      // 2. Lógica de Compatibilidad "Inteligente"
      // Permite si la especialidad coincide PARCIALMENTE (ej: "MEDICINA GENERAL" incluye "GENERAL")
      const esMismaEspecialidad = especialidadNorm !== "" && (
        especialidadMedico.includes(especialidadNorm) || 
        especialidadNorm.includes(especialidadMedico)
      );

      const esGeneral = ["GENERAL", "LABORATORIO", "PRODUCTO", ""].includes(especialidadNorm);

      if (!esMismaEspecialidad && !esGeneral) return false;

      // 3. Si no hay búsqueda, mostramos todo lo compatible. Si hay, filtramos por nombre.
      return busquedaNormalizada === "" || nombreNorm.includes(busquedaNormalizada);
    });
  }, [catalogoServicios, data?.doctor?.especialidad, searchTerm]);

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
        
        // Buscamos el servicio comparando contra todos los posibles nombres de ID/SKU
        const servicio = catalogoServicios.find(s => (s.sku || s['SKU (ID)'] || s.ID) === servicioSku);
        
        if (servicio) {
            // 1. Calcular precio detectando automáticamente la columna correcta
            const precioBruto = servicio.precio || servicio['Precio Público'] || servicio.Precio_Publico || 0;
            let precioBase = cleanPrice(precioBruto);
            const desc = descuentos.find((d: any) => d.id === (descuentoSeleccionado?.id || descuentoId));
            
            // Aplicar descuento SOLO al servicio principal (Regla de Negocio más segura)
            if (desc) {
                precioBase = desc.tipo === "Porcentaje" ? precioBase - (precioBase * desc.valor / 100) : precioBase - desc.valor;
            }

            // 2. Sumar los extras
            const totalExtras = extras.reduce((sum, item) => sum + cleanPrice(item.precio), 0);
            
            // 3. Setear total final
            setPrecioFinal(Math.max(0, precioBase + totalExtras));
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

  // 👇 LÓGICA DEL CARRITO
  const handleAgregarExtra = () => {
      if (!extraSku) return;
      const item = catalogoServicios.find(s => s.sku === extraSku);
      if (item) {
          setExtras([...extras, item]);
          setExtraSku(""); // Limpiar selector
          toast.success(`Agregado: ${item.nombre}`);
      }
  };

  const handleRemoverExtra = (index: number) => {
      const nuevosExtras = [...extras];
      nuevosExtras.splice(index, 1);
      setExtras(nuevosExtras);
  };

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
              for (const d of snapOldOp.docs) {
                const dataOp = d.data();
                // Solo borramos si NO hay pagos parciales registrados
                if (!dataOp.desglosePagos || dataOp.desglosePagos.length === 0) {
                    await deleteDoc(doc(db, "operaciones", d.id));
                } else {
                    // OPCIÓN A: Bloquear la edición y pedir al usuario que cancele los pagos primero.
                    toast.error("⚠️ No se puede mover la cita automáticamente porque tiene PAGOS PARCIALES. Ajuste la deuda manualmente.");
                    setLoading(false);
                    return;
                    }
            }
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
              // ✅ CORRECCIÓN 1: Usamos 'eventId' (el nuevo estándar)
              googleEventIdFinal = resGoogle.eventId || "";
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
          // ✅ CORRECCIÓN 2: Usamos 'eventId' aquí también
          googleEventIdFinal = resGoogle.eventId || "";
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
              elaboradoPor: user?.email || "Usuario Desconocido",
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
      const fechaCitaIso = new Date(`${fechaSeleccionada}T${horaSeleccionada}:00`);

            await addDoc(collection(db, "operaciones"), {
            pacienteId: idFinal, pacienteNombre: nombreFinal,
            requiereFactura: requiereFactura,
            elaboradoPor: user?.email || "Usuario Desconocido",
            servicioSku: servicioDetalle?.sku, servicioNombre: tituloCita,
            monto: Number(precioFinal), 
            montoOriginal: cleanPrice(servicioDetalle?.precio),
            descuentoAplicado: descuentoSeleccionado?.nombre || null,
            
            estatus: Number(precioFinal) === 0 ? "Pagado (Cortesía)" : "Pendiente de Pago",
            
            // Ahora: Si es cortesía, usamos la fecha futura de la cita. Si es pago real pendiente, null.
            fechaPago: Number(precioFinal) === 0 ? fechaCitaIso : null,
            
            metodoPago: Number(precioFinal) === 0 ? "Cortesía" : null,
            fecha: serverTimestamp(), // Fecha de creación del registro (Auditoría)
            fechaCita: fechaSeleccionada, // String YYYY-MM-DD para filtros rápidos
            doctorNombre: data!.doctor.nombre, 
            doctorId: data!.doctor.id,
            origen: "Agenda"
            });

      // 5. GUARDAR EXTRAS (Loop de Operaciones Adicionales)
      for (const extra of extras) {
          await addDoc(collection(db, "operaciones"), {
            pacienteId: idFinal, pacienteNombre: nombreFinal,
            requiereFactura: requiereFactura,
            elaboradoPor: user?.email || "Usuario Desconocido",
            servicioSku: extra.sku, 
            servicioNombre: extra.nombre + " (Adicional)", // Etiqueta para diferenciar
            monto: cleanPrice(extra.precio), // Precio de lista del extra
            montoOriginal: cleanPrice(extra.precio),
            descuentoAplicado: null, // Asumimos que el descuento fue al servicio principal
            
            estatus: "Pendiente de Pago",
            fechaPago: null,
            metodoPago: null,
            
            fecha: serverTimestamp(),
            fechaCita: fechaSeleccionada, 
            doctorNombre: data!.doctor.nombre, 
            doctorId: data!.doctor.id,
            origen: "Agenda Extra"
          });
      }

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
                            {resultados.map(p => (
                                <li 
                                    key={p.id} 
                                    className="p-3 hover:bg-blue-50 cursor-pointer border-b text-sm font-bold" 
                                    onClick={() => {
                                        setPacienteSeleccionado(p); 
                                        setBusqueda(p.nombreCompleto); 
                                        setResultados([]); 
                                        
                                        // 🧠 FIX CRÍTICO: Sincronización completa del descuento
                                        const tieneRFC = !!(p.datosFiscales?.rfc || p.rfc);
                                        setRequiereFactura(tieneRFC);

                                        if(p.convenioId) {
                                            setDescuentoId(p.convenioId);
                                            // Buscamos y seteamos el objeto completo para que el cálculo matemático funcione
                                            const descObj = descuentos.find(d => d.id === p.convenioId);
                                            setDescuentoSeleccionado(descObj || null);
                                        } else {
                                            // Limpiamos si el paciente no tiene convenio
                                            setDescuentoId("");
                                            setDescuentoSeleccionado(null);
                                        }
                                    }}
                                >
                                    {p.nombreCompleto}
                                </li>
                            ))}
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
                <div className="relative">
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Buscar Consulta, Producto o Estudio</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-slate-400">🔍</span>
                        </div>
                        <input 
                            type="text"
                            placeholder="Escribe para buscar (ej: Psicología, Biometría, Vacuna...)"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-3 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-700 font-bold shadow-sm"
                        />
                        
                        {/* Lista de Resultados Filtrados */}
                        {searchTerm.length > 0 && (
                            <div className="absolute z-[100] w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-[250px] overflow-y-auto custom-scrollbar">
                                {serviciosFiltrados.length > 0 ? (
                                    serviciosFiltrados.map((s: any) => (
                                        <div 
                                            key={s.sku || s.ID}
                                            onClick={() => {
                                                setServicioSku(s.sku || s.ID);
                                                setSearchTerm(""); // Limpiar búsqueda al seleccionar
                                            }}
                                            className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-none transition-all flex flex-col"
                                        >
                                            <div className="flex justify-between items-center gap-2">
                                                <span className="text-sm font-bold text-slate-800">
                                                    {s.nombre || s['Nombre Servicio/Producto'] || s.Estudio}
                                                </span>
                                                <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                                                    {formatCurrency(cleanPrice(s.precio || s['Precio Público'] || s.Precio_Publico))}
                                                </span>
                                            </div>
                                            <div className="flex gap-2 items-center mt-1">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{s.Especialidad || 'General'}</span>
                                                {s.duracion && (
                                                    <span className="text-[9px] text-indigo-500 font-bold italic">⏱️ {s.duracion} min</span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-6 text-center">
                                        <p className="text-sm text-slate-400">Sin resultados compatibles.</p>
                                        <p className="text-[10px] text-slate-300 uppercase mt-1">Filtro activo: {data?.doctor?.especialidad}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Badge de Selección: Muestra lo seleccionado y permite borrarlo */}
                    {servicioSku && (
                        <div className="mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex justify-between items-center animate-in fade-in slide-in-from-top-1">
                            <div className="flex flex-col">
                                <span className="text-[9px] text-indigo-400 font-bold uppercase">Seleccionado:</span>
                                <span className="text-xs font-bold text-indigo-700">
                                    {catalogoServicios.find(s => (s.sku || s.ID) === servicioSku)?.nombre || 
                                     catalogoServicios.find(s => (s.sku || s.ID) === servicioSku)?.['Nombre Servicio/Producto']}
                                </span>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setServicioSku("")} 
                                className="w-8 h-8 flex items-center justify-center bg-white text-indigo-400 hover:text-red-500 rounded-full shadow-sm transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>

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
            {/* SECTOR EXTRAS (CARRITO) */}
            {servicioSku && (
                <div className="mt-4 border-t pt-4">
                    <label className="text-xs font-bold text-slate-500 uppercase flex justify-between">
                        <span>Items Adicionales (Misma Cita)</span>
                        <span className="text-blue-600">{extras.length} items</span>
                    </label>
                    
                    <div className="flex gap-2 mt-2">
                        <select 
                            className="flex-1 border p-2 rounded text-sm" 
                            value={extraSku} 
                            onChange={e => setExtraSku(e.target.value)}
                        >
                            <option value="">+ Agregar producto/estudio...</option>
                            {catalogoServicios
                                .filter(s => s.sku !== servicioSku) // No duplicar el principal
                                .map(s => (
                                <option key={s.sku} value={s.sku}>{s.nombre} - ${s.precio}</option>
                            ))}
                        </select>
                        <button 
                            type="button" 
                            onClick={handleAgregarExtra}
                            className="bg-green-100 text-green-700 px-3 rounded font-bold hover:bg-green-200"
                        >
                            +
                        </button>
                    </div>

                    {/* LISTA DE EXTRAS AGREGADOS */}
                    {extras.length > 0 && (
                        <div className="mt-2 bg-slate-50 rounded border p-2 space-y-1">
                            {extras.map((ex, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs bg-white p-1 rounded border shadow-sm">
                                    <span className="truncate flex-1">{ex.nombre}</span>
                                    <span className="font-bold text-slate-600 mx-2">${ex.precio}</span>
                                    <button 
                                        type="button" 
                                        onClick={() => handleRemoverExtra(idx)}
                                        className="text-red-500 font-bold hover:bg-red-50 px-1 rounded"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
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