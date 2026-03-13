// ARCHIVO: app/reportes/page.tsx
"use client";
import ProtectedRoute from "../../components/ProtectedRoute";
import Link from "next/link";
import { toast } from "sonner";

// Definimos la lista de reportes solicitados
const reportesMenu = [
  { id: 'b', titulo: "Cambio de Turno", icono: "🔄", ruta: "/reportes/cambio-turno", desc: "Bitácora de novedades" },
  { id: 'c', titulo: "Ingresos SANSCE", icono: "🏥", ruta: "/reportes/ingresos-sansce", desc: "Reporte diario global" },
  { id: 'd', titulo: "Ingresos Profesionales", icono: "👨‍⚕️", ruta: "/reportes/ingresos-medicos", desc: "Esquema de renta/comisión" },
  { id: 'e', titulo: "Caja Chica", icono: "💸", ruta: "/reportes/caja-chica", desc: "Control de gastos menores" },
  { id: 'f', titulo: "Origen Pacientes", icono: "📢", ruta: "/reportes/marketing", desc: "Reporte semanal marketing" },
  { id: 'h', titulo: "Conciliación Lab", icono: "🤝", ruta: "/reportes/conciliacion-lab", desc: "Cruce mensual de estudios" },
  { id: 'i', titulo: "Corte Factura Global", icono: "🧾", ruta: "/reportes/factura-global", desc: "Cierre de mes fiscal" },
  { id: 'j', titulo: "Archivo Muerto", icono: "🗄️", ruta: "/reportes/archivo-muerto", desc: "Expedientes inactivos" },
  { id: 'k', titulo: "Radar Estratégico", icono: "📡", ruta: "/reportes/radar", desc: "Retención y pacientes en riesgo" },
  { id: 'm', titulo: "Respaldo Google", icono: "☁️", ruta: "/reportes/google-contacts", desc: "Exportar a contactos.google.com" },
];

export default function PanelReportesPage() {
  
  const handleClick = (e: React.MouseEvent, reporte: any) => {
    // Si necesitas bloquear algo temporalmente, úsalo aquí.
    // Por ahora, dejamos pasar a todo.
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          
          {/* HEADER CON SUB-NAVBAR M8 */}
          <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Centro de Inteligencia y Eficacia</h1>
              <p className="text-slate-500 text-sm">Módulo 8: Inteligencia de Procesos y Estrategia.</p>
            </div>
            
            <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
              <Link href="/finanzas" className="text-slate-600 hover:bg-slate-100 px-4 py-2 rounded-lg text-xs font-bold transition-all">📊 Eficacia Operativa</Link>
              <Link href="/reportes" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md">📈 Inteligencia y Estrategia</Link>
              <Link href="/finanzas/gastos" className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-xs font-bold transition-all">🧾 Flujo de Gastos</Link>
            </div>
          </div>
          
          {/* Grid de Reportes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {reportesMenu.map((repo) => (
              <Link 
                key={repo.id} 
                href={repo.ruta}
                onClick={(e) => handleClick(e, repo)}
                className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition-all group flex flex-col h-full relative overflow-hidden"
              >
                {/* Etiqueta especial para el Radar */}
                {repo.id === 'k' && (
                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                        NUEVO
                    </div>
                )}

                <div className="flex justify-between items-start mb-4">
                  <span className="text-4xl bg-slate-50 p-3 rounded-lg group-hover:scale-110 transition-transform duration-300">
                    {repo.icono}
                  </span>
                  <span className="text-xs font-bold text-slate-300">#{repo.id.toUpperCase()}</span>
                </div>
                
                <h3 className="font-bold text-slate-800 text-lg mb-2 group-hover:text-blue-600 transition-colors">
                  {repo.titulo}
                </h3>
                <p className="text-sm text-slate-500 flex-1">
                  {repo.desc}
                </p>
                
                <div className="mt-4 pt-4 border-t border-slate-50 text-xs font-bold text-blue-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Acceder al reporte <span>→</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Sección de KPIs Rápidos */}
          <div className="mt-12 pt-8 border-t border-slate-200">
            <h2 className="text-lg font-bold text-slate-700 mb-4">Resumen Ejecutivo Rápido</h2>
            <div className="bg-slate-100 rounded-lg p-8 text-center border border-dashed border-slate-300 text-slate-500">
               El resumen gráfico se mostrará aquí cuando la cuota de datos se restablezca.
            </div>
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}