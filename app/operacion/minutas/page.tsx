import { getMedicos } from "@/lib/googleSheets";
import MinutaForm from "@/components/operacion/MinutaForm"; // Lo crearemos en el siguiente paso

export default async function MinutasPage() {
  // 1. Cargamos la lista de médicos/usuarios para el formulario
  const personal = await getMedicos();

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Orden del Día</h1>
          <p className="text-slate-500">Gestión de acuerdos, hitos y compromisos estratégicos</p>
        </header>

        {/* El Formulario Modular */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <MinutaForm personal={personal} />
        </div>
      </div>
    </main>
  );
}