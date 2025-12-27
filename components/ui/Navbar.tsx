"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image"; // ✅ RESTAURADO
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebase"; // Verifica que la ruta sea ../../../lib/firebase o la correcta según tu estructura
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuth"; // Hook de autenticación

interface UserData {
  email: string | null;
  uid?: string;
  }

export default function Navbar() {
  const { user } = useAuth() as { user: UserData | null };
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 🔒 REGLA DE SEGURIDAD (Misma lógica original):
  if (pathname.startsWith("/portal") || pathname === "/login") {
    return null;
  }

  // Definimos los enlaces del sistema (Igual al original)
  const menuItems = [
  { name: "Dashboard", href: "/" },
  { name: "M1: Sistema", href: "/configuracion/conocimiento" }, // El Cerebro
  { name: "M2: Estrategia", href: "/planeacion" },
  { name: "M3: Procesos", href: "/procesos" },
  { name: "M4: CRM", href: "/pacientes" }, // Directorio y Agenda
  { name: "M5: RRHH", href: "/personal" },
  { name: "M6: Insumos", href: "/inventarios" }, // Almacén y Stock
  { name: "M7: Mantto.", href: "/mantenimiento" },
  { name: "M8: Finanzas", href: "/finanzas" }, // Caja y Reportes
];

  // Función de Cerrar Sesión (NUEVA)
  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Sesión cerrada correctamente");
      router.push("/login");
    } catch (error) {
      console.error("Error al salir:", error);
      toast.error("Error al cerrar sesión");
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-sm h-16 px-4 md:px-8 flex items-center justify-between">
      
      {/* 1. LOGO (Izquierda) - ✅ RESTAURADO */}
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

      {/* 2. ENLACES (Centro) - ✅ RESTAURADO ESTILO "PASTILLA" */}
      <div className="hidden md:flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          
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

      {/* 3. USUARIO / PERFIL + SALIR (Derecha) - ✅ MEJORADO */}
      <div className="flex items-center gap-4">
        
        {/* Perfil (Original) */}
        <div className="hidden md:flex items-center gap-3">
            <div className="flex flex-col items-end">
                {/* Mostramos el email real si existe, si no "Admin" */}
                <span className="text-xs font-bold text-slate-700">{user?.email?.split('@')[0] || "Admin"}</span>
                <span className="text-[10px] text-slate-400">SANSCE Clínica</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-200">
                {user?.email ? user.email[0].toUpperCase() : "A"}
            </div>
        </div>

        {/* Separador Vertical */}
        <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

        {/* BOTÓN SALIR (NUEVO - Escritorio) */}
        <button
          onClick={handleLogout}
          className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-red-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          Salir
        </button>

        {/* BOTÓN HAMBURGUESA (Móvil) */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-md"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* 4. MENÚ MÓVIL DESPLEGABLE (NUEVO) */}
      {isMenuOpen && (
        <div className="absolute top-16 left-0 right-0 bg-white border-b border-slate-200 shadow-xl md:hidden flex flex-col p-4 space-y-2 z-50">
            {menuItems.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`block px-4 py-3 rounded-lg text-sm font-medium ${
                        pathname === item.href ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50"
                    }`}
                >
                    {item.name}
                </Link>
            ))}
            <div className="h-px bg-slate-100 my-2"></div>
            <button 
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 rounded-lg text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                Cerrar Sesión
            </button>
        </div>
      )}

    </nav>
  );
}