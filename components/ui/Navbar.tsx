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
  { name: "Configuración", href: "/configuracion/conocimiento" }, // El Cerebro
  { name: "Agenda Médica", href: "/agenda" },
  { name: "Directorio", href: "/pacientes" },
  { name: "Expediente Clínico", href: "/expedientes" },
  { name: "Metas / Kpis", href: "/planeacion" },
  { name: "Sistema de gestión", href: "/procesos" },
  { name: "Control Diario de Pacientes", href: "/pacientes" }, // Directorio y Agenda
  { name: "Recursos humanos", href: "/personal" },
  { name: "Solicitudes de materiales y mantenimiento", href: "/inventarios" }, // Almacén y Stock
  { name: "Minuta", href: "/mantenimiento" },
  { name: "Reportes", href: "/finanzas" }, // Caja y Reportes
];

  // Función de Cerrar Sesión (NUEVA)
  const handleLogout = async () => {
    try {
      // 1. Borramos la cookie "gafete" inmediatamente
      document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";

      // 2. Redirigimos visualmente antes de cerrar sesión en Firebase
      // Esto desmonta los componentes que tienen listeners activos
      router.push("/login");

      // 3. Cerramos la sesión en Firebase tras un breve delay
      setTimeout(async () => {
        await signOut(auth);
        toast.success("Sesión cerrada correctamente");
      }, 100);

    } catch (error) {
      console.error("Error al salir:", error);
      toast.error("Error al cerrar sesión");
    }
  };

  return (
    // 1. Agregamos md:pl-[260px] para que los iconos de perfil no choquen con el sidebar
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-sm h-16 px-4 md:px-8 md:pl-[280px] flex items-center justify-between">
      
      {/* 2. LOGO (Izquierda) */}
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

      {/* ❌ EL BLOQUE DE ENLACES CENTRALES (menuItems.map) SE ELIMINA ❌ */}

      {/* 3. USUARIO / PERFIL + SALIR (Derecha) */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-3">
            <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-slate-700">{user?.email?.split('@')[0] || "Admin"}</span>
                <span className="text-[10px] text-slate-400">SANSCE Clínica</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-200">
                {user?.email ? user.email[0].toUpperCase() : "A"}
            </div>
        </div>

        <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

        <button
          onClick={handleLogout}
          className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-red-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 007.5-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          Salir
        </button>
      </div>

      {/* 📱 MENÚ MÓVIL (Se mantiene igual por si entran desde celular) */}
      {/* ... (Aquí dejas el bloque del botón hamburguesa e isMenuOpen del original) ... */}
    </nav>
  );
}