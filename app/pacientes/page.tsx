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
        {/* SUB-NAVBAR CRM (M4) - Consolidación de accesos */}
        <div className="flex gap-4 mb-8 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-fit">
          <Link href="/pacientes" className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md">📂 Directorio</Link>
          <Link href="/agenda" className="text-slate-500 hover:bg-slate-100 px-5 py-2 rounded-xl text-sm font-medium transition-all">📅 Agenda</Link>
          <Link href="/pacientes/registro" className="text-slate-500 hover:bg-slate-100 px-5 py-2 rounded-xl text-sm font-medium transition-all">➕ Registro</Link>
        </div>
        
        <DirectoryClient mensajesPredefinidos={mensajes} />
      </div>
    </ProtectedRoute>
  );
}