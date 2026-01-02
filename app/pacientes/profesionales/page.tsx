/* app/pacientes/profesionales/page.tsx - Versión Refactorizada */
import { getMedicosAction } from "@/lib/actions";
import ProtectedRoute from "@/components/ProtectedRoute";

const DIAS_NOM = ["-", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const parseHorarioVisual = (reglaStr: string) => {
    if (!reglaStr) return {};
    const mapa: Record<number, string> = {};
    const reglas = reglaStr.split(';');
    reglas.forEach(regla => {
        const [diasStr, horario] = regla.split('|');
        if (diasStr && horario) {
            diasStr.split(',').forEach(d => mapa[parseInt(d)] = horario.trim());
        }
    });
    return mapa;
};

export default async function CatalogoProfesionales() {
    const medicos = await getMedicosAction();

    return (
        <ProtectedRoute>
            <div className="max-w-6xl mx-auto p-6">
                <h1 className="text-3xl font-black text-slate-900 mb-8 uppercase tracking-tighter">Agenda Semanal de Profesionales</h1>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {medicos.map((m: any) => {
                        const horarios = parseHorarioVisual(m.reglasHorario);
                        return (
                            <div key={m.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row">
                                <div className="p-6 md:w-1/3 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/50">
                                    <div className="h-20 w-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-lg mb-4" style={{backgroundColor: m.color || '#2563eb'}}>
                                        {m.nombre[0]}
                                    </div>
                                    <h3 className="font-bold text-slate-800 text-center leading-tight">{m.nombre}</h3>
                                    <p className="text-[10px] text-blue-600 font-black uppercase mt-2">{m.especialidad}</p>
                                </div>
                                <div className="p-6 flex-1 grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {[1, 2, 3, 4, 5, 6].map(dia => (
                                        <div key={dia} className={`p-2 rounded-xl border ${horarios[dia] ? 'bg-white border-blue-100 shadow-sm' : 'bg-slate-50 border-transparent opacity-40'}`}>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">{DIAS_NOM[dia]}</span>
                                            <span className="text-[11px] font-bold text-slate-700">{horarios[dia] || "---"}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </ProtectedRoute>
    );
}