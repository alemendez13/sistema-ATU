"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, query, orderBy, onSnapshot, where, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";

interface Gasto {
  id: string;
  concepto: string;
  monto: number;
  autorizadoPor: string;
  fecha: any;
}

export default function GastosManager() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [autorizadoPor, setAutorizadoPor] = useState("");
  const [loading, setLoading] = useState(false);

  // Cargar gastos del día de hoy
  useEffect(() => {
    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, "gastos"),
      where("fecha", ">=", inicioDia),
      orderBy("fecha", "desc")
    );

    // Escucha en tiempo real
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Gasto[];
      setGastos(docs);
    });

    return () => unsubscribe();
  }, []);

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concepto || !monto || !autorizadoPor) return;

    setLoading(true);
    try {
      await addDoc(collection(db, "gastos"), {
        concepto,
        monto: Number(monto),
        autorizadoPor,
        fecha: serverTimestamp(), // Hora del servidor para evitar trampas
        tipo: "Salida"
      });

      alert("✅ Gasto registrado");
      setConcepto("");
      setMonto("");
      setAutorizadoPor("");
    } catch (error) {
      console.error("Error al guardar gasto:", error);
      alert("Error al registrar");
    } finally {
      setLoading(false);
    }
  };

  // Calcular total de gastos hoy
  const totalGastos = gastos.reduce((sum, g) => sum + Number(g.monto), 0);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Formulario de Registro */}
        <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-red-100">
          <h2 className="text-xl font-bold text-red-700 mb-4 flex items-center gap-2">
            💸 Registrar Salida
          </h2>
          <form onSubmit={handleGuardar} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Concepto</label>
              <input 
                type="text" 
                className="w-full border rounded p-2 text-sm" 
                placeholder="Ej. Artículos de limpieza" 
                value={concepto}
                onChange={e => setConcepto(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Monto ($)</label>
              <input 
                type="number" 
                min="0"
                step="0.01"
                className="w-full border rounded p-2 text-sm font-mono" 
                placeholder="0.00" 
                value={monto}
                onChange={e => setMonto(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Autorizado por</label>
              <input 
                type="text" 
                className="w-full border rounded p-2 text-sm" 
                placeholder="Nombre" 
                value={autorizadoPor}
                onChange={e => setAutorizadoPor(e.target.value)}
                required
              />
            </div>
            <button 
              disabled={loading}
              className="w-full bg-red-600 text-white font-bold py-2 rounded hover:bg-red-700 transition-colors disabled:bg-gray-300"
            >
              {loading ? "Guardando..." : "Registrar Gasto"}
            </button>
          </form>
        </div>

        {/* Lista de Gastos del Día */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-700">Gastos de Hoy</h3>
            <div className="text-right">
              <span className="text-xs text-slate-500 uppercase block">Total Salidas</span>
              <span className="text-xl font-bold text-red-600">-${totalGastos.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[400px] p-4">
            {gastos.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">No hay gastos registrados hoy.</p>
            ) : (
              <ul className="space-y-3">
                {gastos.map(g => (
                  <li key={g.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                    <div>
                      <p className="font-medium text-slate-800">{g.concepto}</p>
                      <p className="text-xs text-slate-500">Autorizó: {g.autorizadoPor} • {g.fecha?.seconds ? new Date(g.fecha.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</p>
                    </div>
                    <span className="font-bold text-red-600">-${g.monto}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}