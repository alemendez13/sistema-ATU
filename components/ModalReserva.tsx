"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { agendarCitaGoogle, cancelarCitaGoogle } from "../lib/actions";
import { toast } from "sonner";

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
  bloqueos: string[]; 
  citaExistente?: any;
}

const sumarMinutos = (hora: string, minutos: number) => {
  const [h, m] = hora.split(':').map(Number);
  const totalMinutos = h * 60 + m + minutos;
  const newH = Math.floor(totalMinutos / 60);
  const newM = totalMinutos % 60;
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
};

export default function ModalReserva({ isOpen, onClose, data, catalogoServicios, bloqueos, citaExistente 

  }: ModalProps) {
  // Estados Generales
  const [servicioSku, setServicioSku] = useState(""); 
  const [loading, setLoading] = useState(false);
  
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  const [horaSeleccionada, setHoraSeleccionada] = useState("");
  const [precioFinal, setPrecioFinal] = useState<number | "">(""); 
  const [notaInterna, setNotaInterna] = useState(""); 
  const [historialCitas, setHistorialCitas] = useState<number>(0); 

  // Estados Paciente
  const [modo, setModo] = useState<'nuevo' | 'buscar'>('buscar');
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<any[]>([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<any>(null);

  // Reset al abrir
  useEffect(() => {
    if (isOpen) {
        setServicioSku("");
        setPrecioFinal("");
        setNotaInterna("");
        setHistorialCitas(0);
        setFechaSeleccionada(data?.fecha || "");
        setHoraSeleccionada(data?.hora || "");
        if (data?.prefilledName) {
            setModo('nuevo'); 
            setNombreNuevo(data.prefilledName);
        }
    }
  }, [isOpen, data]);

  // Lógica de Precios e Historial
  useEffect(() => {
    const calcularDatosInteligentes = async () => {
        if (!servicioSku) return;
        const servicio = catalogoServicios.find(s => s.sku === servicioSku);
        if (servicio) setPrecioFinal(servicio.precio || 0);

        if (pacienteSeleccionado && pacienteSeleccionado.id && servicioSku) {
            try {
                const qHistorial = query(collection(db, "operaciones"), where("pacienteId", "==", pacienteSeleccionado.id), where("servicioSku", "==", servicioSku));
                const snap = await getDocs(qHistorial);
                setHistorialCitas(snap.size);
            } catch (e) { console.error("Error historial", e); }
        } else {
            setHistorialCitas(0);
        }
    };
    calcularDatosInteligentes();
  }, [servicioSku, pacienteSeleccionado, catalogoServicios]);


  // --- 🛡️ FUNCIÓN BLINDADA V2: Firebase + Google ---
  // >>> INICIO MODIFICACIÓN: Agregar parámetro googleEventIdAExcluir <<<
const verificarDisponibilidadMultiples = async (
    doctorId: string, 
    fecha: string, 
    horaInicio: string, 
    cantidadBloques30min: number,
    googleEventIdAExcluir?: string // <--- Nuevo parámetro
) => {
    let horaCheck = horaInicio;
    
    for (let i = 0; i < cantidadBloques30min; i++) {
        // 1. CHEQUEO RÁPIDO: Google Calendar
        const llaveBloqueo = `${doctorId}|${horaCheck}`;
        if (bloqueos.includes(llaveBloqueo) && !googleEventIdAExcluir) {
            return false; 
        }

        // 2. CHEQUEO BASE DE DATOS: Firebase
        const q = query(
            collection(db, "citas"),
            where("doctorId", "==", doctorId),
            where("fecha", "==", fecha),
            where("hora", "==", horaCheck)
        );
        const snapshot = await getDocs(q);
        
        // FILTRO CRÍTICO: Si hay resultados, verificamos que no sean de la cita actual
        if (!snapshot.empty) {
            const esMismaCita = snapshot.docs.every(d => d.data().googleEventId === googleEventIdAExcluir);
            if (!esMismaCita || !googleEventIdAExcluir) {
                console.warn(`⛔ Choque real detectado en ${horaCheck}`);
                return false; 
            }
        }

        horaCheck = sumarMinutos(horaCheck, 30); 
    }
    return true; 
};
// >>> FIN MODIFICACIÓN <<<

  // Buscador
  useEffect(() => {
    const buscarPacientes = async () => {
      if (busqueda.length < 3) { setResultados([]); return; }
      const q = query(collection(db, "pacientes"), where("nombreCompleto", ">=", busqueda.toUpperCase()), where("nombreCompleto", "<=", busqueda.toUpperCase() + '\uf8ff'), limit(5));
      const snap = await getDocs(q);
      setResultados(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    const timer = setTimeout(buscarPacientes, 300);
    return () => clearTimeout(timer);
  }, [busqueda]);

  if (!isOpen || !data) return null;

  const serviciosOrdenados = [...(catalogoServicios || [])].sort((a, b) => a.nombre.localeCompare(b.nombre));
  const servicioDetalle = serviciosOrdenados.find(s => s.sku === servicioSku);

  const handleGuardar = async () => {
    // 1. Validaciones de Identidad
    let nombreFinal = "";
    let idFinal = "EXTERNO"; 

    if (modo === 'nuevo') {
      if (!nombreNuevo) return alert("Escribe el nombre del paciente");
      nombreFinal = nombreNuevo.toUpperCase();
    } else {
      if (!pacienteSeleccionado) return alert("Debes seleccionar un paciente de la lista");
      nombreFinal = pacienteSeleccionado.nombreCompleto;
      idFinal = pacienteSeleccionado.id; 
    }

    if (!servicioSku) return alert("⚠️ Selecciona un servicio.");
    if (precioFinal === "" || Number(precioFinal) < 0) return alert("⚠️ Define un precio válido.");
    
    setLoading(true);

    try {
      const duracionMinutos = parseInt(servicioDetalle?.duracion || "30");
      const bloquesNecesarios = Math.ceil(duracionMinutos / 30); 

      // >>> --- INICIO CORRECCIÓN DE VARIABLES --- <<<
      // 🛡️ VERIFICACIÓN Usando los campos EDITABLES (fechaSeleccionada / horaSeleccionada)
      const hayEspacio = await verificarDisponibilidadMultiples(
        data.doctor.id, 
        fechaSeleccionada, 
        horaSeleccionada, 
        bloquesNecesarios,
        citaExistente?.googleEventId
      );
      // >>> --- FIN CORRECCIÓN --- <<<
      
      if (!hayEspacio) {
          alert(`⛔ AGENDA OCUPADA.\n\nEl horario seleccionado ya no está disponible.`);
          setLoading(false);
          return;
      }

      // >>> --- INICIO BLOQUE DE LIMPIEZA (EDICIÓN) --- <<<
      if (citaExistente) {
          // A. Borrar de Google Calendar la cita anterior
          if (citaExistente.googleEventId && data.doctor.calendarId) {
              await cancelarCitaGoogle({
                  calendarId: data.doctor.calendarId,
                  eventId: citaExistente.googleEventId
              });
          }

          // B. Borrar bloques de cita viejos en Firebase
          const qOldCitas = query(
              collection(db, "citas"), 
              where("googleEventId", "==", citaExistente.googleEventId)
          );
          const snapOldCitas = await getDocs(qOldCitas);
          for (const d of snapOldCitas.docs) {
              await deleteDoc(doc(db, "citas", d.id));
          }

          // C. Borrar cargo en caja antiguo (para generar el nuevo con el precio actualizado)
          const qOldOp = query(
              collection(db, "operaciones"),
              where("pacienteNombre", "==", citaExistente.paciente),
              where("doctorId", "==", citaExistente.doctorId),
              where("estatus", "==", "Pendiente de Pago")
          );
          const snapOldOp = await getDocs(qOldOp);
          for (const d of snapOldOp.docs) {
              await deleteDoc(doc(db, "operaciones", d.id));
          }
      }
      // >>> --- FIN BLOQUE DE LIMPIEZA --- <<<

      const tituloCita = notaInterna ? `${servicioDetalle?.nombre} (${notaInterna})` : servicioDetalle?.nombre;

      // 1. Lógica para decidir el color (Implementación)
// Asumimos que tu servicio tiene una propiedad 'categoria' o similar. 
// Si no la tiene, puedes usar: servicioDetalle?.nombre.includes("LAB")
const esLaboratorio = 
    servicioDetalle?.nombre?.toUpperCase().includes("LAB") || 
    servicioDetalle?.sku?.toUpperCase().startsWith("LAB"); 

const colorIdGoogle = esLaboratorio ? "11" : "1"; // 11 = Rojo (Lab), 1 = Azul (Servicio)

// 2. Pasamos el colorId a la función (Actualización de la llamada)

      // Agendamos la NUEVA posición en Google
      const resultadoGoogle = await agendarCitaGoogle({
          doctorId: data.doctor.id,
          doctorNombre: data.doctor.nombre,
          calendarId: data.doctor.calendarId,
          pacienteNombre: nombreFinal,
          motivo: tituloCita, 
          fecha: fechaSeleccionada,
          hora: horaSeleccionada,
          duracionMinutos: duracionMinutos,
          // >>> INICIO ADICIÓN <<<
          esTodoElDia: esLaboratorio
      });
      
      const googleId = resultadoGoogle.googleEventId || null;

      // Guardamos los nuevos bloques en Firebase
      let horaActual = horaSeleccionada;
      for (let i = 0; i < bloquesNecesarios; i++) {
          await addDoc(collection(db, "citas"), {
            doctorId: data.doctor.id,
            doctorNombre: data.doctor.nombre,
            paciente: nombreFinal,
            pacienteId: idFinal !== "EXTERNO" ? idFinal : null,
            motivo: i === 0 ? tituloCita : "(Continuación)", 
            fecha: fechaSeleccionada,
            hora: horaActual,
            creadoEn: new Date(),
            googleEventId: googleId,
            confirmada: citaExistente?.confirmada || false // Mantenemos confirmación si existía       
          });
          horaActual = sumarMinutos(horaActual, 30);
      }

      // Generamos el nuevo cargo en Caja
      await addDoc(collection(db, "operaciones"), {
        pacienteNombre: nombreFinal, 
        pacienteId: idFinal, 
        servicioSku: servicioDetalle?.sku,
        servicioNombre: tituloCita, 
        monto: Number(precioFinal), 
        estatus: "Pendiente de Pago",
        fecha: serverTimestamp(),
        origen: "Agenda (Editada)",
        doctorId: data.doctor.id,
        doctorNombre: data.doctor.nombre
      });

      if (data.waitingListId) { try { await deleteDoc(doc(db, "lista_espera", data.waitingListId)); } catch (e) {} }

      onClose(); 
      toast.success(citaExistente ? "✅ Cita re-programada con éxito." : "✅ Cita agendada correctamente."); 

    } catch (error) {
      console.error(error);
      toast.error("Error al procesar la cita.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-slate-800 mb-1">Nueva Cita</h2>
        <div className="flex gap-2 mb-4 bg-slate-50 p-2 rounded-lg border border-slate-100">
            <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Fecha</label>
                <input 
                    type="date" 
                    className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none"
                    value={fechaSeleccionada}
                    onChange={(e) => setFechaSeleccionada(e.target.value)}
                />
            </div>
            <div className="flex-1 border-l pl-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Hora</label>
                <input 
                    type="time" 
                    className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none"
                    value={horaSeleccionada}
                    onChange={(e) => setHoraSeleccionada(e.target.value)}
                />
            </div>
        </div>

        {/* SELECTOR MODO */}
        <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
          <button onClick={() => setModo('buscar')} className={`flex-1 py-1 text-sm font-bold rounded-md transition-all ${modo === 'buscar' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>🔍 Buscar</button>
          <button onClick={() => setModo('nuevo')} className={`flex-1 py-1 text-sm font-bold rounded-md transition-all ${modo === 'nuevo' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>✨ Nuevo</button>
        </div>

        <div className="space-y-4">
          {/* BUSCADOR */}
          {modo === 'buscar' && (
            <div className="relative">
              <input 
                type="text" 
                className="w-full border rounded p-2 uppercase"
                placeholder="BUSCAR PACIENTE..."
                value={busqueda}
                onChange={(e) => { setBusqueda(e.target.value); setPacienteSeleccionado(null); }}
              />
              {resultados.length > 0 && !pacienteSeleccionado && (
                <ul className="mt-1 border rounded bg-white shadow-lg max-h-40 overflow-y-auto absolute w-full max-w-xs z-10">
                  {resultados.map(p => (
                    <li key={p.id} className="p-2 hover:bg-blue-50 cursor-pointer text-sm border-b" onClick={() => { setPacienteSeleccionado(p); setBusqueda(p.nombreCompleto); setResultados([]); }}>
                      <span className="font-bold block">{p.nombreCompleto}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {modo === 'nuevo' && (
            <input type="text" className="w-full border rounded p-2 uppercase" placeholder="NOMBRE COMPLETO" value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} />
          )}
          
          {/* SELECTOR SERVICIO */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Cita / Servicio</label>
            <select 
                className="w-full border border-blue-300 bg-blue-50 rounded p-2 text-slate-700 font-medium"
                value={servicioSku}
                onChange={(e) => setServicioSku(e.target.value)}
            >
                <option value="">-- Selecciona --</option>
                {serviciosOrdenados.map(s => (
                    <option key={s.sku} value={s.sku}>
                        {s.nombre} ({s.duracion} min)
                    </option>
                ))}
            </select>
          </div>

          {/* PANEL DE CONTROL DE PAQUETES Y COBRO */}
          {servicioDetalle && (
             <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm space-y-3 animate-fade-in">
                
                {pacienteSeleccionado && (
                    <div className="flex justify-between items-center text-xs text-blue-600 bg-blue-100 p-2 rounded">
                        <span>📊 Historial de este servicio:</span>
                        <span className="font-bold">{historialCitas} veces anteriores</span>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Monto a Cobrar Hoy:</label>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400">$</span>
                        <input 
                            type="number" 
                            className="w-full border rounded p-2 font-bold text-slate-800"
                            value={precioFinal}
                            onChange={e => setPrecioFinal(e.target.value === "" ? "" : Number(e.target.value))}
                        />
                    </div>
                    <div className="flex gap-2 mt-1">
                        <button onClick={() => setPrecioFinal(0)} className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">
                            🎁 Cortesía / Paquete ($0)
                        </button>
                        <button onClick={() => setPrecioFinal(servicioDetalle.precio)} className="text-[10px] bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300">
                            🏷️ Precio Lista (${servicioDetalle.precio})
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Nota / Num. Sesión:</label>
                    <input 
                        type="text" 
                        placeholder="Ej: Sesión 2 de 4" 
                        className="w-full border rounded p-2 text-xs"
                        value={notaInterna}
                        onChange={e => setNotaInterna(e.target.value)}
                    />
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-slate-500 text-xs">
                    <span>Duración: <strong>{servicioDetalle.duracion} min</strong></span>
                    <span>Ocupa: <strong>{Math.ceil(parseInt(servicioDetalle.duracion)/30)} bloques</strong></span>
                </div>
             </div>
          )}

          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 px-4 py-2 border rounded hover:bg-slate-50">Cancelar</button>
            <button onClick={handleGuardar} disabled={loading || !servicioSku} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Agendando..." : "Confirmar Cita"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}