import { getCatalogos } from "../../../lib/googleSheets";
import PatientFormClient from "../../../components/forms/PatientFormClient";

// Esta función se ejecuta en el servidor
export default async function RegisterPage() {
  
  // 1. Obtenemos los servicios del Excel
  const { servicios } = await getCatalogos();

  // 2. Renderizamos el formulario pasándole los datos reales
  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-5xl mx-auto px-4 mb-4">
        <a href="/pacientes" className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1">
           ← Volver al Tablero
        </a>
      </div>
      
      {/* Aquí vive el formulario interactivo */}
      <PatientFormClient servicios={servicios} />
    </div>
  );
}