/* app/pacientes/depurar/page.tsx */
"use client";
import { useState } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where } from "@/lib/firebase-guard";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/ProtectedRoute";
import { toast } from "sonner";
import { superNormalize, generateSearchTags } from "@/lib/utils";
import Link from "next/link";
import CorrectorFechas from "./correccion-fechas";

// ----------------------------------------------------------------------
// 🧩 COMPONENTE 1: Lógica de Duplicados (Antiguo DepuracionPage)
// ----------------------------------------------------------------------
function HerramientaDuplicados() {
  const [analizando, setAnalizando] = useState(false);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [seleccionadosParaBorrar, setSeleccionadosParaBorrar] = useState<string[]>([]);
  const [progreso, setProgreso] = useState(0);
  const [migrando, setMigrando] = useState(false);

  // Lógica de Similitud
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
      const snap = await getDocs(collection(db, "pacientes"));
      const todos = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      const mapaGrupos: any = {};

      todos.forEach(p => {
        const tel = p.telefonoCelular || p.telefonos?.[0] || "S/N";
        const nombreBase = p.nombreCompleto.split(" ")[0];
        const llave = tel !== "S/N" ? tel : `NOM-${nombreBase}`;
        
        if (!mapaGrupos[llave]) mapaGrupos[llave] = [];
        mapaGrupos[llave].push(p);
      });

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
        // Mover Citas y Operaciones
        const collections = ["citas", "operaciones"];
        for (const col of collections) {
            const q = query(collection(db, col), where("pacienteId", "==", idViejo));
            const snap = await getDocs(q);
            for (const d of snap.docs) await updateDoc(doc(db, col, d.id), { pacienteId: maestroId });
        }
        // Eliminar ficha
        await deleteDoc(doc(db, "pacientes", idViejo));
      }
      toast.success("Fusión realizada con éxito.");
      setSeleccionadosParaBorrar([]);
      ejecutarEscaneo();
    } catch (e) { toast.error("Error en la fusión"); }
  };

  const ejecutarMigracionTags = async () => {
    if (!confirm("⚠️ ¿Iniciar normalización masiva? Esto corregirá la búsqueda de todos los pacientes actuales.")) return;
    setMigrando(true);
    setProgreso(0);
    try {
        const snap = await getDocs(collection(db, "pacientes"));
        const total = snap.docs.length;
        let procesados = 0;
        for (const documento of snap.docs) {
            const data = documento.data();
            const nombreActual = data.nombreCompleto || "";
            const nombreLimpio = superNormalize(nombreActual);
            const nuevosTags = generateSearchTags(nombreLimpio);
            await updateDoc(doc(db, "pacientes", documento.id), {
                nombreCompleto: nombreLimpio,
                searchKeywords: nuevosTags,
                mantenimientoTags: "v2.0-limpio"
            });
            procesados++;
            setProgreso(Math.round((procesados / total) * 100));
        }
        toast.success("✅ Migración completada.");
    } catch (e) { console.error(e); toast.error("Error al actualizar registros."); } 
    finally { setMigrando(false); }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
            <h2 className="font-bold flex items-center gap-2">👥 Depuración de Duplicados</h2>
            <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">
                {grupos.length > 0 ? `${grupos.length} conflictos` : "En espera"}
            </span>
        </div>
        
        <div className="p-6">
            <div className="flex gap-4 mb-6">
                <button onClick={ejecutarEscaneo} disabled={analizando || migrando} className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
                    {analizando ? "Analizando..." : "🔍 Buscar Duplicados"}
                </button>
                <button onClick={ejecutarMigracionTags} disabled={analizando || migrando} className="flex-1 bg-slate-100 text-slate-700 border border-slate-200 px-4 py-3 rounded-xl font-bold hover:bg-slate-200 disabled:opacity-50 text-sm">
                    {migrando ? `⚙️ Procesando: ${progreso}%` : "🧹 Normalizar Nombres (Legacy)"}
                </button>
            </div>

            <div className="space-y-6 max-h-[600px] overflow-y-auto">
            {grupos.map((grupo, idx) => (
                <div key={idx} className="border-2 border-slate-100 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 p-3 border-b flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">CONFLICTO #{idx+1}</span>
                        <button 
                            onClick={() => fusionarSeleccionados(grupo[0].id, idx)}
                            className="bg-orange-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-orange-700"
                        >
                            🪄 Fusionar
                        </button>
                    </div>
                    <div className="p-2 space-y-1">
                        {grupo.map((p: any, pIdx: number) => (
                            <div key={p.id} className={`flex items-center gap-3 p-3 rounded-lg ${pIdx === 0 ? 'bg-blue-50/50' : ''}`}>
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
                                        <p className="font-bold text-sm text-slate-800">{p.nombreCompleto}</p>
                                        {pIdx === 0 && <span className="text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-black">MAESTRO</span>}
                                        {pIdx !== 0 && (
                                            <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                                                {calcularSimilitud(grupo[0].nombreCompleto, p.nombreCompleto)}% Igual
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-mono">ID: {p.id} | 📱 {p.telefonoCelular || "S/N"}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            {grupos.length === 0 && !analizando && (
                <p className="text-center text-slate-400 text-sm py-4 italic">No hay grupos de duplicados visibles. Pulsa "Buscar" para escanear.</p>
            )}
            </div>
        </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 📄 COMPONENTE PRINCIPAL (Página)
// ----------------------------------------------------------------------
export default function Page() {
  return (
    <ProtectedRoute>
        <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-5xl mx-auto">
            <div className="mb-8 flex items-center gap-4">
            <Link href="/pacientes" className="text-slate-400 hover:text-blue-600 font-bold text-xl">
                ← Volver al Directorio
            </Link>
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Centro de Mantenimiento</h1>
                <p className="text-slate-500">Herramientas técnicas para corrección de datos y saneamiento.</p>
            </div>
            </div>

            <div className="grid grid-cols-1 gap-12">
            
            {/* 🛠️ HERRAMIENTA 1: CORRECCIÓN DE FECHAS */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-indigo-600 p-4 text-white">
                    <h2 className="font-bold flex items-center gap-2">
                    📅 Corrección de Trazabilidad (Cortesías)
                    </h2>
                </div>
                <CorrectorFechas />
            </div>

            {/* 🛠️ HERRAMIENTA 2: DEPURACIÓN DE DUPLICADOS */}
            {/* Aquí insertamos el componente real que definimos arriba */}
            <HerramientaDuplicados />

            </div>
        </div>
        </div>
    </ProtectedRoute>
  );
}