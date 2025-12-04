"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  // 🔒 REGLA DE SEGURIDAD:
  // Si estamos en el Portal de Pacientes, NO mostramos el menú interno.
  // También ocultamos el menú en el Login si tuvieras uno.
  if (pathname.startsWith("/portal") || pathname === "/login") {
    return null;
  }

  // Definimos los enlaces del sistema
  const menuItems = [
    { name: "Inicio", href: "/" },
    { name: "Agenda", href: "/agenda" },
    { name: "Directorio", href: "/pacientes" },
    { name: "Caja", href: "/finanzas" },
    { name: "Inventario", href: "/inventarios" },
    { name: "Reportes", href: "/reportes" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-sm h-16 px-4 md:px-8 flex items-center justify-between">
      
      {/* 1. LOGO (Izquierda) */}
      <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <Image 
            src="/logo-sansce.png" 
            alt="SANSCE" 
            width={100} 
            height={35} 
            className="object-contain"
            priority
        />
      </Link>

      {/* 2. ENLACES (Centro - Visible en pantallas medianas para arriba) */}
      <div className="hidden md:flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100">
        {menuItems.map((item) => {
          // Detectamos si este enlace es el activo actualmente
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                isActive 
                  ? "bg-white text-blue-600 shadow-sm border border-slate-100" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </div>

      {/* 3. USUARIO / PERFIL (Derecha) */}
      <div className="flex items-center gap-3">
        <div className="hidden md:flex flex-col items-end">
            <span className="text-xs font-bold text-slate-700">Admin</span>
            <span className="text-[10px] text-slate-400">SANSCE Clínica</span>
        </div>
        <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-200">
            A
        </div>
      </div>
    </nav>
  );
}