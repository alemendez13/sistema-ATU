"use client";
import { useState } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/ProtectedRoute";
import { toast } from "sonner";

export default function DepuracionPage() {
  const [analizando, setAnalizando] = useState(false);
  const [duplicadosDetectados, setDuplicadosDetectados] = useState<any[]>([]);

  const ejecutarEscaneo = async () => {
    setAnalizando(true);
    try {
      const snap = await getDocs(collection(db, "pacientes"));
      const todos = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      const grupos: any = {};

      todos.forEach(p => {
        // 🎯 LÓGICA DE DETECCIÓN (Teléfono o Tokens de Nombre)
        const tel = p.telefonoCelular || p.telefonos?.[0] || "SIN-TEL";
        const tokens = p.nombreCompleto.split(" ").slice(0, 2).join("-"); // Toma nombre y primer apellido
        
        // Creamos una llave única por teléfono o por los primeros dos nombres
        const llave = tel !== "SIN-TEL" ? tel : `NAME-${tokens}`;

        if (!grupos[llave]) grupos[llave] = [];
        grupos[llave].push(p);
      });

      // Filtramos solo donde hay más de 1 registro
      const encontrados = Object.values(grupos).filter((g: any) => g.length > 1);
      setDuplicadosDetectados(encontrados);
      toast.success(`Escaneo completo: ${encontrados.length} posibles duplicados.`);
    } catch (e) { toast.error("Error al escanear"); }
    finally { setAnalizando(false); }
  };

  const fusionarPacientes = async (maestro: any, duplicados: any[]) => {
    if (!confirm(`¿Confirmas fusionar ${duplicados.length} registros en el expediente de ${maestro.nombreCompleto}?`)) return;

    try {
      for (const secundario of duplicados) {
        if (secundario.id === maestro.id) continue;

        // 1. Mover CITAS al ID maestro
        const qCitas = query(collection(db, "citas"), where("pacienteId", "==", secundario.id));
        const snapCitas = await getDocs(qCitas);
        for (const c of snapCitas.docs) { await updateDoc(doc(db, "citas", c.id), { pacienteId: maestro.id }); }

        // 2. Mover OPERACIONES (Finanzas) al ID maestro
        const qOps = query(collection(db, "operaciones"), where("pacienteId", "==", secundario.id));
        const snapOps = await getDocs(qOps);
        for (const o of snapOps.docs) { await updateDoc(doc(db, "operaciones", o.id), { pacienteId: maestro.id }); }

        // 3. Borrar el expediente secundario (Limpieza de Plan Spark)
        await deleteDoc(doc(db, "pacientes", secundario.id));
      }
      toast.success("Fusión exitosa. Base de datos saneada.");
      ejecutarEscaneo();
    } catch (e) { toast.error("Error en la fusión"); }
  };

  return (
    <ProtectedRoute>
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-black mb-4">🧲 Sala de Depuración de Datos</h1>
        <p className="text-slate-500 mb-8">Esta herramienta busca registros con el mismo teléfono o nombres similares para unificar sus historiales.</p>

        <button 
          onClick={ejecutarEscaneo}
          disabled={analizando}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {analizando ? "Buscando coincidencias..." : "🔍 Iniciar Escaneo de Base de Datos"}
        </button>

        <div className="mt-12 space-y-6">
          {duplicadosDetectados.map((grupo, i) => (
            <div key={i} className="bg-white border-2 border-orange-100 p-6 rounded-2xl shadow-sm">
                <p className="text-xs font-black text-orange-600 uppercase mb-4">Posible Duplicado #{i+1}</p>
                <div className="space-y-3">
                    {grupo.map((p: any) => (
                        <div key={p.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                            <div>
                                <p className="font-bold text-slate-800">{p.nombreCompleto}</p>
                                <p className="text-[10px] text-slate-400 font-mono">ID: {p.id} | Tel: {p.telefonoCelular || "S/N"}</p>
                            </div>
                            <button 
                                onClick={() => fusionarPacientes(p, grupo)}
                                className="text-[10px] bg-slate-100 hover:bg-green-600 hover:text-white px-3 py-1 rounded-full font-bold transition-all"
                            >
                                CONSERVAR ESTE Y FUSIONAR
                            </button>
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