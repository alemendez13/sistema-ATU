export default function FundamentosPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-xl font-bold text-slate-900">Fundamentos Estratégicos</h2>
        <p className="mt-2 text-sm text-slate-500">ADN Corporativo: Misión, Visión y Valores.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Tarjetas Placeholder */}
        {['Misión', 'Visión', 'Valores'].map((item) => (
            <div key={item} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-center">
                <h3 className="font-bold text-slate-700">{item}</h3>
                <div className="mt-4 h-2 w-full rounded-full bg-slate-100"></div>
                <div className="mt-2 h-2 w-2/3 mx-auto rounded-full bg-slate-100"></div>
            </div>
        ))}
      </div>
    </div>
  );
}