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

  // 🧠 LIMPIEZA SANSCE: Eliminamos menuItems y variables no usadas para evitar errores de VS Code

  // Función de Cerrar Sesión MEJORADA
  const handleLogout = async () => {
    try {
      document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
      window.localStorage.clear(); 
      await signOut(auth);
      window.location.href = "/login"; 
      toast.success("Sesión cerrada correctamente");
    } catch (error) {
      console.error("Error al salir:", error);
      toast.error("Error al cerrar sesión");
    }
  };

  return (
    <nav 
      className="fixed top-0 right-0 z-30 bg-sansce-surface/80 backdrop-blur-md border-b border-sansce-border shadow-premium h-16 px-6 md:px-10 transition-all duration-300 ease-in-out flex items-center justify-end"
      style={{ left: 'var(--sidebar-width, 256px)' }}
    >
      
      {/* CONTENEDOR DE USUARIO PREMIUM */}
      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-4">
            <div className="flex flex-col items-end leading-tight">
                <span className="text-[13px] font-semibold text-sansce-text uppercase tracking-tight">
                  {user?.email?.split('@')[0] || "Director"}
                </span>
                <span className="text-[10px] font-medium text-sansce-muted tracking-wider uppercase">
                  SANSCE OS Admin
                </span>
            </div>
            
            {/* Avatar Minimalista */}
            <div className="h-9 w-9 rounded-full bg-sansce-bg border border-sansce-border flex items-center justify-center shadow-sm">
                <span className="text-xs font-bold text-sansce-brand">
                  {user?.email ? user.email[0].toUpperCase() : "D"}
                </span>
            </div>
        </div>

        {/* Divisor Quirúrgico */}
        <div className="h-4 w-px bg-sansce-border hidden md:block"></div>

        {/* Botón Salir Estilizado */}
        <button
          onClick={handleLogout}
          className="group flex items-center gap-2 text-[11px] font-bold text-sansce-muted hover:text-status-error transition-all duration-200 uppercase tracking-widest"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 007.5-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          Salir
        </button>
      </div>
    </nav>
  );
}