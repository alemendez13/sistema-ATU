"use client";
import Link from "next/link";
import ProtectedRoute from "../components/ProtectedRoute";
import { 
  Settings, Target, GitBranch, HeartPulse, 
  Users, Package, Trash2, Landmark, ChevronRight 
} from "lucide-react";

export default function Home() {
  const modulos = [
    { id: 1, name: "Configuración", desc: "Cerebro GEC-FR-02 y Roles", icon: <Settings />, href: "/configuracion/conocimiento", color: "bg-slate-100 text-slate-600" },
    { id: 2, name: "Planeación", desc: "Misión, FODA y Metas", icon: <Target />, href: "/planeacion", color: "bg-blue-50 text-blue-600" },
    { id: 3, name: "Procesos y Mejora", desc: "Repositorio y Auditoría", icon: <GitBranch />, href: "/procesos", color: "bg-purple-50 text-purple-600" },
    { id: 4, name: "CRM Atn. Usuarios", desc: "Pacientes y Agenda Médica", icon: <HeartPulse />, href: "/pacientes", color: "bg-red-50 text-red-600" },
    { id: 5, name: "Manejo del Personal", desc: "Control de RRHH", icon: <Users />, href: "/personal", color: "bg-orange-50 text-orange-600" },
    { id: 6, name: "Materiales y Stock", desc: "Inventarios e Insumos", icon: <Package />, href: "/inventarios", color: "bg-amber-50 text-amber-600" },
    { id: 7, name: "Mantenimiento", desc: "Limpieza e Infraestructura", icon: <Trash2 />, href: "/mantenimiento", color: "bg-emerald-50 text-emerald-600" },
    { id: 8, name: "Admin. y Finanzas", desc: "Caja, Reportes y Cobranza", icon: <Landmark />, href: "/finanzas", color: "bg-indigo-50 text-indigo-600" },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <header className="mb-10">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">SANSCE <span className="text-blue-600">OS</span></h1>
            <p className="text-slate-500 font-medium italic">Sistema Operativo de Gestión Integral</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {modulos.map((m) => (
              <Link key={m.id} href={m.href} className="group bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl transition-all hover:-translate-y-1">
                <div className={`w-12 h-12 ${m.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  {m.icon}
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Módulo {m.id}</span>
                    <h3 className="text-lg font-bold text-slate-800 leading-tight">{m.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{m.desc}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}