// app/planeacion/inteligencia/page.tsx
import { fetchOkrDataAction, fetchCronogramaAction, fetchDashboardChecklistAction } from "@/lib/actions";
import IntelligenceClient from "@/app/planeacion/inteligencia/IntelligenceClient";

export default async function InteligenciaPage() {
  // 1. Identificador de Seguridad (En el futuro vendrá de la sesión activa) [cite: 12]
  const userEmail = "administracion@sansce.com"; 

  // 2. Carga en Paralelo inyectando el correo para cumplir con la Trazabilidad Sagrada [cite: 677, 678]
  const [okrData, cronograma, checklist] = await Promise.all([
    fetchOkrDataAction(userEmail),
    fetchCronogramaAction(), // Esta función no reportó error de argumentos
    fetchDashboardChecklistAction(userEmail)
  ]);

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-sansce-brand">Inteligencia del Negocio</h1>
      
      {/* Client Component para manejar la interactividad de las "Burbujas Dinámicas" [cite: 663] */}
      <IntelligenceClient 
        okrData={okrData} 
        cronograma={cronograma} 
        checklist={checklist} 
      />
    </main>
  );
}