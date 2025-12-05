"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { agendarCitaGoogle } from "../lib/actions";
import { toast } from "sonner";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    doctor: any;
    hora: string;
    fecha: string;
    prefilledName?: string; // <--- AGREGAR ESTO
    waitingListId?: string; // <--- AGREGAR ESTO
  } | null;
}

const sumar30Minutos = (hora: string) => {
  const [h, m] = hora.split(':').map(Number);
  let newM = m + 30;
  let newH = h;
  if (newM >= 60) {
    newM -= 60;
    newH += 1;
  }
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
}

export default function ModalReserva({ isOpen, onClose, data }: ModalProps) {
  // Estados Generales
  const [motivo, setMotivo] = useState("");
  const [esDoble, setEsDoble] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- NUEVO: Cargar nombre si viene de Lista de Espera ---
  useEffect(() => {
    if (isOpen && data?.prefilledName) {        // Opcional: Si quieres forzar modo "Nuevo" o "Buscar" según tu lógica
        setModo('nuevo'); 
        setNombreNuevo(data.prefilledName);
    }
  }, [isOpen, data]);

  // Estados para Selección de Paciente
  const [modo, setModo] = useState<'nuevo' | 'buscar'>('buscar'); // Por defecto buscar
  const [nombreNuevo, setNombreNuevo] = useState("");
  
  // Estados de Búsqueda
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<any[]>([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<any>(null);



  // --- NUEVO: Función para verificar si el siguiente bloque está libre ---
  const verificarDisponibilidadSiguiente = async (doctorId: string, fecha: string, horaSiguiente: string) => {
    // Consultamos si YA existe una cita para ese doctor, en esa fecha y a la hora siguiente
    const q = query(
        collection(db, "citas"),
        where("doctorId", "==", doctorId),
        where("fecha", "==", fecha),
        where("hora", "==", horaSiguiente)
    );
    const snapshot = await getDocs(q);
    return snapshot.empty; // Retorna TRUE si está vacío (libre), FALSE si ya hay algo
  };


  // Efecto para buscar mientras escribes (tipo Google)
  useEffect(() => {
    const buscarPacientes = async () => {
      if (busqueda.length < 3) {
        setResultados([]);
        return;
      }

      // Buscamos pacientes que empiecen con el texto (convertido a mayúsculas)
      const q = query(
        collection(db, "pacientes"),
        where("nombreCompleto", ">=", busqueda.toUpperCase()),
        where("nombreCompleto", "<=", busqueda.toUpperCase() + '\uf8ff'),
        limit(5)
      );

      const snap = await getDocs(q);
      setResultados(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    const timer = setTimeout(buscarPacientes, 300); // Pequeña pausa para no saturar
    return () => clearTimeout(timer);
  }, [busqueda]);

  if (!isOpen || !data) return null;

  const handleGuardar = async () => {
    // 1. Validaciones iniciales
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
    
    setLoading(true);
    try {

      // 2. Validación de Bloqueo (Cita Doble)
      if (esDoble) {
          const siguienteBloque = sumar30Minutos(data.hora);
          const estaLibre = await verificarDisponibilidadSiguiente(data.doctor.id, data.fecha, siguienteBloque);
          
          if (!estaLibre) {
              alert(`⛔ NO SE PUEDE AGENDAR.\n\nEl bloque de las ${siguienteBloque} ya está ocupado.`);
              setLoading(false);
              return; 
          }
      }

      // 3. ⚡️ PRIMERO: Sincronizar Google Calendar (Para obtener el ID) ⚡️
      const duracion = esDoble ? 60 : 30;
      const resultadoGoogle = await agendarCitaGoogle({
          doctorId: data.doctor.id,
          doctorNombre: data.doctor.nombre,
          calendarId: data.doctor.calendarId,
          pacienteNombre: nombreFinal,
          motivo: motivo,
          fecha: data.fecha,
          hora: data.hora,
          duracionMinutos: duracion
      });

      // Capturamos el ID (Si Google falla, será null pero la app no truena)
      const googleId = resultadoGoogle.googleEventId || null;

      // 4. Preparar Objeto Base
      const citaBase = {
        doctorId: data.doctor.id,
        doctorNombre: data.doctor.nombre,
        paciente: nombreFinal,
        // Si tenemos ID real del paciente, lo guardamos para el "Check Verde" de la agenda
        pacienteId: idFinal !== "EXTERNO" ? idFinal : null, 
        motivo: motivo,
        fecha: data.fecha,
        creadoEn: new Date()
      };

      // 5. Guardar CITA 1 en Firebase
      await addDoc(collection(db, "citas"), {
        ...citaBase,
        hora: data.hora,
        googleEventId: googleId, // ✅ Coma agregada
        confirmada: false        
      });

      // 6. Guardar CITA 2 (Si es doble)
      if (esDoble) {
        const siguienteBloque = sumar30Minutos(data.hora);
        await addDoc(collection(db, "citas"), {
          ...citaBase,
          hora: siguienteBloque,
          motivo: `${motivo} (Continuación)`,
          googleEventId: googleId, // ✅ Coma agregada
          confirmada: false
        });
      }

      // 7. Crear OPERACIÓN Financiera
      await addDoc(collection(db, "operaciones"), {
        pacienteNombre: nombreFinal, 
        pacienteId: idFinal, 
        servicioSku: "CONSULTA",
        servicioNombre: `Consulta con ${data.doctor.nombre}`,
        monto: 0, 
        estatus: "Pendiente de Pago",
        fecha: serverTimestamp(),
        origen: "Agenda"
      });

      // 8. Eliminar de Lista de Espera (Si aplica)
      if (data.waitingListId) {
        try {
          await deleteDoc(doc(db, "lista_espera", data.waitingListId));
        } catch (e) { console.error("Error borrando espera", e); }
      }

      // Limpieza y Cierre (Esto estaba perfecto)
      setNombreNuevo("");
      setBusqueda("");
      setResultados([]);
      setPacienteSeleccionado(null);
      setMotivo("");
      setEsDoble(false);
      onClose(); 
      
      // ✅ AQUÍ ESTÁ EL CAMBIO SOLICITADO
      toast.success("✅ Cita agendada correctamente."); 

    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al guardar la cita.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-slate-800 mb-1">Confirmar Cita</h2>
        <p className="text-sm text-slate-500 mb-4">
          {data.doctor.nombre} - {data.fecha} a las {data.hora} hrs.
        </p>

        {/* --- SELECTOR DE MODO --- */}
        <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
          <button 
            onClick={() => setModo('buscar')}
            className={`flex-1 py-1 text-sm font-bold rounded-md transition-all ${modo === 'buscar' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
          >
            🔍 Buscar Paciente
          </button>
          <button 
            onClick={() => setModo('nuevo')}
            className={`flex-1 py-1 text-sm font-bold rounded-md transition-all ${modo === 'nuevo' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
          >
            ✨ Nuevo
          </button>
        </div>

        <div className="space-y-4">
          
          {/* MODO BUSCAR */}
          {modo === 'buscar' && (
            <div>
              <label className="block text-sm font-medium text-slate-700">Buscar en Directorio</label>
              <input 
                type="text" 
                className="w-full border rounded p-2 mt-1 uppercase"
                placeholder="Escribe nombre..."
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPacienteSeleccionado(null); // Reset al escribir
                }}
              />
              
              {/* Resultados de Búsqueda */}
              {resultados.length > 0 && !pacienteSeleccionado && (
                <ul className="mt-1 border rounded bg-white shadow-lg max-h-40 overflow-y-auto absolute w-full max-w-xs z-10">
                  {resultados.map(p => (
                    <li 
                      key={p.id}
                      className="p-2 hover:bg-blue-50 cursor-pointer text-sm border-b"
                      onClick={() => {
                        setPacienteSeleccionado(p);
                        setBusqueda(p.nombreCompleto);
                        setResultados([]);
                      }}
                    >
                      <span className="font-bold block">{p.nombreCompleto}</span>
                      <span className="text-xs text-gray-500">Cel: {p.telefonoCelular}</span>
                    </li>
                  ))}
                </ul>
              )}

              {pacienteSeleccionado && (
                <div className="mt-2 bg-green-50 text-green-800 p-2 rounded text-xs border border-green-200 flex justify-between items-center">
                  <span>✅ Seleccionado: <strong>{pacienteSeleccionado.nombreCompleto}</strong></span>
                  <button onClick={() => {setPacienteSeleccionado(null); setBusqueda("");}} className="text-red-500 font-bold">X</button>
                </div>
              )}
            </div>
          )}

          {/* MODO NUEVO */}
          {modo === 'nuevo' && (
            <div>
              <label className="block text-sm font-medium text-slate-700">Nombre del Nuevo Paciente</label>
              <input 
                type="text" 
                className="w-full border rounded p-2 mt-1 uppercase"
                placeholder="Ej. JUAN PEREZ"
                value={nombreNuevo}
                onChange={(e) => setNombreNuevo(e.target.value)}
              />
              <p className="text-xs text-orange-500 mt-1">⚠️ Este paciente no tendrá historial vinculado hasta que lo registres formalmente.</p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-700">Motivo (Opcional)</label>
            <input 
              type="text" 
              className="w-full border rounded p-2 mt-1"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 bg-blue-50 p-3 rounded border border-blue-100">
            <input 
              type="checkbox" 
              id="checkDoble"
              className="w-5 h-5 text-blue-600 rounded"
              checked={esDoble}
              onChange={(e) => setEsDoble(e.target.checked)}
            />
            <label htmlFor="checkDoble" className="text-sm font-bold text-blue-800 cursor-pointer">
              Reservar 1 Hora
            </label>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 px-4 py-2 border rounded hover:bg-slate-50">Cancelar</button>
            <button onClick={handleGuardar} disabled={loading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              {loading ? "..." : "Confirmar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}