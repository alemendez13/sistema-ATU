"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";

interface Servicio {
  sku: string;
  nombre: string;
  tipo: string;
}

interface InventoryProps {
  productos: Servicio[]; // Solo recibiremos lo que sea "Producto"
}

export default function InventoryManager({ productos }: InventoryProps) {
  const [lotes, setLotes] = useState<any[]>([]);
  const [skuSeleccionado, setSkuSeleccionado] = useState("");
  const [loteFab, setLoteFab] = useState("");
  const [caducidad, setCaducidad] = useState("");
  const [cantidad, setCantidad] = useState<number | "">("");
  const [loading, setLoading] = useState(false);

  // 1. Cargar inventario actual al abrir
  useEffect(() => {
    cargarInventario();
  }, []);

  const cargarInventario = async () => {
    const q = query(collection(db, "inventarios"), orderBy("fechaCaducidad", "asc"));
    const snapshot = await getDocs(q);
    setLotes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  // 2. Guardar nuevo lote (Entrada de Almacén)
  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuSeleccionado || !cantidad) return;

    setLoading(true);
    try {
      const productoInfo = productos.find(p => p.sku === skuSeleccionado);

      await addDoc(collection(db, "inventarios"), {
        sku: skuSeleccionado,
        nombre: productoInfo?.nombre,
        lote: loteFab.toUpperCase(),
        fechaCaducidad: caducidad,
        stockInicial: Number(cantidad),
        stockActual: Number(cantidad), // Al inicio es igual al inicial
        fechaRegistro: serverTimestamp()
      });

      alert("✅ Lote registrado correctamente");
      setLoteFab("");
      setCantidad("");
      setCaducidad("");
      cargarInventario(); // Recargar tabla
    } catch (error) {
      console.error("Error:", error);
      alert("Error al guardar lote");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-slate-200">
      
      {/* --- MODIFICACIÓN INICIO: ENCABEZADO CON BOTÓN DE CONSULTA --- */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">📦 Gestión de Inventarios (Entradas)</h1>
        <a 
          href="/prueba-stock" 
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm bg-slate-100 text-blue-600 font-bold px-4 py-2 rounded-lg hover:bg-blue-50 border border-slate-200 flex items-center gap-2 transition-colors"
        >
          🔍 Consultar Stock Externo
        </a>
      </div>
      {/* --- MODIFICACIÓN FIN --- */}
      {/* FORMULARIO DE ENTRADA */}
      <form onSubmit={handleGuardar} className="bg-slate-50 p-6 rounded-lg border border-slate-200 mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        
        <div className="md:col-span-4">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Producto (Solo Tipo 'Producto')</label>
            <select 
                className="w-full p-2 border rounded"
                value={skuSeleccionado}
                onChange={(e) => setSkuSeleccionado(e.target.value)}
                required
            >
                <option value="">-- Seleccionar --</option>
                {productos.map(p => (
                    <option key={p.sku} value={p.sku}>{p.nombre}</option>
                ))}
            </select>
        </div>

        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Lote Fabricante</label>
            <input type="text" required className="w-full p-2 border rounded uppercase" value={loteFab} onChange={e => setLoteFab(e.target.value)} placeholder="Ej. A45-X" />
        </div>

        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Caducidad</label>
            <input type="date" required className="w-full p-2 border rounded" value={caducidad} onChange={e => setCaducidad(e.target.value)} />
        </div>

        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cantidad (Unidades)</label>
            <input type="number" required min="1" className="w-full p-2 border rounded" value={cantidad} onChange={e => setCantidad(Number(e.target.value))} placeholder="0" />
        </div>

        <button disabled={loading} className="bg-blue-600 text-white font-bold p-2 rounded hover:bg-blue-700 transition-colors">
            {loading ? "..." : "+ Registrar Entrada"}
        </button>
      </form>

      {/* TABLA DE EXISTENCIAS */}
      <h2 className="font-bold text-lg mb-4 text-slate-700">Existencias Actuales</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase font-bold">
                <tr>
                    <th className="p-3">Producto</th>
                    <th className="p-3">Lote</th>
                    <th className="p-3">Caducidad</th>
                    <th className="p-3 text-center">Stock Actual</th>
                    <th className="p-3">Estado</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {lotes.map((lote) => (
                    <tr key={lote.id} className="hover:bg-slate-50">
                        <td className="p-3 font-medium">{lote.nombre}</td>
                        <td className="p-3 font-mono text-slate-500">{lote.lote}</td>
                        <td className="p-3 text-slate-500">{lote.fechaCaducidad}</td>
                        <td className="p-3 text-center font-bold text-lg">{lote.stockActual}</td>
                        <td className="p-3">
                            {lote.stockActual > 0 
                                ? <span className="text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-bold">Disponible</span>
                                : <span className="text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-bold">Agotado</span>
                            }
                        </td>
                    </tr>
                ))}
                {lotes.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-slate-400">Almacén vacío</td></tr>}
            </tbody>
        </table>
      </div>
    </div>
  );
}