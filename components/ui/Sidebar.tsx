"use client";
import Link from "next/link";
import Image from "next/image"; // ✅ Agregado para el Logo
import { usePathname } from "next/navigation";
import { 
  Settings, Target, GitBranch, HeartPulse, 
  Users, Package, ClipboardList, BarChart3, 
  LayoutDashboard, Calendar, FolderOpen, FileText 
} from "lucide-react";

import { useState, useEffect } from "react"; 
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 🧠 EFECTO QUIRÚRGICO: Notifica al Layout el ancho actual
  useEffect(() => {
    const root = document.documentElement;
    if (isCollapsed) {
      root.style.setProperty('--sidebar-width', '80px');
    } else {
      root.style.setProperty('--sidebar-width', '256px');
    }
  }, [isCollapsed]);

  // 🔒 Regla de seguridad
  if (pathname === "/login" || pathname.startsWith("/portal")) return null;

  // Función para alternar el sidebar
  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  // Lista maestra de módulos (se mantiene igual...)
  const menuItems = [
    { id: 0, name: "Inicio (Dashboard)", icon: <LayoutDashboard size={20} />, href: "/", color: "text-slate-500" },
    { id: 1, name: "Configuración", icon: <Settings size={20} />, href: "/configuracion/conocimiento", color: "text-slate-600" },   
    { id: 10, name: "Agenda Médica", icon: <Calendar size={20} />, href: "/agenda", color: "text-blue-600" }, // ✨ Nuevo acceso directo
    { id: 11, name: "Directorio", icon: <FolderOpen size={20} />, href: "/pacientes", color: "text-emerald-600" }, // ✨ Nuevo acceso directo
    { id: 2, name: "Metas / Kpis", icon: <Target size={20} />, href: "/planeacion", color: "text-blue-600" },
    { id: 3, name: "Sistema de gestión", icon: <GitBranch size={20} />, href: "/procesos", color: "text-purple-600" },
    { id: 4, name: "Control Diario de Pacientes", icon: <HeartPulse size={20} />, href: "/pacientes", color: "text-red-600" },
    { id: 12, name: "Expediente Clínico", icon: <FileText size={20} />, href: "/expedientes", color: "text-indigo-600" }, // 🩺 Preparación Módulo
    { id: 5, name: "Recursos humanos", icon: <Users size={20} />, href: "/personal", color: "text-orange-600" },
    { id: 6, name: "Solicitud de Insumos y Mantenimiento", icon: <Package size={20} />, href: "/inventarios", color: "text-amber-600" },
    { id: 7, name: "Minuta", icon: <ClipboardList size={20} />, href: "/mantenimiento", color: "text-emerald-600" }, // ✅ Icono corregido
    { id: 8, name: "Reportes", icon: <BarChart3 size={20} />, href: "/finanzas", color: "text-indigo-600" }, // ✅ Icono corregido
  ];

  return (
    <aside 
      className={`fixed left-0 top-0 h-full bg-white border-r border-slate-200 z-50 flex flex-col shadow-xl transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Botón de Toggle (El "Gatillo" para ocultar) */}
      <button 
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 bg-white border border-slate-200 rounded-full p-1 shadow-sm hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-all z-50"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* LOGO SANSCE: Isotipo maximizado para impacto visual */}
      <div className="h-24 flex items-center justify-center border-b border-slate-50 overflow-hidden bg-white">
         <Link href="/" className="transition-transform hover:scale-105 active:scale-95 duration-200">
            <Image 
              src="/logo-sansce.png" 
              alt="SANSCE Logo" 
              width={68} 
              height={68} 
              className="object-contain"
              priority
            />
         </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.id}
              href={item.href}
              title={isCollapsed ? item.name : ""} // Muestra el nombre al pasar el mouse si está cerrado
              className={`flex items-center rounded-lg transition-all duration-200 group relative ${
                isCollapsed ? "justify-center px-0 py-3 mx-2" : "gap-3 px-4 py-2.5"
              } ${
                isActive 
                  ? "bg-blue-50 text-blue-600 border border-blue-100/40 shadow-sm" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {/* Indicador visual lateral (Línea azul fina) */}
              {isActive && (
                <div className="absolute left-0 w-1 h-5 bg-blue-600 rounded-r-full" />
              )}

              <div className={`flex-shrink-0 transition-colors ${isActive ? "text-blue-600" : "text-slate-400 group-hover:text-blue-500"}`}>
                {item.icon}
              </div>
              
              {!isCollapsed && (
                <span className="text-sm font-medium whitespace-nowrap overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300">
                  {item.name}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer del Sidebar: Limpieza dinámica en modo colapsado */}
      <div className="p-4 border-t border-slate-50">
          {!isCollapsed ? (
            <div className="bg-slate-50/50 p-3 rounded-xl text-center animate-in fade-in zoom-in duration-300">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SANSCE APP</p>
            </div>
          ) : (
            <div className="flex justify-center py-2">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-200" />
            </div>
          )}
      </div>
    </aside>
  );
}