// app/admin/rh/monitor/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Users, LogIn, LogOut, Search, Filter, ArrowUpRight } from 'lucide-react';

// Interfaz de Registro (Basada en Trazabilidad Sagrada)
interface Asistencia {
  id: string;
  nombre: string;
  rol: string;
  tipo: 'Entrada' | 'Salida';
  hora: string;
  dispositivo: string;
}

export default function MonitorAsistencia() {
  const [registros, setRegistros] = useState<Asistencia[]>([]);
  
  // En producción, aquí se usa un onSnapshot de Firebase para tiempo real
  useEffect(() => {
    // Simulación de flujo de datos en tiempo real
    const mockData: Asistencia[] = [
      { id: '1', nombre: 'Dr. Julián Casablancas', rol: 'Médico Especialista', tipo: 'Entrada', hora: '08:02 AM', dispositivo: 'TABLET-REC-01' },
      { id: '2', nombre: 'Lic. Ana García', rol: 'Administración', tipo: 'Entrada', hora: '08:15 AM', dispositivo: 'TABLET-REC-01' },
      { id: '3', nombre: 'Enf. Roberto Gómez', rol: 'Enfermería', tipo: 'Salida', hora: '14:30 PM', dispositivo: 'TABLET-REC-01' },
    ];
    setRegistros(mockData);
  }, []);

  return (
    <div className="p-8 bg-[#F8FAF8] min-h-screen">
      {/* Header Estratégico */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-light text-slate-800 tracking-tight">Monitor de Asistencia</h1>
          <p className="text-sm text-slate-500 uppercase tracking-widest mt-1">Recursos Humanos · Tiempo Real</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="bg-blue-50 p-2 rounded-lg"><Users className="text-blue-600 w-5 h-5" /></div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Presentes</p>
              <p className="text-xl font-semibold text-slate-800">12</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Control Premium */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Buscar colaborador..." 
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F8FAF8] border-none text-sm focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <button className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors">
            <Filter className="w-4 h-4" /> FILTRAR POR DEPARTAMENTO
          </button>
        </div>

        <table className="w-full text-left">
          <thead className="bg-[#F8FAF8] text-[10px] uppercase tracking-widest text-slate-400">
            <tr>
              <th className="px-8 py-4 font-semibold">Colaborador</th>
              <th className="px-8 py-4 font-semibold">Departamento / Rol</th>
              <th className="px-8 py-4 font-semibold">Evento</th>
              <th className="px-8 py-4 font-semibold text-right">Hora Registro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {registros.map((reg) => (
              <tr key={reg.id} className="hover:bg-blue-50/30 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                      {reg.nombre.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="text-sm font-medium text-slate-700">{reg.nombre}</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className="text-xs text-slate-500">{reg.rol}</span>
                </td>
                <td className="px-8 py-5">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    reg.tipo === 'Entrada' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                  }`}>
                    {reg.tipo === 'Entrada' ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                    {reg.tipo}
                  </div>
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-slate-800">{reg.hora}</span>
                    <span className="text-[9px] text-slate-300 font-mono">{reg.dispositivo}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Indicador de Trazabilidad */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-[10px] text-slate-400 uppercase tracking-widest">
          Certificación de Datos: SANSCE Blockchain-Style Ledger
        </p>
        <button className="text-blue-600 text-xs font-semibold flex items-center gap-1 hover:underline">
          EXPORTAR REPORTE DE NÓMINA <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}