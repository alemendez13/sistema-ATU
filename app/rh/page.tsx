// app/rh/page.tsx
import React from 'react';
import Link from 'next/link';
import { Clock, Users, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function RHDashboard() {
  const tools = [
    { name: 'Reloj Checador', desc: 'Registro de asistencia con biometría', icon: <Clock />, href: '/rh/reloj', color: 'bg-blue-500' },
    { name: 'Expedientes', desc: 'Gestión de documentos y perfiles', icon: <Users />, href: '/rh/expedientes', color: 'bg-emerald-500' },
    { name: 'Incidencias', desc: 'Reporte de faltas, retardos y permisos', icon: <AlertTriangle />, href: '/rh/incidencias', color: 'bg-orange-500' },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-slate-800 uppercase tracking-tight">Módulo de Recursos Humanos</h1>
        <p className="text-slate-500">Gestión de capital humano y trazabilidad operativa.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <Link key={tool.name} href={tool.href} className="group p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className={`${tool.color} w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
              {tool.icon}
            </div>
            <h3 className="font-bold text-slate-800 mb-1">{tool.name}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{tool.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}