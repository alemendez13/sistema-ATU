export default function FodaPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-xl font-bold text-slate-900">Análisis FODA</h2>
        <p className="mt-2 text-sm text-slate-500">Fortalezas, Oportunidades, Debilidades y Amenazas.</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 h-96">
        <div className="bg-emerald-50 rounded-lg flex items-center justify-center border border-emerald-100">Fortalezas</div>
        <div className="bg-orange-50 rounded-lg flex items-center justify-center border border-orange-100">Debilidades</div>
        <div className="bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">Oportunidades</div>
        <div className="bg-red-50 rounded-lg flex items-center justify-center border border-red-100">Amenazas</div>
      </div>
    </div>
  );
}