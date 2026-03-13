//app/page.tsx
"use client";
import ProtectedRoute from "../components/ProtectedRoute";
// 🩺 Importación de iconos necesaria al inicio del archivo
  import { TrendingUp, Calendar, Users, CheckCircle2, ArrowUpRight } from "lucide-react";

export default function Home() {

  return (
    <ProtectedRoute>
      <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700">
        
        {/* CABECERA ESTRATÉGICA */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-sansce-border pb-6">
          <div>
            <h1 className="text-2xl font-bold text-sansce-text tracking-tight uppercase">Centro de Mando</h1>
            <p className="text-sm text-sansce-muted">Resumen operativo y financiero en tiempo real.</p>
          </div>
          <div className="flex items-center gap-2 bg-sansce-brand/5 px-3 py-1.5 rounded-full border border-sansce-brand/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-status-success"></span>
            </span>
            <span className="text-[10px] font-bold text-sansce-brand uppercase tracking-widest">Sistema Activo</span>
          </div>
        </header>

        {/* GRID DE KPIs PREMIUM */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Tarjeta 1: Ventas */}
          <div className="bg-sansce-surface p-6 rounded-2xl border border-sansce-border shadow-premium group hover:border-sansce-brand/30 transition-all cursor-default">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-50 rounded-lg text-sansce-brand">
                <TrendingUp size={20} />
              </div>
              <span className="text-[10px] font-bold text-status-success bg-status-success/10 px-2 py-1 rounded-md flex items-center gap-1">
                +12% <ArrowUpRight size={10} />
              </span>
            </div>
            <p className="text-xs font-semibold text-sansce-muted uppercase tracking-wider mb-1">Ingresos Hoy</p>
            <h3 className="text-2xl font-bold text-sansce-text">$0</h3>
          </div>

          {/* Tarjeta 2: Citas */}
          <div className="bg-sansce-surface p-6 rounded-2xl border border-sansce-border shadow-premium group hover:border-sansce-brand/30 transition-all cursor-default">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                <Calendar size={20} />
              </div>
            </div>
            <p className="text-xs font-semibold text-sansce-muted uppercase tracking-wider mb-1">Citas Agendadas</p>
            <h3 className="text-2xl font-bold text-sansce-text">18</h3>
          </div>

          {/* Tarjeta 3: Pacientes */}
          <div className="bg-sansce-surface p-6 rounded-2xl border border-sansce-border shadow-premium group hover:border-sansce-brand/30 transition-all cursor-default">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <Users size={20} />
              </div>
            </div>
            <p className="text-xs font-semibold text-sansce-muted uppercase tracking-wider mb-1">Nuevos Pacientes</p>
            <h3 className="text-2xl font-bold text-sansce-text">04</h3>
          </div>

          {/* Tarjeta 4: Operación */}
          <div className="bg-sansce-surface p-6 rounded-2xl border border-sansce-border shadow-premium group hover:border-sansce-brand/30 transition-all cursor-default">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                <CheckCircle2 size={20} />
              </div>
            </div>
            <p className="text-xs font-semibold text-sansce-muted uppercase tracking-wider mb-1">Tareas Cumplidas</p>
            <h3 className="text-2xl font-bold text-sansce-text">85%</h3>
          </div>

        </div>

        {/* ÁREA DE ACCESO RÁPIDO */}
        <div className="py-10 border-2 border-dashed border-sansce-border rounded-3xl flex flex-col items-center justify-center bg-sansce-bg/50">
           <p className="text-sansce-muted text-sm font-medium">Panel de visualización estratégica configurado.</p>
           <p className="text-[10px] text-sansce-muted/60 uppercase tracking-widest mt-2">SANSCE OS v4.0 Professional Edition</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}