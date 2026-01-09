// app/pacientes/depurar/page.tsx
"use client";
import { useState } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where } from "@/lib/firebase-guard";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/ProtectedRoute";
import { toast } from "sonner";

export default function DepuracionPage() {
  const [analizando, setAnalizando] = useState(false);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [seleccionadosParaBorrar, setSeleccionadosParaBorrar] = useState<string[]>([]);

  // Lógica de Similitud (Fuzzy Match local - 0 Lecturas extra)
  const calcularSimilitud = (s1: string, s2: string) => {
    const n1 = s1.toUpperCase().split(" ");
    const n2 = s2.toUpperCase().split(" ");
    const coincidencias = n1.filter(word => n2.includes(word));
    return Math.round((coincidencias.length / Math.max(n1.length, n2.length)) * 100);
  };

  const ejecutarEscaneo = async () => {
    if (analizando) return;
    setAnalizando(true);
    try {
      // ✅ UNA SOLA LECTURA MASIVA (Eficiente)
      const snap = await getDocs(collection(db, "pacientes"));
      const todos = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      const mapaGrupos: any = {};

      todos.forEach(p => {
        const tel = p.telefonoCelular || p.telefonos?.[0] || "S/N";
        const nombreBase = p.nombreCompleto.split(" ")[0]; // Primer nombre
        const llave = tel !== "S/N" ? tel : `NOM-${nombreBase}`;
        
        if (!mapaGrupos[llave]) mapaGrupos[llave] = [];
        mapaGrupos[llave].push(p);
      });

      // Filtramos grupos con más de 1 persona
      const detectados = Object.values(mapaGrupos).filter((g: any) => g.length > 1);
      setGrupos(detectados);
      toast.success(`Escaneo terminado: ${detectados.length} grupos hallados.`);
    } catch (e) { toast.error("Error al escanear"); }
    finally { setAnalizando(false); }
  };

  const fusionarSeleccionados = async (maestroId: string, grupoId: number) => {
    const aBorrar = seleccionadosParaBorrar.filter(id => id !== maestroId);
    if (aBorrar.length === 0) return toast.error("Selecciona al menos un duplicado para borrar.");
    
    if (!confirm(`¿Fusionar los registros seleccionados en el ID Principal? Se moverán citas y pagos.`)) return;

    try {
      for (const idViejo of aBorrar) {
        // 1. Mover Citas y Operaciones
        const collections = ["citas", "operaciones"];
        for (const col of collections) {
            const q = query(collection(db, col), where("pacienteId", "==", idViejo));
            const snap = await getDocs(q);
            for (const d of snap.docs) await updateDoc(doc(db, col, d.id), { pacienteId: maestroId });
        }
        // 2. Eliminar ficha
        await deleteDoc(doc(db, "pacientes", idViejo));
      }
      toast.success("Fusión realizada con éxito.");
      setSeleccionadosParaBorrar([]);
      ejecutarEscaneo();
    } catch (e) { toast.error("Error en la fusión"); }
  };

  return (
    <ProtectedRoute>
      <div className="p-8 max-w-5xl mx-auto">
        <h1 className="text-3xl font-black mb-2">🧼 Depuración Selectiva</h1>
        <p className="text-slate-500 mb-8 text-sm italic">
            Lectura estimada: {grupos.length > 0 ? "0 (Cache)" : "1 por paciente"}. 
            Evita fusionar familiares que comparten teléfono.
        </p>

        <button onClick={ejecutarEscaneo} disabled={analizando} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50">
          {analizando ? "Analizando base de datos..." : "🔍 Buscar posibles duplicados"}
        </button>

        <div className="mt-10 space-y-8">
          {grupos.map((grupo, idx) => (
            <div key={idx} className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden">
                <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400">COINCIDENCIA #{idx+1} (Mismo Tel/Nombre)</span>
                    <button 
                        onClick={() => fusionarSeleccionados(grupo[0].id, idx)}
                        className="bg-orange-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold"
                    >
                        🪄 Fusionar Marcados
                    </button>
                </div>
                <div className="p-2 space-y-1">
                    {grupo.map((p: any, pIdx: number) => (
                        <div key={p.id} className={`flex items-center gap-4 p-4 rounded-xl ${pIdx === 0 ? 'bg-blue-50/50' : ''}`}>
                            {pIdx !== 0 && (
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 rounded border-slate-300 text-orange-600"
                                    onChange={(e) => {
                                        if (e.target.checked) setSeleccionadosParaBorrar([...seleccionadosParaBorrar, p.id]);
                                        else setSeleccionadosParaBorrar(seleccionadosParaBorrar.filter(id => id !== p.id));
                                    }}
                                />
                            )}
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="font-bold text-slate-800">{p.nombreCompleto}</p>
                                    {pIdx === 0 && <span className="text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-black">REGISTRO MAESTRO</span>}
                                    {pIdx !== 0 && (
                                        <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                                            {calcularSimilitud(grupo[0].nombreCompleto, p.nombreCompleto)}% Similitud
                                        </span>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-400 font-mono">ID: {p.id} | 📱 {p.telefonoCelular || p.telefonos?.[0] || "S/N"}</p>
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