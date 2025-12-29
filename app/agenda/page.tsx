import { getCatalogos } from "@/lib/googleSheets";
import AgendaBoard from "@/components/AgendaBoard";
import Link from "next/link"; // ✅ ADICIÓN: Faltaba esta importación

export default async function AgendaPage() {
  const { medicos, servicios } = await getCatalogos();

  return (
    <main className="max-w-full mx-auto px-4 md:px-8 pt-4">
        {/* SUB-NAVBAR CRM (M4) - Consistente con Directorio */}
        <div className="flex gap-4 mb-8 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-fit">
          <Link href="/pacientes" className="text-slate-500 hover:bg-slate-100 px-5 py-2 rounded-xl text-sm font-medium transition-all">📂 Directorio</Link>
          <Link href="/agenda" className="bg-purple-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md">📅 Agenda</Link>
          <Link href="/pacientes/registro" className="text-slate-500 hover:bg-slate-100 px-5 py-2 rounded-xl text-sm font-medium transition-all">➕ Registro</Link>
        </div>

        <AgendaBoard medicos={medicos} servicios={servicios} />
    </main>
  );
}