import { getCatalogos } from "../../lib/googleSheets.js";
import AgendaBoard from "../../components/AgendaBoard";

// Esta función se ejecuta en el servidor antes de mostrar la página
export default async function AgendaPage() {
  
  // 1. Llamamos a tu función mágica para leer el Excel
  const { medicos } = await getCatalogos();

  // 2. Le pasamos los datos reales al componente visual
  return (
    <main>
        <AgendaBoard medicos={medicos} />
    </main>
  );
}