import { getCatalogos } from "../../lib/googleSheets";
import InventoryManager from "../../components/inventarios/InventoryManager";
import ProtectedRoute from "../../components/ProtectedRoute";

export default async function InventariosPage() {
  // 1. Leemos todo el catálogo de Excel
  const { servicios } = await getCatalogos();

  // 2. FILTRADO IMPORTANTE: Solo queremos los que digan Tipo = 'Producto'
  // Ignoramos las 'Consultas' porque esas no tienen inventario.
  const soloProductos = servicios.filter(s => s.tipo === "Producto");

  return (
    <ProtectedRoute>
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-5xl mx-auto mb-4">
        <a href="/" className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1">
           ← Volver al Tablero
        </a>
      </div>
      
      <InventoryManager productos={soloProductos} />
    </div>
    </ProtectedRoute>
  );
}