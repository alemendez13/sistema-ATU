// app/pacientes/[id]/venta/page.tsx
import { getCatalogos } from "../../../../lib/googleSheets";
import VentaForm from "./VentaForm";

export default async function VentaPage({ params }: { params: { id: string } }) {
  // 1. Obtenemos Servicios, Médicos Y AHORA DESCUENTOS
  const { servicios, medicos, descuentos } = await getCatalogos();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 2. Pasamos las 3 listas al formulario */}
      <VentaForm 
          pacienteId={params.id} 
          servicios={servicios} 
          medicos={medicos}
          descuentos={descuentos} // 👈 Pasamos la nueva lista
      />
    </div>
  );
}