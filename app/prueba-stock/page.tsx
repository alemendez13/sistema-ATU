import { consultarStockExterno } from "../../lib/googleSheets";

// Esta página funciona escribiendo el SKU en la URL
// Ejemplo: localhost:3000/prueba-stock?sku=DESP001
export default async function PruebaStockPage({ searchParams }: { searchParams: { sku?: string } }) {
  const sku = searchParams.sku || "";
  let resultado = null;

  if (sku) {
    resultado = await consultarStockExterno(sku);
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">📡 Radar de Inventario</h1>
        <p className="text-slate-500 text-sm mb-6">Conexión en tiempo real con tu App de Gestión.</p>

        {/* Formulario de búsqueda simple */}
        <form className="flex gap-2 mb-6">
            <input 
                name="sku" 
                defaultValue={sku}
                placeholder="Escribe un SKU (ej. DESP001)" 
                className="border p-2 rounded w-full uppercase"
                autoFocus
            />
            <button className="bg-blue-600 text-white px-4 py-2 rounded font-bold">
                Buscar
            </button>
        </form>

        {/* Resultados */}
        {sku && resultado && (
            <div className={`p-4 rounded-lg border ${resultado.error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                {resultado.error ? (
                    <div className="text-red-700">
                        <p className="font-bold">❌ Error:</p>
                        <p>{resultado.error}</p>
                        <p className="text-xs mt-1 opacity-75">{resultado.detalle}</p>
                    </div>
                ) : resultado.encontrado ? (
                    <div className="text-center">
                        <p className="text-sm text-green-800 font-medium mb-1">Producto Encontrado:</p>
                        <h2 className="text-xl font-bold text-green-900">{resultado.nombre}</h2>
                        <div className="my-3">
                            <span className="text-5xl font-bold text-green-600">{resultado.stock}</span>
                            <span className="text-sm text-green-700 ml-1">unidades</span>
                        </div>
                        <p className="text-xs text-green-600">Leído desde tu App de Inventarios</p>
                    </div>
                ) : (
                    <div className="text-orange-700 text-center">
                        <p className="font-bold">⚠️ No encontrado</p>
                        <p>{resultado.mensaje}</p>
                        <p className="text-xs mt-1">Verifica que el SKU exista en CATALOGO_INSUMOS</p>
                    </div>
                )}
            </div>
        )}
        
        <div className="mt-6 text-center">
            <a href="/" className="text-slate-400 hover:text-slate-600 text-sm">← Volver al inicio</a>
        </div>
      </div>
    </div>
  );
}