/* app/pacientes/profesionales/page.tsx - Versión "Google Calendar Style" */
import { getMedicosAction } from "@/lib/actions";
import ProtectedRoute from "@/components/ProtectedRoute";

const DIAS_NOM = ["-", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const HORAS_DISPLAY = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];

/**
 * Procesa el string "1,2|09:00-14:00" en objetos matemáticos para el calendario.
 */
const parseScheduleToBlocks = (reglaStr: string) => {
    const schedule: Record<number, { start: number; end: number }[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    if (!reglaStr) return schedule;

    reglaStr.split(';').forEach(rule => {
        const [daysPart, timesPart] = rule.split('|');
        if (!daysPart || !timesPart) return;

        const days = daysPart.split(',').map(d => parseInt(d.trim()));
        const timeRanges = timesPart.split(',').map(t => {
            const [start, end] = t.trim().split('-');
            const [sH, sM] = start.split(':').map(Number);
            const [eH, eM] = end.split(':').map(Number);
            return {
                start: sH * 60 + sM, // Convertir a minutos totales
                end: eH * 60 + eM
            };
        });

        days.forEach(d => {
            if (schedule[d]) schedule[d].push(...timeRanges);
        });
    });
    return schedule;
};

export default async function CatalogoProfesionales() {
    const medicos = await getMedicosAction();
    const START_HOUR = 8 * 60; // El calendario visual inicia a las 8:00 AM
    const END_HOUR = 21 * 60;  // Termina a las 9:00 PM
    const TOTAL_MINS = END_HOUR - START_HOUR;

    return (
        <ProtectedRoute>
            <div className="max-w-7xl mx-auto p-4 md:p-8">
                <header className="mb-10">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Disponibilidad de Profesionales</h1>
                    <p className="text-slate-500 font-medium italic">Vista de agenda semanal por especialista</p>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    {medicos.map((m: any) => {
                        const weeklyBlocks = parseScheduleToBlocks(m.reglasHorario);
                        const doctorColor = m.color || '#3b82f6';

                        return (
                            <div key={m.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[520px]">
                                {/* Header del Médico */}
                                <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md" style={{backgroundColor: doctorColor}}>
                                            {m.nombre[0]}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-sm">{m.nombre}</h3>
                                            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">{m.especialidad}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] bg-white border px-2 py-1 rounded-full font-bold text-slate-400">Google Sheets Sync</span>
                                </div>

                                {/* Cuerpo de la Agenda */}
                                <div className="flex-1 flex overflow-hidden relative">
                                    {/* Escala de Tiempo (Eje Y) */}
                                    <div className="w-12 bg-slate-50 border-r border-slate-100 flex flex-col justify-between py-8">
                                        {HORAS_DISPLAY.map(h => (
                                            <span key={h} className="text-[9px] font-bold text-slate-400 text-center">{h}</span>
                                        ))}
                                    </div>

                                    {/* Cuadrícula Semanal (Eje X) */}
                                    <div className="flex-1 grid grid-cols-6 relative h-full">
                                        {[1, 2, 3, 4, 5, 6].map(dia => (
                                            <div key={dia} className="border-r border-slate-50 relative group">
                                                {/* Encabezado del día */}
                                                <div className="absolute top-0 w-full text-center py-2 border-b border-slate-100 bg-white/80 backdrop-blur z-10">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase">{DIAS_NOM[dia].slice(0,3)}</span>
                                                </div>

                                                {/* Bloques de Disponibilidad */}
                                                {weeklyBlocks[dia]?.map((block, idx) => {
                                                    const topPercent = ((block.start - START_HOUR) / TOTAL_MINS) * 100;
                                                    const heightPercent = ((block.end - block.start) / TOTAL_MINS) * 100;
                                                    
                                                    return (
                                                        <div 
                                                            key={idx}
                                                            className="absolute left-1 right-1 rounded-lg shadow-sm border border-white/20 transition-all hover:scale-[1.02] flex flex-col justify-center items-center overflow-hidden p-1"
                                                            style={{
                                                                top: `${topPercent}%`,
                                                                height: `${heightPercent}%`,
                                                                backgroundColor: doctorColor,
                                                                opacity: 0.85
                                                            }}
                                                        >
                                                            <span className="text-[8px] text-white font-bold leading-none">VIVO</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </ProtectedRoute>
    );
}