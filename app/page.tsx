//app/page.tsx
"use client";
import ProtectedRoute from "../components/ProtectedRoute";

export default function Home() {

  return (
    <ProtectedRoute>
      <div className="min-h-screen p-2 md:p-6 flex items-center justify-center">
        <div className="max-w-[1400px] mx-auto text-center">
          <header className="mb-10 animate-pulse">
            <h1 className="text-3xl md:text-4xl font-black text-slate-300 tracking-tighter uppercase">
              Dashboard en Remodelación
            </h1>
            <p className="text-slate-400 font-medium italic">SANSCE OS - Área de Diseño Estratégico</p>
          </header>
          <div className="py-20 border-2 border-dashed border-slate-200 rounded-3xl">
             <p className="text-slate-400">Utilice el menú lateral para navegar entre módulos.</p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}