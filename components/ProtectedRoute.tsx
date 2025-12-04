"use client";
import { useAuth } from "../hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Si ya terminamos de cargar y NO hay usuario...
    if (!loading && !user) {
      // ...lo mandamos a la pantalla de entrada (Login)
      router.push("/login");
    }
  }, [user, loading, router]);

  // Mientras revisamos, mostramos un mensaje de espera
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 animate-pulse">🔒 Verificando acceso...</p>
      </div>
    );
  }

  // Si no hay usuario, no mostramos nada (mientras se hace la redirección)
  if (!user) return null;

  // Si todo está bien, mostramos el contenido protegido (la página real)
  return <>{children}</>;
}