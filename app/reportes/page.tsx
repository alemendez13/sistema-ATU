// ARCHIVO: app/reportes/page.tsx
"use client";
import ProtectedRoute from "../../components/ProtectedRoute";
import Link from "next/link";
import { toast } from "sonner";
// 🛰️ SANSCE OS: Inyección del motor de cobranza en vivo
import CorteDia from "../../components/finanzas/CorteDia";

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
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Centro de Inteligencia</h1>
              <p className="text-slate-500 text-sm">Módulo 8: Auditoría y Estrategia.</p>
            </div>
            
            <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
              {/* Accesos Directos Operativos - SANSCE OS */}
              <Link href="/finanzas" className="text-slate-600 hover:bg-slate-100 px-3 py-2 rounded-lg text-[10px] font-black uppercase transition-all border border-transparent hover:border-slate-200">💰 Caja</Link>
              
              <div className="h-6 w-[1px] bg-slate-200 self-center mx-1" /> {/* Separador visual */}

              <Link href="/reportes/cambio-turno" className="text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg text-[10px] font-black uppercase transition-all border border-blue-100">🔄 Turno</Link>
              <Link href="/reportes/ingresos-sansce" className="text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg text-[10px] font-black uppercase transition-all border border-blue-100">🏥 Sansce</Link>
              <Link href="/reportes/ingresos-medicos" className="text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg text-[10px] font-black uppercase transition-all border border-blue-100">👨‍⚕️ Prof.</Link>
              <Link href="/reportes/caja-chica" className="text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg text-[10px] font-black uppercase transition-all border border-blue-100">💸 Chica</Link>
              <Link href="/reportes/conciliacion-lab" className="text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg text-[10px] font-black uppercase transition-all border border-blue-100">🧪 Lab</Link>
              <Link href="/reportes/archivo-muerto" className="text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg text-[10px] font-black uppercase transition-all border border-blue-100">🗄️ Archivo</Link>

              <div className="h-6 w-[1px] bg-slate-200 self-center mx-1" /> {/* Separador visual */}

              <Link href="/finanzas/gastos" className="text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg text-[10px] font-black uppercase transition-all border border-transparent hover:border-red-100">💸 Gastos</Link>
            </div>
          </div>
          
          {/* Dashboard Operativo - Monitor de Cobranza en Tiempo Real */}
          <div className="animate-in fade-in zoom-in-95 duration-700">
            <CorteDia />
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