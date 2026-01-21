"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Settings, Target, GitBranch, HeartPulse, 
  Users, Package, ClipboardList, BarChart3, 
  LayoutDashboard, Calendar, FolderOpen, FileText 
} from "lucide-react";
// Importamos el hook modificado que ahora trae el rol
import { useAuth } from "../../hooks/useAuth"; 

// Definimos interfaz para TypeScript para evitar errores de tipo
interface UserData {
  rol?: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth() as { user: UserData | null };
  
  // Si no hay rol cargado aún, asumimos "visitante" para proteger
  const currentRole = user?.rol || "visitante";

  // 🔒 Regla de seguridad: Ocultar en Login o Portales externos
  if (pathname === "/login" || pathname.startsWith("/portal")) return null;

  // MATRIZ DE GOBIERNO DE DATOS
  // Aquí definimos quién ve qué basándonos en tu documentación normativa
  const menuItems = [
    { 
      id: 0, 
      name: "Inicio (Dashboard)", 
      icon: <LayoutDashboard size={20} />, 
      href: "/", 
      color: "text-slate-500",
      allowedRoles: ["admin", "recepcion", "medico"] 
    },
    { 
      id: 1, 
      name: "Configuración", 
      icon: <Settings size={20} />, 
      href: "/configuracion/conocimiento", 
      color: "text-slate-600",
      allowedRoles: ["admin"] // EXCLUSIVO: Solo quien gestiona el Cerebro ISO [cite: 5]
    },   
    { 
      id: 10, 
      name: "Agenda Médica", 
      icon: <Calendar size={20} />, 
      href: "/agenda", 
      color: "text-blue-600",
      allowedRoles: ["admin", "recepcion", "medico"]
    },
    { 
      id: 11, 
      name: "Directorio", 
      icon: <FolderOpen size={20} />, 
      href: "/pacientes", 
      color: "text-emerald-600",
      allowedRoles: ["admin", "recepcion", "medico"]
    },
    { 
      id: 2, 
      name: "Metas / Kpis", 
      icon: <Target size={20} />, 
      href: "/planeacion", 
      color: "text-blue-600",
      allowedRoles: ["admin"] // Estratégico (MG/PMR) [cite: 5]
    },
    { 
      id: 3, 
      name: "Sistema de gestión", 
      icon: <GitBranch size={20} />, 
      href: "/procesos", 
      color: "text-purple-600",
      allowedRoles: ["admin"] // Estratégico
    },
    { 
      id: 4, 
      name: "Control Diario", 
      icon: <HeartPulse size={20} />, 
      href: "/pacientes", 
      color: "text-red-600",
      allowedRoles: ["admin", "recepcion", "medico"] // Operativo diario
    },
    { 
      id: 12, 
      name: "Expediente Clínico", 
      icon: <FileText size={20} />, 
      href: "/expedientes", 
      color: "text-indigo-600", 
      allowedRoles: ["admin", "medico"] // Recepción no debería ver expediente clínico completo (Privacidad)
    }, 
    { 
      id: 5, 
      name: "Recursos humanos", 
      icon: <Users size={20} />, 
      href: "/personal", 
      color: "text-orange-600",
      allowedRoles: ["admin"] // Sensible (RHU) [cite: 5]
    },
    { 
      id: 6, 
      name: "Insumos y Mto.", 
      icon: <Package size={20} />, 
      href: "/inventarios", 
      color: "text-amber-600",
      allowedRoles: ["admin", "recepcion"] // Operativo (GEM/IYM) [cite: 5]
    },
    { 
      id: 7, 
      name: "Minuta", 
      icon: <ClipboardList size={20} />, 
      href: "/mantenimiento", 
      color: "text-emerald-600",
      allowedRoles: ["admin", "recepcion"] // Comunicación operativa (COM) [cite: 5]
    }, 
    { 
      id: 8, 
      name: "Reportes", 
      icon: <BarChart3 size={20} />, 
      href: "/finanzas", 
      color: "text-indigo-600",
      allowedRoles: ["admin"] // Financiero (FIN) [cite: 5]
    }, 
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-white border-r border-slate-200 z-40 hidden md:flex flex-col shadow-sm">
      {/* Espaciador */}
      <div className="h-16 flex items-center px-6 border-b border-slate-50">
         <span className="text-xs font-black text-blue-600 tracking-widest uppercase">Menú Principal</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          // FILTRO DE SEGURIDAD: Si el rol del usuario no está en la lista permitida, no renderizamos el botón
          if (!item.allowedRoles.includes(currentRole)) return null;

          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all group ${
                isActive 
                  ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <div className={`transition-transform group-hover:scale-110 ${isActive ? "text-blue-600" : item.color}`}>
                {item.icon}
              </div>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer del Sidebar */}
      <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 p-3 rounded-lg text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">SANSCE OS v2.0</p>
              <p className="text-[9px] text-slate-300 mt-1">Rol: {currentRole.toUpperCase()}</p>
          </div>
      </div>
    </aside>
  );
}