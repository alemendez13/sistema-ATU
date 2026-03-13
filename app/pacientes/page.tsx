// app/pacientes/page.tsx
import { getMensajesWhatsApp } from "@/lib/googleSheets";
import DirectoryClient from "@/components/pacientes/DirectoryClient";
import ProtectedRoute from "@/components/ProtectedRoute"; 
import Link from "next/link"; // ✅ ADICIÓN: Faltaba esta importación
import { Suspense } from "react";

export const dynamic = 'force-dynamic'; 

export default async function Page() {
  // 🛡️ PROTECCIÓN CONTRA CAÍDAS DE GOOGLE SHEETS
  let mensajes: any[] = [];
  try {
    mensajes = await getMensajesWhatsApp();
  } catch (error) {
    console.error("⚠️ Fallo al cargar mensajes de Sheets:", error);
    // Fallback silencioso para no romper la página
    mensajes = []; 
  }

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 pt-4">
        {/* SUB-NAVBAR CRM (M4) - NAV INTEGRADA */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-full md:w-fit">
          <Link href="/pacientes" className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md">📂 Directorio</Link>
          <Link href="/agenda" className="text-slate-500 hover:bg-slate-100 px-4 py-2 rounded-xl text-xs font-medium">📅 Agenda</Link>
          <Link href="/pacientes/registro" className="text-slate-500 hover:bg-slate-100 px-4 py-2 rounded-xl text-xs font-medium">➕ Registro</Link>
          
          <div className="w-px h-8 bg-slate-200 mx-1 hidden md:block"></div>

          {/* Accesos Sincronizados con Módulo de Inteligencia (M8) */}
          <Link href="/reportes/ingresos-sansce" className="text-slate-500 hover:bg-blue-50 hover:text-blue-600 px-4 py-2 rounded-xl text-xs font-medium transition-all">📊 Reporte Global</Link>
          <Link href="/reportes/conciliacion-lab" className="text-slate-500 hover:bg-blue-50 hover:text-blue-600 px-4 py-2 rounded-xl text-xs font-medium transition-all">🧪 Conciliación Lab</Link>
          <Link href="/reportes/factura-global" className="text-slate-500 hover:bg-blue-50 hover:text-blue-600 px-4 py-2 rounded-xl text-xs font-medium transition-all">📑 Factura Global</Link>

          <div className="w-px h-8 bg-slate-200 mx-1 hidden md:block"></div>

          {/* Nuevas Utilidades Solicitadas */}
          <Link href="/pacientes/profesionales" className="text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 px-4 py-2 rounded-xl text-xs font-medium">👨‍⚕️ Catálogo Médicos</Link>
          <Link href="/pacientes/express-wa" className="text-indigo-600 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl text-xs font-bold">📲 Autollenado WA</Link>
        </div>
        
        <DirectoryClient mensajesPredefinidos={mensajes} />
      </div>
    </ProtectedRoute>
  );
}