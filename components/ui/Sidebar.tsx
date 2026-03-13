// components/ui/Siderbar.tsx
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
  // 1. Iniciamos siempre en modo contraído (Enfoque Clínico)
  const [isCollapsed, setIsCollapsed] = useState(true);

  // 2. 🧠 EFECTO DE NAVEGACIÓN: Detecta cambio de módulo y contrae el sidebar automáticamente
  useEffect(() => {
    setIsCollapsed(true);
  }, [pathname]);

  // 3. 🧠 EFECTO DE ARQUITECTURA: Sincroniza el ancho con el resto del sistema
  useEffect(() => {
    const root = document.documentElement;
    const width = isCollapsed ? "80px" : "256px";
    root.style.setProperty('--sidebar-width', width);
  }, [isCollapsed]);

  // 🔒 Regla de seguridad
  if (pathname === "/login" || pathname.startsWith("/portal")) return null;

  // Función para alternar el sidebar
  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  // Lista maestra de módulos (Restauración Quirúrgica v4.2)
  const menuItems = [
    { id: 0, name: "Inicio", icon: <LayoutDashboard size={18} />, href: "/" },
    { id: 10, name: "Agenda Médica", icon: <Calendar size={18} />, href: "/agenda" },
    { id: 11, name: "Directorio Clínico", icon: <FolderOpen size={18} />, href: "/pacientes" },
    { id: 12, name: "Expediente Digital", icon: <FileText size={18} />, href: "/expedientes" },
    { id: 6, name: "Insumos e Inventario", icon: <Package size={18} />, href: "/inventarios" },
    { id: 7, name: "Cronograma Operativo", icon: <ClipboardList size={18} />, href: "/operacion/tareas" },
    { id: 8, name: "Reportes y Eficacia", icon: <BarChart3 size={18} />, href: "/reportes" },
    { id: 5, name: "Recursos Humanos", icon: <Users size={18} />, href: "/personal" },
    { id: 2, name: "Metas / KPIs", icon: <Target size={18} />, href: "/planeacion" },
    { id: 3, name: "Gestión y Auditoría", icon: <GitBranch size={18} />, href: "/configuracion/auditoria" },
    { id: 1, name: "Configuración General", icon: <Settings size={18} />, href: "/configuracion" },
  ];

  return (
    <aside 
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
      className={`fixed left-0 top-0 h-full bg-sansce-surface border-r border-sansce-border z-50 flex flex-col shadow-premium transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >

      {/* LOGO SANSCE */}
      <div className="h-20 flex items-center justify-center border-b border-sansce-bg overflow-hidden">
         <Link href="/" className="transition-transform hover:scale-105 duration-200">
            <Image 
              src="/logo-sansce.png" 
              alt="Logo" 
              width={isCollapsed ? 40 : 55} 
              height={isCollapsed ? 40 : 55} 
              className="object-contain"
              priority
            />
         </Link>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center rounded-lg transition-all duration-200 group relative ${
                isCollapsed ? "justify-center px-0 py-3 mx-2" : "gap-3 px-4 py-2.5"
              } ${
                isActive 
                  ? "bg-sansce-brand/5 text-sansce-brand" 
                  : "text-sansce-muted hover:bg-sansce-bg hover:text-sansce-text"
              }`}
            >
              {/* Indicador visual minimalista */}
              {isActive && (
                <div className="absolute left-0 w-0.5 h-6 bg-sansce-brand rounded-r-full" />
              )}

              <div className={`flex-shrink-0 transition-colors ${isActive ? "text-sansce-brand" : "text-sansce-muted group-hover:text-sansce-text"}`}>
                {item.icon}
              </div>
              
              {!isCollapsed && (
                <span className="text-[13px] font-semibold tracking-tight whitespace-nowrap overflow-hidden">
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