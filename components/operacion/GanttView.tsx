"use client";

import React from 'react';

interface GanttViewProps {
  hitos: any[];
}

export default function GanttView({ hitos }: GanttViewProps) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-green-500 overflow-x-auto">
      <h2 className="text-lg font-bold text-slate-800 mb-6 uppercase tracking-tight">
        Cronograma Maestro de Actividades
      </h2>
      
      <div className="min-w-[850px]">
        {/* CABECERA DE MESES (13 Columnas: 1 Título + 12 Meses) */}
        <div className="grid grid-cols-[280px_repeat(12,1fr)] gap-px bg-slate-200 border-b border-slate-200 text-[10px] font-bold text-slate-500 text-center uppercase">
          <div className="bg-slate-50 p-3 text-left border-r border-slate-200">Tipo de Actividad / Proyecto</div>
          {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map(mes => (
            <div key={mes} className="bg-slate-50 p-3 flex items-center justify-center border-l border-slate-100">
              {mes}
            </div>
          ))}
        </div>

        {/* CUERPO DEL GANTT AGRUPADO POR PROYECTO */}
        <div className="divide-y divide-slate-200 border-x border-b border-slate-200">
          {(Object.entries(
            hitos.reduce((acc, hito) => {
              const proy = hito.Proyecto || 'General';
              if (!acc[proy]) acc[proy] = [];
              acc[proy].push(hito);
              return acc;
            }, {} as Record<string, any[]>)
          ) as [string, any[]][]).map(([proyecto, hitosDelProyecto]) => (
            <div key={proyecto} className="bg-slate-50/50">
              {/* Encabezado de Proyecto (PC Impactado) */}
              <div className="bg-slate-100/80 px-4 py-2 border-y border-slate-200">
                <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">
                  📂 PROYECTO: {proyecto}
                </span>
              </div>

              {hitosDelProyecto.map((hito: any) => {
                const getDayOfYear = (dateStr: string) => {
                  const date = new Date(dateStr);
                  if (isNaN(date.getTime())) return null;
                  const start = new Date(date.getFullYear(), 0, 0);
                  const diff = date.getTime() - start.getTime();
                  return Math.floor(diff / (1000 * 60 * 60 * 24));
                };

                const diaInicio = getDayOfYear(hito['Fecha Inicio']) || 1;
                const diaFin = getDayOfYear(hito['Fecha Fin']) || diaInicio + 7;
                const posicionIzquierda = ((diaInicio - 1) / 365) * 100;
                const anchoBarra = ((diaFin - diaInicio + 1) / 365) * 100;

                return (
                  <div key={hito.ID_Hito} className="grid grid-cols-[280px_repeat(12,1fr)] items-center group hover:bg-white transition-colors border-b border-slate-100 last:border-0">
                    <div className="p-3 border-r border-slate-100">
                      <p className="text-[11px] font-semibold text-slate-700 truncate">
                        {hito['Nombre de la Actividad'] || hito['Nombre del Hito']}
                      </p>
                      <p className="text-[9px] text-slate-400 font-medium">{hito.Responsable}</p>
                    </div>
                    
                    <div className="relative col-span-12 h-10 flex items-center px-1">
                      <div 
                        className="absolute h-6 rounded-md shadow-sm flex items-center px-3 text-[9px] font-bold text-white transition-all hover:scale-[1.02] cursor-help"
                        style={{
                          left: `${posicionIzquierda}%`,
                          width: `${anchoBarra}%`,
                          backgroundColor: hito.Estado === 'Cumplida' ? '#10b981' : '#3b82f6',
                        }}
                        title={`Actividad: ${hito['Nombre de la Actividad'] || hito['Nombre del Hito']} | Resp: ${hito.Responsable}`}
                      >
                        <span className="truncate">{hito.Estado === 'Cumplida' ? '✓' : hito.Estado}</span>
                      </div>
                      {Array.from({length: 12}).map((_, i) => (
                        <div key={i} className="flex-1 h-full border-r border-slate-100/30 last:border-0" />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}