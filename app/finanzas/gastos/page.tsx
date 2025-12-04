import GastosManager from "../../../components/finanzas/GastosManager";

export default function GastosPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
            <a href="/finanzas" className="text-slate-500 hover:text-blue-600 text-2xl">←</a>
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Caja Chica</h1>
                <p className="text-slate-500">Control de salidas de efectivo y gastos operativos.</p>
            </div>
        </div>

        <GastosManager />
      </div>
    </div>
  );
}