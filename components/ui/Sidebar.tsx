"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Settings, Target, GitBranch, HeartPulse, 
  Users, Package, Trash2, Landmark, LayoutDashboard 
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  // 🔒 Regla de seguridad: Ocultar en Login o Portales externos
  if (pathname === "/login" || pathname.startsWith("/portal")) return null;

  // Lista maestra de módulos extraída de tu Dashboard (page.tsx)
  const menuItems = [
    { id: 0, name: "Inicio (Dashboard)", icon: <LayoutDashboard size={20} />, href: "/", color: "text-slate-500" },
    { id: 1, name: "M1: Sistema", icon: <Settings size={20} />, href: "/configuracion/conocimiento", color: "text-slate-600" },
    { id: 2, name: "M2: Estrategia", icon: <Target size={20} />, href: "/planeacion", color: "text-blue-600" },
    { id: 3, name: "M3: Procesos", icon: <GitBranch size={20} />, href: "/procesos", color: "text-purple-600" },
    { id: 4, name: "M4: CRM", icon: <HeartPulse size={20} />, href: "/pacientes", color: "text-red-600" },
    { id: 5, name: "M5: RRHH", icon: <Users size={20} />, href: "/personal", color: "text-orange-600" },
    { id: 6, name: "M6: Insumos", icon: <Package size={20} />, href: "/inventarios", color: "text-amber-600" },
    { id: 7, name: "M7: Mantto.", icon: <Trash2 size={20} />, href: "/mantenimiento", color: "text-emerald-600" },
    { id: 8, name: "M8: Finanzas", icon: <Landmark size={20} />, href: "/finanzas", color: "text-indigo-600" },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-white border-r border-slate-200 z-40 hidden md:flex flex-col shadow-sm">
      {/* Espaciador para no tapar el logo del Navbar superior si se mantiene */}
      <div className="h-16 flex items-center px-6 border-b border-slate-50">
         <span className="text-xs font-black text-blue-600 tracking-widest uppercase">Menú Principal</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          // Lógica de estado activo (tomada de tu Navbar.tsx)
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
          </div>
      </div>
    </aside>
  );
}