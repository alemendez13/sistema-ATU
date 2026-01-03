/* app/agenda/page.tsx */
import { getCatalogos } from "@/lib/googleSheets";
import AgendaBoard from "@/components/AgendaBoard";
import Link from "next/link";

export default async function AgendaPage() {
  const { medicos, servicios } = await getCatalogos();

  return (
    <main className="max-w-full mx-auto px-4 md:px-8 pt-4">
        {/* SUB-NAVBAR CRM (M4) - SINCRONIZADO CON DIRECTORIO */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-full md:w-fit">
          {/* Accesos Base */}
          <Link href="/pacientes" className="text-slate-500 hover:bg-slate-100 px-4 py-2 rounded-xl text-xs font-medium transition-all">📂 Directorio</Link>
          <Link href="/agenda" className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md">📅 Agenda</Link>
          <Link href="/pacientes/registro" className="text-slate-500 hover:bg-slate-100 px-4 py-2 rounded-xl text-xs font-medium transition-all">➕ Registro</Link>
          
          <div className="w-px h-8 bg-slate-200 mx-1 hidden md:block"></div>

          {/* Accesos Migrados (Desde M8) */}
          <Link href="/reportes/hoja-frontal" className="text-slate-500 hover:bg-blue-50 hover:text-blue-600 px-4 py-2 rounded-xl text-xs font-medium transition-all">📄 Hoja Frontal</Link>
          <Link href="/reportes/cotizacion-lab" className="text-slate-500 hover:bg-blue-50 hover:text-blue-600 px-4 py-2 rounded-xl text-xs font-medium transition-all">🧪 Cotización Lab</Link>
          <Link href="/reportes/facturacion" className="text-slate-500 hover:bg-blue-50 hover:text-blue-600 px-4 py-2 rounded-xl text-xs font-medium transition-all">📑 Control Facturación</Link>

          <div className="w-px h-8 bg-slate-200 mx-1 hidden md:block"></div>

          {/* Nuevas Utilidades */}
          <Link href="/pacientes/profesionales" className="text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 px-4 py-2 rounded-xl text-xs font-medium transition-all">👨‍⚕️ Catálogo Médicos</Link>
          <Link href="/pacientes/express-wa" className="text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 px-4 py-2 rounded-xl text-xs font-medium transition-all">📲 Autollenado WA</Link>
        </div>

        <AgendaBoard medicos={medicos} servicios={servicios} />
    </main>
  );
}