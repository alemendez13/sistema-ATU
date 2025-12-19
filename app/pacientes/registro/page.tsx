/* UBICACIÓN: app/pacientes/registro/page.tsx */
import { getCatalogos } from "../../../lib/googleSheets"; // Ajusta la ruta si es necesario
import PatientFormClient from "../../../components/forms/PatientFormClient"; // Ajusta la ruta a tu componente
import ProtectedRoute from "../../../components/ProtectedRoute";

// Esta línea asegura que la página siempre traiga datos frescos de Google Sheets
export const dynamic = 'force-dynamic';

export default async function RegistroPage() {
  // 1. Obtenemos TODO el catálogo en una sola llamada
  const { servicios, medicos, descuentos } = await getCatalogos();

  return (
    <ProtectedRoute>
      {/* 2. Le pasamos las 3 listas al formulario */}
      <PatientFormClient 
        servicios={servicios} 
        medicos={medicos} 
        descuentos={descuentos} 
      />
    </ProtectedRoute>
  );
}