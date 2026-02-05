"use client";
import { useState, useEffect } from "react";
// Importamos 'limit' para proteger la cuota
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, limit } from "@/lib/firebase-guard";
import { db } from "../../lib/firebase";
import { toast } from "sonner";
import Button from "../ui/Button";

interface WaitItem {
  id: string;
  paciente: string;
  telefono: string;
  notas: string;
  fecha: any;
}

// 1. Agregamos médicos a las props para poder seleccionarlos
export default function WaitingList({ onAsignar, medicos }: { onAsignar?: (paciente: any) => void, medicos: any[] }) {
  const [items, setItems] = useState<WaitItem[]>([]);
  const [nuevoPaciente, setNuevoPaciente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [notas, setNotas] = useState("");
  // 🆕 Nuevos estados para la trazabilidad
  const [medicoId, setMedicoId] = useState("");
  const [fechaDeseada, setFechaDeseada] = useState("");
  const [loading, setLoading] = useState(false);

  // Escuchar la lista en tiempo real
  useEffect(() => {
    // 🛡️ PROTECCIÓN DE CUOTA: Agregamos limit(50)
    // Esto evita leer miles de documentos si la lista crece mucho históricamente.
    const q = query(
        collection(db, "lista_espera"), 
        orderBy("fecha", "asc"),
        limit(50) 
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WaitItem[];
      setItems(data);
    }, (error) => {
        console.error("Error en WaitingList:", error);
    });

    return () => unsubscribe();
  }, []);

  const handleAgregar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoPaciente || !telefono) return;

    setLoading(true);
    try {
      await addDoc(collection(db, "lista_espera"), {
        paciente: nuevoPaciente.toUpperCase(),
        telefono,
        notas,
        medicoId: medicoId || null, // Guardamos el ID del médico o vacío
        fechaDeseada: fechaDeseada || null, // Guardamos la fecha solicitada
        fecha: serverTimestamp() // Fecha de registro (Auditoría)
      });
      toast.success("Paciente agregado a espera");
      setNuevoPaciente("");
      setTelefono("");
      setNotas("");
      setMedicoId(""); // Limpiamos para el siguiente registro
      setFechaDeseada(""); // Limpiamos para el siguiente registro
    } catch (error) {
      toast.error("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id: string) => {
    if (!confirm("¿Ya se atendió o descartó a este paciente?")) return;
    try {
      await deleteDoc(doc(db, "lista_espera", id));
      toast.success("Removido de la lista");
    } catch (error) {
      toast.error("Error al eliminar");
    }
  };

  return (
    <div className="mt-8 bg-white p-6 rounded-xl shadow-sm border border-orange-100">
      <h3 className="text-lg font-bold text-orange-800 mb-4 flex items-center gap-2">
        ⏳ Lista de Espera / Recuperación
      </h3>
      
      {/* Formulario Rápido */}
      <form onSubmit={handleAgregar} className="flex flex-col md:flex-row gap-3 mb-6 items-end">
        <div className="flex-1 w-full">
            <label className="text-xs font-bold text-slate-500 uppercase">Paciente</label>
            <input 
                className="w-full border p-2 rounded text-sm" 
                value={nuevoPaciente} 
                onChange={e => setNuevoPaciente(e.target.value)} 
                placeholder="Nombre completo" 
                required
            />
        </div>
        <div className="w-full md:w-40">
            <label className="text-xs font-bold text-slate-500 uppercase">Teléfono</label>
            <input 
                className="w-full border p-2 rounded text-sm" 
                value={telefono} 
                onChange={e => setTelefono(e.target.value)} 
                placeholder="55..." 
                required
            />
        </div>
        <div className="w-full md:w-48">
            <label className="text-xs font-bold text-slate-500 uppercase">Médico Solicitado</label>
            <select 
                className="w-full border p-2 rounded text-sm bg-white" 
                value={medicoId} 
                onChange={e => setMedicoId(e.target.value)}
            >
                <option value="">Cualquier médico</option>
                {medicos?.map(m => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
            </select>
        </div>

        <div className="w-full md:w-40">
            <label className="text-xs font-bold text-slate-500 uppercase">Fecha Tentativa</label>
            <input 
                type="date"
                className="w-full border p-2 rounded text-sm" 
                value={fechaDeseada} 
                onChange={e => setFechaDeseada(e.target.value)} 
            />
        </div>

        <div className="flex-1 w-full">
            <label className="text-xs font-bold text-slate-500 uppercase">Notas</label>
            <input 
                className="w-full border p-2 rounded text-sm" 
                value={notas} 
                onChange={e => setNotas(e.target.value)} 
                placeholder="Ej. Urgente" 
            />
        </div>

        <Button type="submit" variant="secondary" isLoading={loading} className="w-full md:w-auto">
            + Agregar
        </Button>
      </form>

      {/* Lista Visual */}
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-slate-400 italic">La lista de espera está vacía.</p>}
        
        {items.map(item => (
            <div key={item.id} className="flex justify-between items-center bg-orange-50 p-3 rounded border border-orange-100">
                <div>
                    <p className="font-bold text-slate-800">{item.paciente}</p>
                    <p className="text-xs text-slate-500">
                        📞 {item.telefono} • <span className="italic">{item.notas}</span>
                    </p>
                </div>

                <div className="flex gap-2">
                    <button 
                        onClick={() => onAsignar && onAsignar(item)}
                        className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded hover:bg-blue-200"
                    >
                        📅 Asignar
                    </button>

                    <button 
                        onClick={() => handleEliminar(item.id)}
                        className="text-xs text-red-500 hover:text-red-700 font-bold border border-red-200 px-2 py-1 rounded hover:bg-red-50"
                    >
                        ❌ Quitar
                    </button>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}