/* app/pacientes/profesionales/page.tsx */
import { getMedicosAction } from "@/lib/actions";
import ProtectedRoute from "@/components/ProtectedRoute";

export default async function CatalogoProfesionales() {
    const medicos = await getMedicosAction();

    return (
        <ProtectedRoute>
            <div className="max-w-5xl mx-auto p-6">
                <h1 className="text-2xl font-bold text-slate-800 mb-6">Catálogo de Profesionales y Horarios</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {medicos.map((m: any) => (
                        <div key={m.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-12 w-12 rounded-full flex items-center justify-center font-bold text-white shadow-inner" style={{backgroundColor: m.color || '#2563eb'}}>
                                    {m.nombre[0]}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg leading-tight">{m.nombre}</h3>
                                    <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">{m.especialidad}</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Reglas de Horario (Formato Técnico):</label>
                                <p className="text-sm text-slate-700 font-mono bg-white p-2 rounded border border-slate-200">
                                    {m.reglasHorario || "Sin horario definido"}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-2 italic">* Los números representan el día de la semana (1=Lunes, 5=Viernes).</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </ProtectedRoute>
    );
}