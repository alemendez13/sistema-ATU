"use client";
import { useAuth } from "../hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Solo redirigimos si ya terminó de cargar Y NO hay usuario
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // CAMBIO CLAVE:
  // Solo mostramos el bloqueo si está cargando Y TODAVÍA NO TENEMOS USUARIO.
  // Si 'user' ya tiene datos (aunque sea "visitante"), dejamos que pase 
  // y el Sidebar se encargará de ocultarle los menús.
  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
            <p className="text-slate-500 animate-pulse mb-2">🔒 Verificando acceso...</p>
            {/* Opcional: Un botón de escape por si se traba */}
            <button 
                onClick={() => window.location.reload()} 
                className="text-xs text-blue-400 underline"
            >
                ¿Tarda mucho? Recargar
            </button>
        </div>
      </div>
    );
  }

  // Si no hay usuario (y ya cargó), devolvemos null mientras el useEffect redirige
  if (!user) return null;

  return <>{children}</>;
}