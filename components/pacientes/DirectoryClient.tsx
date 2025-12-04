"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import Link from "next/link";
import WhatsAppButton from "../ui/WhatsAppButton";
import { MENSAJES } from "../../lib/whatsappTemplates";

interface Paciente {
  id: string;
  nombreCompleto: string;
  telefonoCelular: string;
  celular?: string; // Soporte para ambos nombres de campo
  email: string;
  edad: number;
  curp?: string;
  genero?: string;
  fechaRegistro?: any;
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

  // Cargar pacientes en TIEMPO REAL (Lógica original conservada)
  useEffect(() => {
    const q = query(collection(db, "pacientes"), orderBy("fechaRegistro", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as Paciente[];
      setPacientes(docs);
      setLoading(false);
    }, (error) => {
      console.error("Error cargando pacientes:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filtrado (Funcionalidad original + Búsqueda)
  const pacientesFiltrados = pacientes.filter(p => 
    p.nombreCompleto.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Botón Volver (Original) */}
        {/* ENCABEZADO UNIFICADO IZQUIERDA */}
        <div className="flex flex-col items-start gap-4 mb-8">
          <Link href="/" className="text-slate-500 hover:text-blue-600 text-sm flex items-center gap-1 font-medium">
            <span>←</span> Volver al Panel Principal
          </Link>

          <div className="w-full flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Directorio de Pacientes</h1>
              <p className="text-slate-500">Gestión de expedientes y comunicación.</p>
            </div>
            {/* El botón de Nuevo Paciente se queda a la derecha o lo puedes mover abajo si prefieres */}
            <Link href="/pacientes/registro" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold shadow-md">
              + Nuevo Paciente
            </Link>
          </div>
        </div>

        {/* Barra de Búsqueda (Mejora Agregada) */}
        <input 
          type="text" 
          placeholder="🔍 Buscar por nombre..." 
          className="w-full p-3 border border-slate-300 rounded-lg mb-6 shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        {/* Lógica de Renderizado */}
        {loading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-500">Cargando directorio...</p>
          </div>
        ) : pacientes.length === 0 ? (
          // Estado Vacío (Original RECUPERADO)
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-slate-200">
            <p className="text-4xl mb-4">📭</p>
            <h3 className="text-xl font-bold text-slate-700">No hay pacientes registrados</h3>
            <p className="text-slate-500 mb-6">Comienza registrando el primero.</p>
            <Link href="/pacientes/registro" className="text-blue-600 font-bold hover:underline">
              Ir al Registro &rarr;
            </Link>
          </div>
        ) : (
          // Grid de Tarjetas
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pacientesFiltrados.map((paciente) => (
              <PacienteCard 
                key={paciente.id} 
                paciente={paciente} 
                opcionesMensajes={mensajesPredefinidos} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-componente de Tarjeta (Lógica Visual Original + Select de WhatsApp)
function PacienteCard({ paciente, opcionesMensajes }: { paciente: Paciente, opcionesMensajes: MensajeConfig[] }) {
  const [mensajeSeleccionado, setMensajeSeleccionado] = useState("");
  
  // Combinamos: Si hay selección usa esa, si no, usa Ubicación (Default)
  const mensajeFinal = mensajeSeleccionado || MENSAJES.UBICACION();

  // Determinar color de avatar (Lógica Original)
  const avatarClass = paciente.genero === 'Femenino' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600';

  // Unificar campos de teléfono (Soporte legacy)
  const telefono = paciente.telefonoCelular || paciente.celular || "";

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col justify-between">
      <div>
        {/* Cabecera Tarjeta */}
        <div className="flex justify-between items-start mb-4">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center text-lg font-bold ${avatarClass}`}>
            {paciente.nombreCompleto ? paciente.nombreCompleto.charAt(0) : '?'}
          </div>
          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded">
            {paciente.edad} años
          </span>
        </div>
        
        {/* Datos Principales */}
        <h3 className="font-bold text-slate-800 text-lg mb-1 truncate" title={paciente.nombreCompleto}>
          {paciente.nombreCompleto}
        </h3>
        <p className="text-sm text-slate-500 mb-1 flex items-center gap-1">
          📞 {telefono || "Sin teléfono"}
        </p>
      </div>

      {/* Zona Inferior (Acciones) */}
      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
         <div className="flex justify-between items-center">
            {/* Dato CURP/ID (Recuperado del original) */}
            <span className="text-xs text-slate-400">
               {paciente.curp ? `CURP: ${paciente.curp.slice(0, 10)}...` : `ID: ${paciente.id.slice(0,6)}`}
            </span>
            
            <Link href={`/pacientes/${paciente.id}`} className="text-blue-600 text-sm font-bold hover:bg-blue-50 px-3 py-1 rounded transition-colors">
              Ver Expediente →
            </Link>
         </div>

         {/* SELECTOR DE MENSAJES (MEJORA FASE 1.5) */}
         <div>
           <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Enviar WhatsApp:</label>
           <div className="flex gap-2">
             <select 
               className="flex-1 text-xs p-2 border rounded bg-slate-50 outline-none focus:border-green-500"
               onChange={(e) => setMensajeSeleccionado(e.target.value)}
               defaultValue=""
             >
               <option value="">📍 Ubicación (Default)</option>
               {opcionesMensajes.map(m => (
                 <option key={m.id} value={m.texto}>💬 {m.etiqueta}</option>
               ))}
             </select>
           </div>
           
           <div className="mt-2">
             <WhatsAppButton 
               telefono={telefono} 
               mensaje={mensajeFinal} 
               label="Enviar Mensaje"
               compact={false}
             />
           </div>
         </div>
      </div>
    </div>
  );
}