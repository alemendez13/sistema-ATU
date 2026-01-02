"use client";
import Link from "next/link";
import ProtectedRoute from "../components/ProtectedRoute";
import { 
  Settings, Target, GitBranch, HeartPulse, 
  Users, Package, Trash2, Landmark, ChevronRight 
} from "lucide-react";

export default function Home() {
  // Mantenemos tu lista maestra de módulos (ID 1 al 8)
  const modulos = [
    { id: 1, name: "Configuración", desc: "Cerebro GEC-FR-02 y Roles", icon: <Settings />, href: "/configuracion/conocimiento", color: "bg-slate-100 text-slate-600" },
    { id: 2, name: "Metas / Kpis", desc: "Misión, FODA y Metas", icon: <Target />, href: "/planeacion", color: "bg-blue-50 text-blue-600" },
    { id: 3, name: "Procesos y Mejora", desc: "Repositorio y Auditoría", icon: <GitBranch />, href: "/procesos", color: "bg-purple-50 text-purple-600" },
    { id: 4, name: "Control diario de Pacientes", desc: "Pacientes y Agenda Médica", icon: <HeartPulse />, href: "/pacientes", color: "bg-red-50 text-red-600" },
    { id: 5, name: "Capacitaciones y Expedientes", desc: "Control de RRHH", icon: <Users />, href: "/personal", color: "bg-orange-50 text-orange-600" },
    { id: 6, name: "Solicitudes de Materiales y Mantenimiento", desc: "Inventarios e Insumos", icon: <Package />, href: "/inventarios", color: "bg-amber-50 text-amber-600" },
    { id: 7, name: "Minuta", desc: "Limpieza e Infraestructura", icon: <Trash2 />, href: "/mantenimiento", color: "bg-emerald-50 text-emerald-600" },
    { id: 8, name: "Reportes", desc: "Caja, Reportes y Cobranza", icon: <Landmark />, href: "/finanzas", color: "bg-indigo-50 text-indigo-600" },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen p-2 md:p-6">
        <div className="max-w-[1400px] mx-auto"> {/* 👈 Aumentamos el ancho máximo para aprovechar el Sidebar */}
          <header className="mb-10">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">
              BIENVENIDO A SANSCE <span className="text-blue-600">OS</span>
            </h1>
            <p className="text-slate-500 font-medium italic">Gestión Integral de la Clínica</p>
          </header>

          {/* 👈 GRID AJUSTADO: 
              - 1 columna en móvil
              - 2 columnas en tablets
              - 3 columnas en laptops (lg)
              - 4 columnas en monitores ultra-wide (2xl) 
          */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {modulos.map((m) => (
              <Link 
                key={m.id} 
                href={m.href} 
                className="group bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-blue-200 transition-all hover:-translate-y-1 flex flex-col justify-between h-48"
              >
                <div>
                  <div className={`w-12 h-12 ${m.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    {m.icon}
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Módulo {m.id}</span>
                  <h3 className="text-xl font-bold text-slate-800 leading-tight">{m.name}</h3>
                </div>
                
                <div className="flex justify-between items-end mt-4">
                  <p className="text-xs text-slate-500 line-clamp-1">{m.desc}</p>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}