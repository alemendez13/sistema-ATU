import { getCatalogos } from "../../../../lib/googleSheets";
import VentaForm from "./VentaForm";

export default async function VentaPage({ params }: { params: { id: string } }) {
  // Obtenemos TOOOODO (Servicios y Médicos)
  const { servicios, medicos } = await getCatalogos();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Pasamos ambas listas al formulario */}
      <VentaForm 
          pacienteId={params.id} 
          servicios={servicios} 
          medicos={medicos} 
      />
    </div>
  );
}