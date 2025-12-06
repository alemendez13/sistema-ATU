/* components/AgendaBoard.tsx */
"use client";
import { useState, useEffect, useMemo } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore"; // updateDoc agregado
import { db } from "../lib/firebase";
import ModalReserva from "./ModalReserva";
import CitaDetalleModal from "./CitaDetalleModal"; // 👈 IMPORTAMOS EL NUEVO MODAL
import WaitingList from "./agenda/WaitingList";
import { getBloqueosAction } from "../lib/actions"; 
import { toast } from "sonner"; // Para avisar cambios

interface Medico {
  id: string;
  nombre: string;
  especialidad: string;
  color: string;
  reglasHorario: string; 
  calendarId: string;
}

interface Cita {
  id: string;
  doctorId: string;
  fecha: string;
  hora: string;
  paciente: string;
  pacienteId?: string;
  confirmada?: boolean; // 👈 NUEVO CAMPO
}

interface AgendaBoardProps {
  medicos: Medico[];
}

// --- PARSER DE HORARIOS (Sin cambios) ---
const parsearReglas = (reglaStr: string) => {
    const mapa: Record<number, string> = {};
    if (!reglaStr) return mapa;
    const reglas = reglaStr.split(';');
    reglas.forEach(regla => {
        const [diasStr, horario] = regla.split('|');
        if (diasStr && horario) {
            const dias = diasStr.split(',').map(d => parseInt(d.trim()));
            dias.forEach(dia => { if (!isNaN(dia)) mapa[dia] = horario.trim(); });
        }
    });
    return mapa;
};

const generarBloques = (inicio: string, fin: string) => {
    const bloques = [];
    if (!inicio || !fin) return [];
    const [hIni, mIni] = inicio.split(':').map(Number);
    const [hFin, mFin] = fin.split(':').map(Number);
    let actual = new Date();
    actual.setHours(hIni, mIni, 0, 0);
    const limite = new Date();
    limite.setHours(hFin, mFin, 0, 0);
    let count = 0;
    while (actual < limite && count < 48) {
        bloques.push(actual.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
        actual.setMinutes(actual.getMinutes() + 30);
        count++;
    }
    return bloques;
};

export default function AgendaBoard({ medicos }: AgendaBoardProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [bloqueos, setBloqueos] = useState<string[]>([]); 
  const [mensajesHoy, setMensajesHoy] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [pacienteEnEspera, setPacienteEnEspera] = useState<{nombre: string, id: string} | null>(null);
  // 👇 INICIO MODIFICACIÓN
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [citaDetalle, setCitaDetalle] = useState<any>(null);
  // 👆 FIN MODIFICACIÓN

  const medicosHash = medicos.map(m => m.id).join(",");

  const timeSlots = useMemo(() => {
    let minHora = "09:00"; let maxHora = "18:00";
    medicos.forEach(m => {
        const mapa = parsearReglas(m.reglasHorario);
        Object.values(mapa).forEach(rangoDia => {
            const subRangos = rangoDia.split(',');
            subRangos.forEach(rango => {
                const partes = rango.trim().split('-');
                if (partes.length === 2) {
                    if (partes[0] < minHora) minHora = partes[0];
                    if (partes[1] > maxHora) maxHora = partes[1];
                }
            });
        });
    });
    return generarBloques(minHora, maxHora);
  }, [medicosHash]);

  const verificarHorarioMedico = (medico: Medico, fechaStr: string, horaStr: string) => {
    const fecha = new Date(fechaStr + "T12:00:00"); 
    const diaSemana = fecha.getDay(); 
    const mapaHorarios = parsearReglas(medico.reglasHorario);
    const rangosHoy = mapaHorarios[diaSemana]; 
    if (!rangosHoy) return false; 
    return rangosHoy.split(',').some(intervalo => {
        const [inicio, fin] = intervalo.trim().split('-');
        return inicio && fin && horaStr >= inicio && horaStr < fin;
    });
  };

  useEffect(() => {
    setLoading(true);
    
    console.log("🔥 LECTURA EJECUTADA EN: [NOMBRE_DEL_ARCHIVO] - " + new Date().toLocaleTimeString());

    const qCitas = query(collection(db, "citas"), where("fecha", "==", selectedDate));
    const unsubCitas = onSnapshot(qCitas, (snapshot) => {
        setCitas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Cita[]);
    });

    const hoyLegible = new Date().toLocaleDateString('es-MX');
    const qMensajes = query(collection(db, "historial_mensajes"), where("fechaLegible", "==", hoyLegible));
    const unsubMensajes = onSnapshot(qMensajes, (snap) => {
        setMensajesHoy(snap.docs.map(d => d.data())); 
    });

    const cargarBloqueos = async () => {
        try {
            if (medicos.length > 0) {
                const bloqueosGoogle = await getBloqueosAction(selectedDate, medicos);
                setBloqueos(bloqueosGoogle || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    cargarBloqueos();

    return () => {
        unsubCitas();
        unsubMensajes();
    };
  }, [selectedDate, medicosHash]);

  const handleSlotClick = (medico: Medico, hora: string) => {
    setSelectedSlot({
        doctor: medico,
        hora: hora,
        fecha: selectedDate,
        prefilledName: pacienteEnEspera ? pacienteEnEspera.nombre : "",
        waitingListId: pacienteEnEspera ? pacienteEnEspera.id : undefined 
    });
    setIsModalOpen(true);
    setPacienteEnEspera(null);
  };

  // 👇 NUEVA FUNCIÓN: Alternar confirmación
  const toggleConfirmacion = async (cita: Cita) => {
      try {
          const nuevoEstado = !cita.confirmada;
          await updateDoc(doc(db, "citas", cita.id), {
              confirmada: nuevoEstado
          });
          toast.success(nuevoEstado ? "Paciente confirmado 👍" : "Confirmación retirada");
      } catch (e) {
          console.error(e);
          toast.error("Error al actualizar");
      }
  };

  const getCitaOcupada = (medicoId: string, hora: string) => {
    const citaLocal = citas.find(c => c.doctorId === medicoId && c.hora === hora);
    
    if (citaLocal) {
        // Lógica de checks:
        // 1. ¿Ya se le envió mensaje hoy?
        const mensajeEnviado = mensajesHoy.find(m => m.pacienteNombre === citaLocal.paciente);
        
        return { 
            tipo: 'local', 
            data: citaLocal, 
            mensajeEnviado: !!mensajeEnviado,
            confirmado: citaLocal.confirmada // Leemos de la BD
        };
    }

    const bloqueadoGoogle = bloqueos.includes(`${medicoId}|${hora}`);
    if (bloqueadoGoogle) return { tipo: 'google', data: { paciente: 'Google Calendar' } };

    return null;
  };

  const handleVerDetalle = (cita: Cita) => {
      // Buscamos al médico dueño de la cita
      const medicoDueño = medicos.find(m => m.id === cita.doctorId);
      
      setCitaDetalle({
          ...cita,
          doctorCalendarId: medicoDueño?.calendarId // Inyectamos el ID necesario
      });
      setIsDetailOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-full mx-auto">
        <header className="flex flex-col items-start gap-2 mb-6">
            <a href="/" className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors">
              <span>←</span> Volver al Menú
            </a>
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Agenda Médica</h1>
                <div className="flex gap-4 mt-1 text-xs">
                    <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">
                        📩 = Mensaje Enviado
                    </span>
                    <span className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100">
                        👍 = Confirmado (Clic para activar)
                    </span>
                </div>
            </div>
        </header>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex gap-4 items-center">
            <label className="font-bold text-slate-700">Fecha:</label>
            <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)} 
                className="border border-slate-300 rounded-md p-2 text-slate-700"
            />
            <span className="text-sm text-slate-400 italic ml-2">
                 {new Date(selectedDate + "T12:00:00").toLocaleDateString('es-MX', { weekday: 'long' })}
            </span>
        </div>

        {pacienteEnEspera && (
            <div className="mb-4 bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded shadow-sm animate-pulse sticky top-0 z-10">
                <p className="font-bold">Modo Asignación: {pacienteEnEspera.nombre}</p>
                <button onClick={() => setPacienteEnEspera(null)} className="text-xs underline">Cancelar</button>
            </div>
        )}

        {loading && <p className="text-center text-slate-400 py-4">Sincronizando calendarios...</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {medicos.map((medico) => (
                <div key={medico.id} className="bg-white rounded-xl shadow-md overflow-hidden border-t-4 flex flex-col h-full" style={{ borderColor: medico.color || 'blue' }}>
                    <div className="p-3 bg-slate-50 border-b border-slate-100 text-center">
                        <h3 className="font-bold text-md text-slate-800 truncate">{medico.nombre}</h3>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-500 block w-fit mx-auto mt-1">
                            {medico.especialidad}
                        </span>
                    </div>
                    
                    <div className="p-2 space-y-1 flex-1 overflow-y-auto max-h-[600px]">
                        {timeSlots.map(hora => {
                            const trabaja = verificarHorarioMedico(medico, selectedDate, hora);
                            if (!trabaja) {
                                return (
                                    <div key={hora} className="flex justify-between items-center text-xs p-1 opacity-40">
                                        <span className="text-slate-400 font-mono w-10">{hora}</span>
                                        <div className="flex-1 bg-slate-100 text-slate-400 px-2 py-1 rounded text-center text-[10px]">-</div>
                                    </div>
                                );
                            }

                            const ocupacion = getCitaOcupada(medico.id, hora);
                            
                            return (
                                <div key={hora} className="flex justify-between items-center text-xs p-1">
                                    <span className="text-slate-600 font-mono w-10 font-bold">{hora}</span>
                                    
                                    {ocupacion ? (
                                                <button 
                                                        onClick={() => ocupacion.tipo === 'local' && handleVerDetalle(ocupacion.data as Cita)}
                                                        className={`flex-1 px-2 py-1 rounded text-xs border truncate ml-1 flex items-center justify-between text-left transition-all hover:opacity-80 ${
                                                            ocupacion.tipo === 'local' 
                                                            ? "bg-blue-50 text-blue-800 border-blue-200 cursor-pointer shadow-sm" 
                                                            : "bg-gray-200 text-gray-600 border-gray-300 italic cursor-not-allowed"
                                                        }`} 
                                                        title={ocupacion.tipo === 'local' ? "Ver detalles / Gestionar" : "Evento de Google Calendar"}
                                                    >
                                                        <span className="truncate flex-1 font-bold text-[11px]">
                                                            {ocupacion.tipo === 'local' ? ocupacion.data.paciente : `📅 Google`}
                                                        </span>
                                                        
                                                        <div className="flex gap-1">
                                                            {/* Iconos de estado (Solo visuales, la acción está en el modal) */}
                                                            {ocupacion.mensajeEnviado && <span>📩</span>}
                                                            {ocupacion.confirmado && <span>✅</span>}
                                                        </div>
                                                    </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleSlotClick(medico, hora)}
                                            className={`flex-1 px-2 py-1 rounded text-center ml-1 border transition-all ${
                                                pacienteEnEspera 
                                                ? "bg-blue-600 text-white border-blue-700 hover:bg-blue-700 font-bold"
                                                : "bg-white text-green-700 border-green-200 hover:bg-green-50 hover:border-green-400"
                                            }`}
                                        >
                                            Libre
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>

        <ModalReserva isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={selectedSlot} />
        {/* 👇 INICIO MODIFICACIÓN: El nuevo modal */}
        <CitaDetalleModal 
            isOpen={isDetailOpen}
            onClose={() => setIsDetailOpen(false)}
            cita={citaDetalle}
        />
        {/* 👆 FIN MODIFICACIÓN */}
        <WaitingList onAsignar={(p: any) => { setPacienteEnEspera({ nombre: p.paciente, id: p.id }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}/>
      </div>
    </div>
  );
}