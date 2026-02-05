/* components/AgendaBoard.tsx */
"use client";
import { useState, useEffect, useMemo } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc } from "@/lib/firebase-guard"; 
import { db } from "../lib/firebase";
import ModalReserva from "./ModalReserva";
import CitaDetalleModal from "./CitaDetalleModal"; 
import WaitingList from "./agenda/WaitingList";
import { getBloqueosAction } from "../lib/actions"; 
import { toast } from "sonner"; 

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
  confirmada?: boolean; 
  mensajeEnviado?: boolean; 
  telefonoCelular?: string;
  elaboradoPor?: string;
}

// 👇 MODIFICACIÓN: Agregamos servicios a las props
interface AgendaBoardProps {
  medicos: Medico[];
  servicios: any[]; 
  descuentos: any[];
}

// ... (Las funciones auxiliares parsearReglas y generarBloques se quedan IGUAL) ...
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

// 👇 RECIBIMOS SERVICIOS AQUÍ
export default function AgendaBoard({ medicos, servicios, descuentos }: AgendaBoardProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [bloqueos, setBloqueos] = useState<any[]>([]); 
  const [mensajesHoy, setMensajesHoy] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [pacienteEnEspera, setPacienteEnEspera] = useState<{nombre: string, id: string} | null>(null);
  // 🔔 Estado para almacenar los pacientes en espera del día seleccionado
  const [esperaHoy, setEsperaHoy] = useState<any[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [citaDetalle, setCitaDetalle] = useState<any>(null);
  const [citaParaEditar, setCitaParaEditar] = useState<any>(null);
  // Estado para controlar qué médico tiene su "burbuja" de disponibilidad abierta
  const [medicoExpandido, setMedicoExpandido] = useState<string | null>(null);

  // Función para alternar la visualización (Cerrar si está abierto, abrir si está cerrado)
  const toggleMedico = (id: string) => {
    setMedicoExpandido(medicoExpandido === id ? null : id);
  };
  

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

    // 1. Escucha de Citas
    const qCitas = query(collection(db, "citas"), where("fecha", "==", selectedDate));
    const unsubCitas = onSnapshot(qCitas, (snapshot) => {
        setCitas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Cita[]);
    });

    // 2. Escucha de Mensajes
    const hoyLegible = new Date().toLocaleDateString('es-MX');
    const qMensajes = query(collection(db, "historial_mensajes"), where("fechaLegible", "==", hoyLegible));
    const unsubMensajes = onSnapshot(qMensajes, (snap) => {
        setMensajesHoy(snap.docs.map(d => d.data())); 
    });

    // 3. Escucha de Lista de Espera (🔔 NOTIFICACIONES)
    const qEspera = query(collection(db, "lista_espera"), where("fechaDeseada", "==", selectedDate));
    const unsubEspera = onSnapshot(qEspera, (snap) => {
        setEsperaHoy(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 4. Carga de Bloqueos de Google (Acción asíncrona única)
    const cargarBloqueos = async () => {
        try {
            if (medicos.length > 0) {
                const bloqueosGoogle = await getBloqueosAction(selectedDate, medicos);
                setBloqueos(bloqueosGoogle || []);
            }
        } catch (error) {
            console.error("Error cargando bloqueos:", error);
        } finally {
            setLoading(false);
        }
    };
    cargarBloqueos();

    // Limpieza de todos los listeners al desmontar o cambiar fecha
    return () => {
        unsubCitas();
        unsubMensajes();
        unsubEspera();
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
        // CAMBIO: Ahora leemos directamente de la cita, no del historial
        return { 
            tipo: 'local', 
            data: citaLocal, 
            mensajeEnviado: !!citaLocal.mensajeEnviado, // <--- CAMBIO AQUÍ
            confirmado: citaLocal.confirmada 
        };
    }

    const bloqueadoGoogle = bloqueos.find((b: any) => b.key === `${medicoId}|${hora}`);
    if (bloqueadoGoogle) return { tipo: 'google', data: { paciente: 'Google Calendar' } };

    return null;
};

  const handleVerDetalle = (cita: Cita) => {
      const medicoDueño = medicos.find(m => m.id === cita.doctorId);
      setCitaDetalle({
          ...cita,
          doctorCalendarId: medicoDueño?.calendarId 
      });
      setIsDetailOpen(true);
  };

  // 🆕 FUNCIÓN PARA INICIAR EDICIÓN
  const handleEditarCita = (cita: any) => {
      setIsDetailOpen(false); // Cerramos el detalle
      
      const medico = medicos.find(m => m.id === cita.doctorId);
      
      // Configuramos el slot con los datos actuales
      setSelectedSlot({
          doctor: medico,
          hora: cita.hora,
          fecha: cita.fecha,
          prefilledName: cita.paciente, 
      });
      
      setCitaParaEditar(cita); // Guardamos la referencia
      setIsModalOpen(true);    // Abrimos el formulario
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
            {medicos.map((medico) => {
                // 🔍 Filtramos localmente quiénes esperan a ESTE médico hoy
                const enEsperaParaEsteMedico = esperaHoy.filter(p => p.medicoId === medico.id);
                const tieneEspera = enEsperaParaEsteMedico.length > 0;

                return (
                <div key={medico.id} className={`relative transition-all duration-300 flex flex-col items-center ${medicoExpandido === medico.id ? 'z-50' : 'z-10'}`}>
                    
                    {/* 🔔 NOTIFICACIÓN FLOTANTE (Solo si hay gente esperando) */}
                    {tieneEspera && (
                        <div className="absolute -top-2 -right-2 z-[60] animate-bounce">
                            <span className="relative flex h-6 w-6">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-6 w-6 bg-orange-600 border-2 border-white text-[10px] font-black text-white items-center justify-center shadow-lg">
                                    {enEsperaParaEsteMedico.length}
                                </span>
                            </span>
                        </div>
                    )}

                    {/* 🟢 BLOQUE CERRADO (ESTILO BURBUJA) */}
                    <div 
                        onClick={() => toggleMedico(medico.id)}
                        className={`cursor-pointer p-4 rounded-3xl border-2 transition-all flex flex-col items-center text-center w-full max-w-[200px] shadow-sm hover:shadow-md ${
                            medicoExpandido === medico.id 
                            ? 'border-blue-500 bg-blue-50 scale-105' 
                            : 'border-slate-100 bg-white hover:border-blue-200'
                        }`}
                        style={{ borderTopColor: medico.color, borderTopWidth: '6px' }}
                    >
                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-2xl mb-2 border border-slate-100">
                            {medico.especialidad.toLowerCase().includes('psico') ? '🧠' : '🩺'}
                        </div>
                        <h3 className="font-bold text-slate-800 text-xs leading-tight h-8 flex items-center px-1">{medico.nombre}</h3>
                        <span className={`text-[9px] font-bold px-3 py-1 rounded-full mt-2 uppercase tracking-tighter ${
                            medicoExpandido === medico.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                            {medicoExpandido === medico.id ? 'Cerrar' : 'Disponibilidad'}
                        </span>
                    </div>

                    {/* 🔵 BURBUJA DESPLEGABLE DE HORARIOS */}
                    {medicoExpandido === medico.id && (
                        <div className="absolute top-[105%] left-1/2 -translate-x-1/2 w-[280px] bg-white rounded-2xl shadow-2xl border border-blue-100 p-4 z-[60] animate-in fade-in zoom-in duration-200 origin-top">
                            <div className="flex justify-between items-center mb-3 border-b border-slate-50 pb-2">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Disponibilidad</span>
                                    {enEsperaParaEsteMedico.length > 0 && (
                                        <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full mt-1 border border-orange-100">
                                            ⚠️ {enEsperaParaEsteMedico.length} PACIENTE(S) EN ESPERA
                                        </span>
                                    )}
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); setMedicoExpandido(null); }} className="text-slate-300 hover:text-slate-600 text-xl">&times;</button>
                            </div>
                            
                            <div className="space-y-1 overflow-y-auto max-h-[400px] pr-1 custom-scrollbar">
                                {timeSlots.map(hora => {
                                    const trabaja = verificarHorarioMedico(medico, selectedDate, hora);
                                    if (!trabaja) return null; // Limpieza visual: no mostrar lo que no trabaja

                                    const ocupacion = getCitaOcupada(medico.id, hora);
                                    
                                    return (
                                        <div key={hora} className="flex justify-between items-center text-xs p-1 hover:bg-slate-50 rounded-lg transition-colors">
                                            <span className="text-slate-500 font-mono w-10 font-medium">{hora}</span>
                                            {ocupacion ? (
                                                <button 
                                                    onClick={() => ocupacion.tipo === 'local' && handleVerDetalle(ocupacion.data as Cita)}
                                                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs border truncate ml-2 flex items-center justify-between text-left ${
                                                        ocupacion.tipo === 'local' 
                                                        ? "bg-blue-50 text-blue-800 border-blue-100 shadow-sm" 
                                                        : "bg-slate-100 text-slate-400 border-slate-200 italic cursor-not-allowed"
                                                    }`}
                                                >
                                                    <span className="truncate flex-1 font-semibold text-[11px]">
                                                        {ocupacion.tipo === 'local' ? ocupacion.data.paciente : `📅 Google`}
                                                    </span>
                                                    <div className="flex gap-1 ml-1">
                                                        {ocupacion.mensajeEnviado && <span>📩</span>}
                                                        {ocupacion.confirmado && <span>✅</span>}
                                                    </div>
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => handleSlotClick(medico, hora)}
                                                    className="flex-1 px-3 py-1.5 rounded-lg text-center ml-2 border border-green-200 bg-white text-green-700 font-bold hover:bg-green-600 hover:text-white transition-all shadow-sm"
                                                >
                                                    Agendar
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            );
            })}
        </div>

        {/* 👇 MODIFICACIÓN CRÍTICA: Pasamos 'bloqueos' al modal para que sepa qué está ocupado en Google */}
        <ModalReserva 
            isOpen={isModalOpen} 
            onClose={() => { 
                setIsModalOpen(false); 
                setCitaParaEditar(null); // 🆕 Limpiamos al cerrar
            }} 
            data={selectedSlot}
            catalogoServicios={servicios} 
            bloqueos={bloqueos}
            descuentos={descuentos}
            citaExistente={citaParaEditar} // 🆕 Pasamos la cita a editar
        />
        
    <CitaDetalleModal 
            isOpen={isDetailOpen}
            onClose={() => setIsDetailOpen(false)}
            cita={citaDetalle}
            onEditar={handleEditarCita} // 🆕 Conectamos el botón
        />
        {/* ✅ Corrección VSC: Pasamos la prop 'medicos' y el estado de carga */}
<WaitingList 
    medicos={medicos}
    onAsignar={(p: any) => { 
        setPacienteEnEspera({ nombre: p.paciente, id: p.id }); 
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    }}
/>
      </div>
    </div>
  );
}