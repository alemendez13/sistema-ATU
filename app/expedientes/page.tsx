/* app/expedientes/page.tsx */

"use client";
import { useState, Suspense } from "react";
import { collection, query, where, getDocs, limit } from "@/lib/firebase-guard";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/ProtectedRoute";
import Link from "next/link";

function ExpedientesLandingContent() {
  const [busqueda, setBusqueda] = useState("");
  const [paciente, setPaciente] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const buscarPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busqueda.length < 3) return alert("Escribe al menos 3 letras");
    setLoading(true);
    setPaciente(null);

    try {
      // 🛡️ Búsqueda Quirúrgica: Misma lógica de la Hoja Frontal de Reportes
      const q = query(
        collection(db, "pacientes"),
        where("nombreCompleto", ">=", busqueda.toUpperCase()),
        where("nombreCompleto", "<=", busqueda.toUpperCase() + '\uf8ff'),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setPaciente({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        alert("Paciente no encontrado");
      }
    } catch (error) {
      console.error(error);
      alert("Error al buscar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 p-8 pt-28">
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Módulo: Expediente Digital</h1>
                <p className="text-slate-500 text-sm italic">Puerta de acceso al archivo clínico digital de SANSCE.</p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                <form onSubmit={buscarPaciente} className="flex gap-4 items-end mb-8">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Buscar Paciente por Nombre</label>
                        <input 
                            className="w-full border p-3 rounded-lg uppercase placeholder:text-slate-300" 
                            placeholder="EJ: NOMBRE COMPLETO DEL PACIENTE" 
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                        />
                    </div>
                    <button disabled={loading} className="bg-slate-900 text-white font-bold py-3.5 px-6 rounded-lg hover:bg-black transition-all">
                        {loading ? "..." : "🔍 Buscar"}
                    </button>
                </form>

                {paciente && (
                    <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl flex justify-between items-center animate-in fade-in slide-in-from-bottom-2">
                        <div>
                            <h3 className="font-bold text-lg text-blue-900">{paciente.nombreCompleto}</h3>
                            <p className="text-blue-700 text-sm">Folio: {paciente.folioExpediente || "S/F"}</p>
                        </div>
                        {/* 🔗 El puente al archivo que creaste previamente */}
                        <Link href={`/pacientes/${paciente.id}/expediente`}>
                            <button className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 shadow-sm transition-all">
                                Abrir Expediente Clínico →
                            </button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function ExpedientesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center pt-28 italic">Cargando Archivo...</div>}>
      <ExpedientesLandingContent />
    </Suspense>
  );
}