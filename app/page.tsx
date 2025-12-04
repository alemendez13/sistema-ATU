"use client"; // Aseguramos que sea cliente si usa hooks o interactividad
import Link from "next/link"; // <--- ESTO FALTABA
import ProtectedRoute from "../components/ProtectedRoute";

export default function Home() {
  return (
    <ProtectedRoute>
    <div className="min-h-screen bg-slate-100 p-6 flex justify-center">
      <div className="w-full max-w-6xl">
        
        {/* ENCABEZADO */}
        <header className="mb-10 text-center">
          <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight">
            SANSCE <span className="text-blue-600">/</span> ATU
          </h1>
          <p className="text-slate-500 text-lg mt-2 font-medium">Sistema Administrativo de Atención al Ususario</p>
          
          <div className="inline-block mt-4 bg-white px-6 py-2 rounded-full shadow-sm border border-slate-200">
            <p className="text-sm font-bold text-slate-600">
              📅 Hoy es {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </header>

        {/* 1. MENÚ DE ACCESOS RÁPIDOS */}
        <div className="mt-10">
          <h2 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-300 pb-2">
            Módulos de Atención
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6"> {/* Cambiado a 6 columnas para que quepa el nuevo */}
            
            {/* Botón 1 */}
            <Link href="/pacientes" className="block bg-white p-6 rounded-xl shadow-sm hover:shadow-lg transition-all border border-slate-200 hover:-translate-y-1">
              <div className="text-3xl mb-3 bg-blue-50 w-12 h-12 flex items-center justify-center rounded-lg text-blue-600">
                📂
              </div>
              <h3 className="font-bold text-slate-800">Directorio</h3>
              <p className="text-xs text-slate-500 mt-1">Expedientes y Pacientes</p>
            </Link>

            {/* Botón 2 */}
            <Link href="/pacientes/registro" className="block bg-white p-6 rounded-xl shadow-sm hover:shadow-lg transition-all border border-slate-200 hover:-translate-y-1">
              <div className="text-3xl mb-3 bg-green-50 w-12 h-12 flex items-center justify-center rounded-lg text-green-600">
                👤
              </div>
              <h3 className="font-bold text-slate-800">Nuevo Paciente</h3>
              <p className="text-xs text-slate-500 mt-1">Admisión y Cobro</p>
            </Link>

            {/* Botón 3 */}
            <Link href="/agenda" className="block bg-white p-6 rounded-xl shadow-sm hover:shadow-lg transition-all border border-slate-200 hover:-translate-y-1">
              <div className="text-3xl mb-3 bg-purple-50 w-12 h-12 flex items-center justify-center rounded-lg text-purple-600">
                📅
              </div>
              <h3 className="font-bold text-slate-800">Agenda</h3>
              <p className="text-xs text-slate-500 mt-1">Citas y Horarios</p>
            </Link>

            {/* Botón 4 */}
            <Link href="/finanzas" className="block bg-white p-6 rounded-xl shadow-sm hover:shadow-lg transition-all border border-slate-200 hover:-translate-y-1">
              <div className="text-3xl mb-3 bg-yellow-50 w-12 h-12 flex items-center justify-center rounded-lg text-yellow-600">
                💰
              </div>
              <h3 className="font-bold text-slate-800">Caja</h3>
              <p className="text-xs text-slate-500 mt-1">Cobros y Cortes</p>
            </Link>

            {/* Botón 5 */}
            <Link href="/inventarios" className="block bg-white p-6 rounded-xl shadow-sm hover:shadow-lg transition-all border border-slate-200 hover:-translate-y-1">
              <div className="text-3xl mb-3 bg-orange-50 w-12 h-12 flex items-center justify-center rounded-lg text-orange-600">
                📦
              </div>
              <h3 className="font-bold text-slate-800">Almacén</h3>
              <p className="text-xs text-slate-500 mt-1">Stock Recepción</p>
            </Link>

            {/* Botón 6: PANEL DE REPORTES (Actualizado) */}
            <Link href="/reportes" className="block bg-white p-6 rounded-xl shadow-sm hover:shadow-lg transition-all border border-slate-200 hover:-translate-y-1 group">
              <div className="text-3xl mb-3 bg-indigo-50 w-12 h-12 flex items-center justify-center rounded-lg text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                📈
              </div>
              <h3 className="font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">Panel de Reportes</h3>
              <p className="text-xs text-slate-500 mt-1">Operativos y Financieros</p>
            </Link>

          </div>
        </div>

        <footer className="mt-20 text-center text-slate-400 text-xs border-t border-slate-200 pt-6">
          © 2025 Clínica SANSCE - Sistema Integral v1.0
        </footer>
      </div>
    </div>
    </ProtectedRoute>
  );
}