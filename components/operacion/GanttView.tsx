"use client";

import React from 'react';

interface GanttViewProps {
  hitos: any[];
}

export default function GanttView({ hitos }: GanttViewProps) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-green-500 overflow-x-auto">
      <h2 className="text-lg font-bold text-slate-800 mb-6 uppercase tracking-tight">
        Cronograma Maestro de Proyectos
      </h2>
      
      <div className="min-w-[850px]">
        {/* CABECERA DE MESES (13 Columnas: 1 Título + 12 Meses) */}
        <div className="grid grid-cols-[280px_repeat(12,1fr)] gap-px bg-slate-200 border-b border-slate-200 text-[10px] font-bold text-slate-500 text-center uppercase">
          <div className="bg-slate-50 p-3 text-left border-r border-slate-200">Hito / Proyecto</div>
          {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map(mes => (
            <div key={mes} className="bg-slate-50 p-3 flex items-center justify-center border-l border-slate-100">
              {mes}
            </div>
          ))}
        </div>

        {/* CUERPO DEL GANTT */}
        <div className="divide-y divide-slate-100 border-x border-b border-slate-200">
          {hitos.map((hito) => {
            // Lógica de Alta Precisión (Día del Año)
            const getDayOfYear = (dateStr: string) => {
              const date = new Date(dateStr);
              if (isNaN(date.getTime())) return null;
              const start = new Date(date.getFullYear(), 0, 0);
              const diff = date.getTime() - start.getTime();
              const oneDay = 1000 * 60 * 60 * 24;
              return Math.floor(diff / oneDay);
            };

            const diaInicio = getDayOfYear(hito['Fecha Inicio']) || 1;
            const diaFin = getDayOfYear(hito['Fecha Fin']) || diaInicio + 7;
            
            // Calculamos posición porcentual sobre los 365 días del año
            const posicionIzquierda = ((diaInicio - 1) / 365) * 100;
            const anchoBarra = ((diaFin - diaInicio + 1) / 365) * 100;

            return (
              <div key={hito.ID_Hito} className="grid grid-cols-[280px_repeat(12,1fr)] items-center group hover:bg-slate-50 transition-colors">
                {/* Info del Proyecto */}
                <div className="p-3 border-r border-slate-100 bg-slate-50/30">
                  <p className="text-xs font-bold text-slate-700 truncate">{hito['Nombre del Hito']}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-400 font-semibold uppercase">
                      {hito.Proyecto || 'General'}
                    </span>
                  </div>
                </div>
                
                {/* Carril de Tiempo (Barra dinámica) */}
                <div className="relative col-span-12 h-12 flex items-center px-1">
                  <div 
                    className="absolute h-7 rounded-md shadow-sm flex items-center px-3 text-[9px] font-bold text-white transition-all hover:brightness-110 cursor-help"
                    style={{
                      left: `${posicionIzquierda}%`,
                      width: `${anchoBarra}%`,
                      backgroundColor: hito.Estado === 'Cumplida' ? '#10b981' : '#3b82f6',
                      zIndex: 10
                    }}
                    title={`Hito: ${hito['Nombre del Hito']} | Inicio: ${hito['Fecha Inicio']} - Fin: ${hito['Fecha Fin']}`}
                  >
                    <span className="truncate">{hito.Estado === 'Cumplida' ? '✓ CUMPLIDO' : hito.Estado}</span>
                  </div>
                  
                  {/* Guías de fondo (Líneas verticales de meses) */}
                  {Array.from({length: 12}).map((_, i) => (
                    <div key={i} className="flex-1 h-full border-r border-slate-50 last:border-0" />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}