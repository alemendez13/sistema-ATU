import { getCatalogos } from "../../lib/googleSheets"; // Asegúrate de que la ruta sea correcta (sin .js si usas TS, o ajusta según tu entorno)
import AgendaBoard from "../../components/AgendaBoard";

// Esta función se ejecuta en el servidor antes de mostrar la página
export default async function AgendaPage() {
  
  // 1. Llamamos a tu función mágica para leer el Excel (Medicos Y Servicios)
  const { medicos, servicios } = await getCatalogos();

  // 2. Le pasamos AMBOS datos al componente visual
  return (
    <main>
        <AgendaBoard medicos={medicos} servicios={servicios} />
    </main>
  );
}