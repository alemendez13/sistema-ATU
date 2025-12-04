"use client";
import { useState, useEffect, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import ModalReserva from "./ModalReserva";
import WaitingList from "./agenda/WaitingList";
import { getBloqueosAction } from "../lib/actions"; 

// Definición de tipos
interface Medico {
  id: string;
  nombre: string;
  especialidad: string;
  color: string;
  reglasHorario: string; 
  calendarId: string; // ⬅️ CAMPO FALTANTE CRUCIAL
}

interface Cita {
  id: string;
  doctorId: string;
  fecha: string;
  hora: string;
  paciente: string;
}

interface AgendaBoardProps {
  medicos: Medico[];
}

// --- PARSER INTELIGENTE DE HORARIOS ---
const parsearReglas = (reglaStr: string) => {
    const mapa: Record<number, string> = {};
    if (!reglaStr) return mapa;
    const reglas = reglaStr.split(';');
    reglas.forEach(regla => {
        const [diasStr, horario] = regla.split('|');
        if (diasStr && horario) {
            const dias = diasStr.split(',').map(d => parseInt(d.trim()));
            dias.forEach(dia => {
                if (!isNaN(dia)) mapa[dia] = horario.trim(); 
            });
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
        const horaStr = actual.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        bloques.push(horaStr);
        actual.setMinutes(actual.getMinutes() + 30);
        count++;
    }
    return bloques;
};

export default function AgendaBoard({ medicos }: AgendaBoardProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [bloqueos, setBloqueos] = useState<string[]>([]); 
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{doctor: Medico, hora: string, fecha: string, prefilledName?: string, waitingListId?: string} | null>(null);
  const [pacienteEnEspera, setPacienteEnEspera] = useState<{nombre: string, id: string} | null>(null);

  // Truco de Estabilidad: Creamos un string único que representa a los médicos.
  // Si este string no cambia, React sabe que no debe recargar la BD.
  const medicosHash = medicos.map(m => m.id).join(",");

  // --- 1. CÁLCULO DE RANGO GLOBAL ---
  const timeSlots = useMemo(() => {
    let minHora = "09:00"; 
    let maxHora = "18:00";

    medicos.forEach(m => {
        const mapa = parsearReglas(m.reglasHorario);
        Object.values(mapa).forEach(rangoDia => {
            const subRangos = rangoDia.split(',');
            subRangos.forEach(rango => {
                const partes = rango.trim().split('-');
                if (partes.length === 2) {
                    const [ini, fin] = partes;
                    if (ini < minHora) minHora = ini;
                    if (fin > maxHora) maxHora = fin;
                }
            });
        });
    });
    return generarBloques(minHora, maxHora);
  }, [medicosHash]); // Usamos el Hash en lugar del objeto completo

  // --- 2. VERIFICACIÓN EXACTA POR DÍA ---
  const verificarHorarioMedico = (medico: Medico, fechaStr: string, horaStr: string) => {
    const fecha = new Date(fechaStr + "T12:00:00"); 
    const diaSemana = fecha.getDay(); 
    const mapaHorarios = parsearReglas(medico.reglasHorario);
    const rangosHoy = mapaHorarios[diaSemana]; 

    if (!rangosHoy) return false; 
    const intervalos = rangosHoy.split(',');
    return intervalos.some(intervalo => {
        const [inicio, fin] = intervalo.trim().split('-');
        if (!inicio || !fin) return false;
        return horaStr >= inicio && horaStr < fin;
    });
  };

  // --- 3. EFECTO DE CARGA (Aquí estaba el error del bucle) ---
  useEffect(() => {
    setLoading(true);
    
    // A. Suscripción a Firebase (Citas Locales)
    const q = query(collection(db, "citas"), where("fecha", "==", selectedDate));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const citasCargadas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Cita[];
        setCitas(citasCargadas);
        // Quitamos setLoading(false) de aquí para evitar parpadeos si Google tarda más
    });

    // B. Carga de Google Calendar (Externo)
    const cargarBloqueos = async () => {
        try {
            // Solo llamamos a Google si hay médicos
            if (medicos.length > 0) {
                const bloqueosGoogle = await getBloqueosAction(selectedDate, medicos);
                setBloqueos(bloqueosGoogle || []);
            }
        } catch (error) {
            console.error("Error cargando bloqueos Google:", error);
        } finally {
            setLoading(false);
        }
    };
    
    cargarBloqueos();

    // Limpieza al desmontar
    return () => unsubscribe();
    
    // 🛑 IMPORTANTE: Dependemos de 'medicosHash', no de 'medicos'.
    // Esto evita que el useEffect se dispare infinitamente.
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

  const getCitaOcupada = (medicoId: string, hora: string) => {
    const citaLocal = citas.find(c => c.doctorId === medicoId && c.hora === hora);
    if (citaLocal) return { tipo: 'local', data: citaLocal };

    const bloqueadoGoogle = bloqueos.includes(`${medicoId}|${hora}`);
    if (bloqueadoGoogle) return { tipo: 'google', data: { paciente: 'Google Calendar' } };

    return null;
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
                <p className="text-slate-500 text-sm">Mostrando disponibilidad para {medicos.length} especialistas.</p>
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
                                        <div className={`flex-1 px-2 py-1 rounded text-xs border truncate ml-1 cursor-not-allowed ${
                                            ocupacion.tipo === 'local' 
                                            ? "bg-red-100 text-red-800 border-red-200" 
                                            : "bg-gray-200 text-gray-600 border-gray-300 italic"
                                        }`} title={ocupacion.data.paciente}>
                                            {ocupacion.tipo === 'local' ? `⛔ ${ocupacion.data.paciente}` : `📅 Google`}
                                        </div>
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

        <ModalReserva 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            data={selectedSlot} 
        />
        
        <WaitingList onAsignar={(p: any) => {
            setPacienteEnEspera({ nombre: p.paciente, id: p.id });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }}/>
      </div>
    </div>
  );
}