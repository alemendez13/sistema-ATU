/* components/pacientes/DirectoryClient.tsx */

"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, getDocs, startAfter, where } from "@/lib/firebase-guard";
import { db } from "../../lib/firebase";
import Link from "next/link";
import WhatsAppButton from "../ui/WhatsAppButton";
import { MENSAJES } from "../../lib/whatsappTemplates";
import { toast } from "sonner";

interface Paciente {
  id: string;
  nombreCompleto: string;
  folioExpediente?: string;
  telefonoCelular: string;
  celular?: string; // Soporte legacy
  email: string;
  edad: number;
  curp?: string;
  genero?: string;
  fechaRegistro?: any; // ✅ CONSERVADO: Importante para referencia interna
}

interface MensajeConfig {
  id: string;
  etiqueta: string;
  texto: string;
}

export default function DirectoryClient({ mensajesPredefinidos }: { mensajesPredefinidos: MensajeConfig[] }) {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [ultimoDoc, setUltimoDoc] = useState<any>(null);
  const [hayMas, setHayMas] = useState(true);
  const [buscando, setBuscando] = useState(false);
  const [ultimoDocBusqueda, setUltimoDocBusqueda] = useState<any>(null);

  // 1. CARGA INICIAL (Solo 20 pacientes)
  const cargarPacientesIniciales = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "pacientes"), 
        orderBy("fechaRegistro", "desc"), 
        limit(20) // Protección de lectura
      );
      
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Paciente[];
      
      setPacientes(docs);
      setUltimoDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHayMas(snapshot.docs.length === 20); 
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error cargando directorio");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPacientesIniciales();
  }, []);

  // 2. PAGINACIÓN
  const cargarMas = async () => {
    // 1. Determinamos qué cursor usar según el modo actual
    const cursorActual = buscando ? ultimoDocBusqueda : ultimoDoc;
    
    // GUARDIA: Si no hay cursor o estamos cargando, abortamos
    if (!cursorActual || loading) return;
    
    try {
      let q;
      
      if (buscando) {
          // LÓGICA DE BÚSQUEDA: Seguimos la secuencia de la búsqueda inteligente
          const palabrasBusqueda = busqueda.trim().toUpperCase().split(/\s+/);
          q = query(
            collection(db, "pacientes"),
            where("searchKeywords", "array-contains", palabrasBusqueda[0]),
            orderBy("nombreCompleto", "asc"), // Requerido para consistencia en búsqueda
            startAfter(cursorActual),
            limit(20)
          );
      } else {
          // LÓGICA GENERAL: La que ya tenías en VSC
          q = query(
            collection(db, "pacientes"), 
            orderBy("fechaRegistro", "desc"), // Orden por lo más reciente
            startAfter(cursorActual),
            limit(20)
          );
      }

      const snapshot = await getDocs(q);
      
      // Mapeamos los nuevos registros manteniendo la estructura fundamental
      let nuevos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Paciente[];

      // 2. REFINADO LOCAL: Si hay búsqueda de múltiples palabras, aplicamos el filtro
      if (buscando && busqueda.trim().split(/\s+/).length > 1) {
          const palabras = busqueda.trim().toUpperCase().split(/\s+/);
          nuevos = nuevos.filter(p => 
              palabras.every(pal => p.nombreCompleto.toUpperCase().includes(pal))
          );
      }

      // 3. ACTUALIZACIÓN DE ESTADOS (Sin eliminar historial previo)
      setPacientes(prev => [...prev, ...nuevos]);
      
      // Actualizamos el cursor correspondiente según el modo para la siguiente carga
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      if (buscando) {
          setUltimoDocBusqueda(lastVisible);
      } else {
          setUltimoDoc(lastVisible);
      }
      
      // Si trajo menos de 20, ya no hay más datos en el servidor
      if (snapshot.docs.length < 20) setHayMas(false);

    } catch (error) {
      console.error("Error en paginación:", error);
      toast.error("Error al cargar más resultados");
    }
};

  // 3. BUSCADOR EN SERVIDOR
const realizarBusqueda = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!busqueda.trim()) {
      cargarPacientesIniciales();
      setBuscando(false);
      return;
  }

  setLoading(true);
  setBuscando(true);
  setUltimoDocBusqueda(null); // Limpiamos rastro de búsquedas anteriores

  try {
      const palabrasBusqueda = busqueda.trim().toUpperCase().split(/\s+/);
      const primerTermino = palabrasBusqueda[0];
      
      const q = query(
          collection(db, "pacientes"),
          where("searchKeywords", "array-contains", primerTermino),
          orderBy("nombreCompleto", "asc"), // Requerido para paginación estable
          limit(20) // Cambiamos 30 por 20 para ser consistentes con el diseño [cite: 347]
      );

      const snapshot = await getDocs(q);
      
      // ✅ MANTENEMOS ESTAS LÍNEAS (Mapeo de datos)
      let resultados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Paciente[];

      // ✅ MANTENEMOS ESTA LÓGICA (Refinado multi-palabra)
      if (palabrasBusqueda.length > 1) {
          resultados = resultados.filter(p => 
              palabrasBusqueda.every(palabra => 
                  p.nombreCompleto.toUpperCase().includes(palabra)
              )
          );
      }

      setPacientes(resultados);
      
      // 📑 NUEVA LÓGICA: Guardar cursor para "Cargar siguientes 20" [cite: 345, 346]
      if (snapshot.docs.length > 0) {
          setUltimoDocBusqueda(snapshot.docs[snapshot.docs.length - 1]);
          setHayMas(snapshot.docs.length === 20);
      } else {
          setHayMas(false);
      }

      if (resultados.length === 0) toast.info("No se encontraron coincidencias.");

  } catch (error) {
      console.error("Error en búsqueda:", error);
      toast.error("Error al buscar");
  } finally {
      setLoading(false);
  }
};

  // Reset al borrar búsqueda
  useEffect(() => {
      if (busqueda === "" && buscando) {
          cargarPacientesIniciales();
          setBuscando(false);
      }
  }, [busqueda]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-6">
            <div>
              <Link href="/" className="text-slate-400 hover:text-slate-600 text-sm mb-2 inline-block font-medium">← Volver al Panel Principal</Link>
              <h1 className="text-3xl font-bold text-slate-900">Directorio de Pacientes</h1>
              <p className="text-slate-500 text-sm">Gestión de expedientes y comunicación.</p>
            </div>
            
            <div className="flex gap-2"> {/* ✅ Contenedor para múltiples botones */}
                {/* BOTÓN DE DEPURACIÓN (NUEVO) */}
                <Link href="/pacientes/depurar" className="bg-orange-100 hover:bg-orange-200 text-orange-700 px-5 py-2.5 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2 border border-orange-200">
                  <span>🧼</span> Depurar Duplicados
                </Link>

                {/* BOTÓN DE NUEVO PACIENTE (EXISTENTE) */}
                <Link href="/pacientes/registro" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-md transition-all flex items-center gap-2">
                  <span>+</span> Nuevo Paciente
                </Link>
            </div>
        </div>

        {/* BARRA DE BÚSQUEDA */}
        <form onSubmit={realizarBusqueda} className="mb-8 relative">
            <input 
              type="text" 
              placeholder="🔍 Buscar por APELLIDOS o NOMBRE..." 
              className="w-full p-4 border border-slate-300 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 text-lg uppercase placeholder:normal-case"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <button type="submit" className="absolute right-3 top-3 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-1.5 rounded-lg font-bold text-sm transition">
                Buscar
            </button>
        </form>

        {/* CONTENIDO PRINCIPAL */}
        {loading && pacientes.length === 0 ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-400">Consultando base de datos...</p>
          </div>
        ) : pacientes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
            <p className="text-2xl mb-2">🤷‍♂️</p>
            <p className="text-slate-500 font-medium">No se encontraron resultados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {pacientes.map((paciente) => (
              <PacienteCard 
                key={paciente.id} 
                paciente={paciente} 
                opcionesMensajes={mensajesPredefinidos} 
              />
            ))}
          </div>
        )}

        {/* PAGINACIÓN */}
        {!buscando && hayMas && !loading && (
            <div className="mt-8 text-center">
                <button 
                    onClick={cargarMas}
                    className="bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-900 px-6 py-2 rounded-full font-bold shadow-sm transition-all text-sm"
                >
                    ⬇️ Cargar siguientes 20
                </button>
            </div>
        )}
      </div>
    </div>
  );
}

function PacienteCard({ paciente, opcionesMensajes }: { paciente: Paciente, opcionesMensajes: MensajeConfig[] }) {
  const [mensajeSeleccionado, setMensajeSeleccionado] = useState("");
  const mensajeFinal = mensajeSeleccionado || MENSAJES.UBICACION();
  const avatarClass = paciente.genero === 'Femenino' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600';
  const telefono = paciente.telefonoCelular || paciente.celular || "";

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
      <div>
        <div className="flex justify-between items-start mb-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${avatarClass}`}>
            {paciente.nombreCompleto ? paciente.nombreCompleto.charAt(0) : '?'}
          </div>
          {paciente.edad > 0 && (
             <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full">
                {paciente.edad} AÑOS
             </span>
          )}
        </div>
        
        <h3 className="font-bold text-slate-800 text-sm mb-1 leading-tight group-hover:text-blue-700 transition-colors truncate" title={paciente.nombreCompleto}>
          {paciente.nombreCompleto}
        </h3>
        <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
          📱 {telefono || "S/N"}
        </p>
      </div>

      <div className="pt-3 border-t border-slate-50 space-y-3">
         <div className="flex justify-between items-center">
            <span className="text-[10px] text-blue-600 font-bold font-mono tracking-tight bg-blue-50 px-2 py-0.5 rounded">
              FOLIO: {paciente.folioExpediente || "S/F"}
            </span>
            <Link href={`/pacientes/${paciente.id}`} className="text-blue-600 text-xs font-bold hover:underline">
              Abrir Expediente →
            </Link>
         </div>

         <div className="bg-slate-50 p-2 rounded-lg">
           <div className="flex gap-2 items-center mb-2">
             <select 
               className="w-full text-[10px] p-1 border rounded bg-white outline-none cursor-pointer"
               onChange={(e) => setMensajeSeleccionado(e.target.value)}
             >
               <option value="">📍 Enviar Ubicación</option>
               {opcionesMensajes.map(m => (
                 <option key={m.id} value={m.texto}>{m.etiqueta}</option>
               ))}
             </select>
           </div>
           <WhatsAppButton 
               telefono={telefono} 
               mensaje={mensajeFinal} 
               label="Enviar"
               compact={true} 
             />
         </div>
      </div>
    </div>
  );
}