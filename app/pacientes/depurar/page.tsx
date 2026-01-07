"use client";
import { useState } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/ProtectedRoute";
import { toast } from "sonner";

export default function DepuracionPage() {
  const [analizando, setAnalizando] = useState(false);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [seleccionados, setSeleccionados] = useState<string[]>([]); // IDs a fusionar

  const ejecutarEscaneo = async () => {
    setAnalizando(true);
    try {
      const snap = await getDocs(collection(db, "pacientes"));
      const todos = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      const mapaGrupos: any = {};

      todos.forEach(p => {
        const tel = p.telefonoCelular || p.telefonos?.[0] || "S/N";
        const llave = tel !== "S/N" ? tel : `NOM-${p.nombreCompleto.split(" ")[0]}`;
        if (!mapaGrupos[llave]) mapaGrupos[llave] = [];
        mapaGrupos[llave].push(p);
      });

      setGrupos(Object.values(mapaGrupos).filter((g: any) => g.length > 1));
      toast.success("Escaneo terminado.");
    } catch (e) { toast.error("Error al escanear"); }
    finally { setAnalizando(false); }
  };

  const handleFusionar = async (maestroId: string, idsParaBorrar: string[]) => {
    if (!confirm(`¿Fusionar ${idsParaBorrar.length} registros en el ID principal? Esta acción no se puede deshacer.`)) return;

    try {
      for (const idViejo of idsParaBorrar) {
        // 1. Mover Citas
        const qCitas = query(collection(db, "citas"), where("pacienteId", "==", idViejo));
        const snapCitas = await getDocs(qCitas);
        for (const c of snapCitas.docs) await updateDoc(doc(db, "citas", c.id), { pacienteId: maestroId });

        // 2. Mover Operaciones
        const qOps = query(collection(db, "operaciones"), where("pacienteId", "==", idViejo));
        const snapOps = await getDocs(qOps);
        for (const o of snapOps.docs) await updateDoc(doc(db, "operaciones", o.id), { pacienteId: maestroId });

        // 3. Eliminar ficha duplicada
        await deleteDoc(doc(db, "pacientes", idViejo));
      }
      toast.success("Fusión selectiva completada.");
      ejecutarEscaneo();
      setSeleccionados([]);
    } catch (e) { toast.error("Error en la fusión"); }
  };

  return (
    <ProtectedRoute>
      <div className="p-8 max-w-5xl mx-auto">
        <h1 className="text-3xl font-black mb-2">🧼 Depuración Selectiva</h1>
        <p className="text-slate-500 mb-8 text-sm">Selecciona manualmente los registros que son de la misma persona para unificarlos.</p>

        <button onClick={ejecutarEscaneo} disabled={analizando} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50">
          {analizando ? "Analizando registros..." : "🔍 Buscar posibles duplicados"}
        </button>

        <div className="mt-10 space-y-8">
          {grupos.map((grupo, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Grupo de Coincidencia #{i+1}</span>
                    <button 
                        onClick={() => {
                            const ids = grupo.map((p: any) => p.id).filter((id: string) => id !== grupo[0].id);
                            handleFusionar(grupo[0].id, ids);
                        }}
                        className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 transition"
                    >
                        🪄 Fusionar Marcados en el Primero
                    </button>
                </div>
                <div className="p-2">
                    {grupo.map((p: any) => (
                        <div key={p.id} className="flex items-center gap-4 p-4 hover:bg-blue-50 transition-colors rounded-xl group">
                            <div className="flex-1">
                                <p className="font-bold text-slate-800">{p.nombreCompleto}</p>
                                <p className="text-[10px] text-slate-400 font-mono">ID: {p.id} | 📱 {p.telefonoCelular || p.telefonos?.[0] || "S/N"}</p>
                            </div>
                            <div className="text-xs text-blue-600 font-bold bg-blue-100 px-2 py-1 rounded opacity-0 group-first:opacity-100">
                                ⭐ PRINCIPAL
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          ))}
        </div>
      </div>
    </ProtectedRoute>
  );
}