// app/pacientes/page.tsx
import { getMensajesWhatsApp } from "@/lib/googleSheets";
import DirectoryClient from "@/components/pacientes/DirectoryClient";
import ProtectedRoute from "@/components/ProtectedRoute"; 
import Link from "next/link"; // ✅ ADICIÓN: Faltaba esta importación

export const dynamic = 'force-dynamic'; 

export default async function Page() {
  const mensajes = await getMensajesWhatsApp();

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 pt-4">
        {/* SUB-NAVBAR CRM (M4) - NAV INTEGRADA */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-full md:w-fit">
          <Link href="/pacientes" className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md">📂 Directorio</Link>
          <Link href="/agenda" className="text-slate-500 hover:bg-slate-100 px-4 py-2 rounded-xl text-xs font-medium">📅 Agenda</Link>
          <Link href="/pacientes/registro" className="text-slate-500 hover:bg-slate-100 px-4 py-2 rounded-xl text-xs font-medium">➕ Registro</Link>
          
          <div className="w-px h-8 bg-slate-200 mx-1 hidden md:block"></div>

          {/* Accesos Migrados desde M8 */}
          <Link href="/reportes/hoja-frontal" className="text-slate-500 hover:bg-blue-50 hover:text-blue-600 px-4 py-2 rounded-xl text-xs font-medium transition-all">📄 Hoja Frontal</Link>
          <Link href="/reportes/cotizacion-lab" className="text-slate-500 hover:bg-blue-50 hover:text-blue-600 px-4 py-2 rounded-xl text-xs font-medium transition-all">🧪 Cotización Lab</Link>
          <Link href="/reportes/facturacion" className="text-slate-500 hover:bg-blue-50 hover:text-blue-600 px-4 py-2 rounded-xl text-xs font-medium transition-all">📑 Control Facturación</Link>

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