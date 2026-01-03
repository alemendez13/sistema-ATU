"use client";
import Link from "next/link";
import ProtectedRoute from "../components/ProtectedRoute";
import { 
  Settings, Target, GitBranch, HeartPulse, 
  Users, Package, ClipboardList, BarChart3,
  Calendar, FolderOpen, FileText
} from "lucide-react";

export default function Home() {
  const modulos = [
    { id: 1, name: "Configuración", desc: "Cerebro GEC-FR-02 y Roles", icon: <Settings />, href: "/configuracion/conocimiento", color: "bg-slate-100 text-slate-600" },
    { id: 10, name: "Agenda Médica", desc: "Gestión de citas y tiempos", icon: <Calendar />, href: "/agenda", color: "bg-blue-50 text-blue-600" },
    { id: 11, name: "Directorio", desc: "Base de datos de pacientes", icon: <FolderOpen />, href: "/pacientes", color: "bg-emerald-50 text-emerald-600" }, 
    { id: 2, name: "Metas / Kpis", desc: "Misión, FODA y Metas", icon: <Target />, href: "/planeacion", color: "bg-blue-50 text-blue-600" },
    { id: 3, name: "Sistema de gestión", desc: "Repositorio y Auditoría", icon: <GitBranch />, href: "/procesos", color: "bg-purple-50 text-purple-600" },
    { id: 4, name: "Control diario de Pacientes", desc: "Pacientes y Agenda Médica", icon: <HeartPulse />, href: "/pacientes", color: "bg-red-50 text-red-600" },
    { id: 12, name: "Expediente Clínico", desc: "Historia médica y evolución", icon: <FileText />, href: "/expedientes", color: "bg-indigo-50 text-indigo-600" },
    { id: 5, name: "Recursos humanos", desc: "Control de RRHH", icon: <Users />, href: "/personal", color: "bg-orange-50 text-orange-600" },
    { id: 6, name: "Solicitudes de Materiales y Mantenimiento", desc: "Inventarios e Insumos", icon: <Package />, href: "/inventarios", color: "bg-amber-50 text-amber-600" },
    // 2. 👇 Nuevos iconos para los módulos 7 y 8
    { id: 7, name: "Minuta", desc: "Limpieza e Infraestructura", icon: <ClipboardList />, href: "/mantenimiento", color: "bg-emerald-50 text-emerald-600" },
    { id: 8, name: "Reportes", desc: "Caja, Reportes y Cobranza", icon: <BarChart3 />, href: "/finanzas", color: "bg-indigo-50 text-indigo-600" },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen p-2 md:p-6">
        <div className="max-w-[1400px] mx-auto">
          <header className="mb-10 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase">
              Gestion Integral de la Clínica
            </h1>
          </header>

          {/* Grid configurado con items-stretch para uniformidad de altura */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 items-stretch">
            {modulos.map((m) => (
              <Link 
                key={m.id} 
                href={m.href} 
                // 3. 👇 Ajustes de centrado y eliminación de altura fija (h-48)
                className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all hover:-translate-y-1 flex flex-col items-center text-center h-full justify-center"
              >
                <div className="flex flex-col items-center w-full mb-4">
                  {/* Icono centrado */}
                  <div className={`w-14 h-14 ${m.color} rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm`}>
                    {m.icon}
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Módulo {m.id}</span>
                  
                  {/* Título centrado con text-balance para evitar cortes feos */}
                  <h3 className="text-lg lg:text-xl font-bold text-slate-800 leading-tight w-full text-balance">
                    {m.name}
                  </h3>
                </div>
                
                {/* Descripción centrada y sin icono de flecha lateral */}
                <p className="text-xs text-slate-500 px-4">{m.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}