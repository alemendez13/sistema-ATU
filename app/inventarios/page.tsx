// app/inventarios/page.tsx
import { getCatalogos } from "../../lib/googleSheets";
import InventoryManager from "../../components/inventarios/InventoryManager";
import ProtectedRoute from "../../components/ProtectedRoute";

export default async function InventariosPage() {
  // 1. Obtenemos los datos frescos desde Google Sheets
  const { servicios } = await getCatalogos();

  // 2. FILTRADO IMPORTANTE: Solo queremos los que digan Tipo = 'Producto'
  // Ignoramos las 'Consultas' porque esas no tienen inventario.
  // 👇 AQUÍ ESTÁ LA CORRECCIÓN: (s: any)
  const soloProductos = servicios.filter((s: any) => s.tipo === "Producto");

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900">Gestión de Inventario</h1>
            <p className="text-slate-500">
              Control de entradas (compras) y monitoreo de stock disponible.
            </p>
          </div>

          {/* Renderizamos el componente cliente pasándole solo los productos */}
          <InventoryManager productosIniciales={soloProductos} />
        </div>
      </div>
    </ProtectedRoute>
  );
}