/* app/reportes/hoja-frontal/page.tsx */
"use client";
import { useState } from "react";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import ProtectedRoute from "../../../components/ProtectedRoute";
import DownloadHojaFrontalButton from "../../../components/pdf/DownloadHojaFrontalButton";
import Link from "next/link";

export default function HojaFrontalPage() {
  const [busqueda, setBusqueda] = useState("");
  const [paciente, setPaciente] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const buscarPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busqueda.length < 3) return alert("Escribe al menos 3 letras");
    
    setLoading(true);
    setPaciente(null);

    try {
      // Buscamos por nombre exacto o parcial (Mayúsculas)
      const q = query(
        collection(db, "pacientes"),
        where("nombreCompleto", ">=", busqueda.toUpperCase()),
        where("nombreCompleto", "<=", busqueda.toUpperCase() + '\uf8ff'),
        limit(1)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        setPaciente({ id: snapshot.docs[0].id, ...docData });
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
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-4xl mx-auto">
            
            <div className="flex items-center gap-4 mb-8">
                <Link href="/reportes" className="text-slate-400 hover:text-blue-600 text-2xl font-bold">←</Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Hoja Frontal de Expediente</h1>
                    <p className="text-slate-500">Generación de carátula para archivo físico</p>
                </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                <form onSubmit={buscarPaciente} className="flex gap-4 items-end mb-8">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Buscar Paciente</label>
                        <input 
                            className="w-full border p-3 rounded-lg uppercase" 
                            placeholder="NOMBRE COMPLETO" 
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                        />
                    </div>
                    <button disabled={loading} className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700">
                        {loading ? "..." : "🔍 Buscar"}
                    </button>
                </form>

                {paciente && (
                    <div className="bg-green-50 border border-green-200 p-6 rounded-xl flex justify-between items-center animate-fade-in">
                        <div>
                            <h3 className="font-bold text-lg text-green-900">{paciente.nombreCompleto}</h3>
                            <p className="text-green-700 text-sm">
                                {paciente.edad} años • {paciente.telefonoCelular} • {paciente.email || "Sin correo"}
                            </p>
                            {paciente.datosFiscales?.rfc ? (
                                <span className="inline-block mt-2 bg-green-200 text-green-800 text-xs px-2 py-1 rounded font-bold">
                                    Datos Fiscales Completos
                                </span>
                            ) : (
                                <span className="inline-block mt-2 bg-orange-200 text-orange-800 text-xs px-2 py-1 rounded font-bold">
                                    Sin Datos Fiscales
                                </span>
                            )}
                        </div>

                        <DownloadHojaFrontalButton paciente={paciente} />
                    </div>
                )}
            </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}