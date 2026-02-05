"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, query, orderBy, onSnapshot, where, serverTimestamp, doc, updateDoc } from "@/lib/firebase-guard";
import { db } from "../../lib/firebase";

// 🔧 CORRECCIÓN DE ERRORES: Definimos los campos nuevos para que VS Code no se queje
interface Gasto {
  id: string;
  concepto: string;
  monto: number;
  autorizadoPor: string;
  fecha: any;
  tipo?: "Ingreso" | "Salida"; // Soluciona el error del switch
  validado?: boolean;          // Nuevo: Para el Check del Supervisor
  validadoPor?: string;        // Nuevo: Quién aprobó
}

export default function GastosManager() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [tipo, setTipo] = useState<"Ingreso" | "Salida">("Salida"); // Nuevo Switch
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
        fecha: serverTimestamp(),
        tipo: tipo // ✅ Ahora guardamos si es Ingreso o Salida
      });

      // Feedback visual diferente según el tipo
      if (tipo === "Ingreso") {
        alert("💰 Dinero ingresado a caja correctamente");
      } else {
        alert("💸 Salida registrada correctamente");
      }
      
      setConcepto("");
      setMonto("");
      setAutorizadoPor("");
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error al registrar");
    } finally {
      setLoading(false);
    }
  };

  // 👮 Lógica de Supervisor: Validar todo lo visible
  const handleValidarDia = async () => {
    // Filtramos solo lo que NO está validado aún
    const pendientes = gastos.filter(g => !g.validado);
    
    if (pendientes.length === 0) return alert("✅ Todo el corte ya está validado.");
    
    // Simulación de seguridad (Surgical Mode: simple y funcional)
    const clave = prompt("🔐 SUPERVISOR: Ingrese su firma o clave para aprobar el corte:");
    if (!clave) return;

    setLoading(true);
    try {
      // Actualizamos uno por uno (Loop seguro, son pocos registros por día)
      const promesas = pendientes.map(g => {
        const ref = doc(db, "gastos", g.id);
        return updateDoc(ref, {
          validado: true,
          validadoPor: clave
        });
      });
      
      await Promise.all(promesas);
      alert(`✅ Se han validado ${pendientes.length} movimientos exitosamente.`);
    } catch (error) {
      console.error(error);
      alert("Error al validar el corte.");
    } finally {
      setLoading(false);
    }
  };

  // Calcular total (Nota: Ajustaremos la matemática en el siguiente paso)
  // 🧮 Lógica de Balance: Ingresos suman (+), Salidas restan (-)
  const balanceDia = gastos.reduce((acc, g) => {
    const valor = Number(g.monto);
    // Si es tipo 'Ingreso' suma, si es 'Salida' (o datos viejos) resta
    return (g.tipo === "Ingreso") ? acc + valor : acc - valor;
  }, 0);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Formulario de Registro INTELIGENTE */}
        <div className={`md:col-span-1 p-6 rounded-xl shadow-sm border transition-colors duration-300 ${tipo === 'Ingreso' ? 'bg-green-50 border-green-200' : 'bg-white border-red-100'}`}>
          
          {/* Switch de Tipo de Movimiento */}
          <div className="flex gap-2 mb-6 p-1 bg-slate-200 rounded-lg">
            <button
              type="button"
              onClick={() => setTipo("Salida")}
              className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${tipo === 'Salida' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              📤 Retirar
            </button>
            <button
              type="button"
              onClick={() => setTipo("Ingreso")}
              className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${tipo === 'Ingreso' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              📥 Reponer
            </button>
          </div>

          <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${tipo === 'Ingreso' ? 'text-green-700' : 'text-red-700'}`}>
            {tipo === 'Ingreso' ? '💰 Ingresar Efectivo' : '💸 Registrar Salida'}
          </h2>

          <form onSubmit={handleGuardar} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Concepto</label>
              <input 
                type="text" 
                className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-slate-200 outline-none" 
                placeholder={tipo === 'Ingreso' ? "Ej. Reposición semanal" : "Ej. Artículos de limpieza"} 
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
                className="w-full border rounded p-2 text-sm font-mono font-bold text-slate-700" 
                placeholder="0.00" 
                value={monto}
                onChange={e => setMonto(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                {tipo === 'Ingreso' ? 'Entregado por:' : 'Autorizado por:'}
              </label>
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
              className={`w-full font-bold py-3 rounded-lg shadow-md transition-all transform active:scale-95 disabled:opacity-50 ${tipo === 'Ingreso' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
            >
              {loading ? "Guardando..." : (tipo === 'Ingreso' ? "✅ Registrar Ingreso" : "❌ Registrar Salida")}
            </button>
          </form>
        </div>

        {/* Lista de Movimientos */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          {/* Cabecera del Balance con Validación */}
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <div>
                <h3 className="font-bold text-slate-700">Movimientos del Día</h3>
                <button 
                  onClick={handleValidarDia}
                  className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-600 px-2 py-1 rounded font-bold uppercase tracking-wider transition-colors mt-1"
                >
                  🛡️ Validar Corte
                </button>
            </div>
            <div className={`text-right px-3 py-1 rounded-lg border ${balanceDia >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
              <span className="text-[10px] text-slate-500 uppercase block font-bold">Balance Actual</span>
              <span className={`text-xl font-black font-mono ${balanceDia >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {balanceDia >= 0 ? '+' : ''}{balanceDia.toFixed(2)}
              </span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[400px] p-4">
            {gastos.length === 0 ? (
              <div className="text-center py-10 opacity-50">
                <p className="text-4xl mb-2">📦</p>
                <p className="text-sm font-medium">La caja está virgen hoy.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {gastos.map(g => {
                    const esIngreso = g.tipo === "Ingreso";
                    return (
                        <li key={g.id} className={`flex justify-between items-center p-3 rounded-lg border transition-all hover:shadow-sm ${esIngreso ? 'bg-green-50/50 border-green-100' : 'bg-red-50/30 border-slate-100'}`}>
                            <div className="flex items-start gap-3">
                                <span className={`text-lg ${esIngreso ? 'grayscale-0' : 'grayscale'}`}>
                                    {esIngreso ? '💵' : '🧾'}
                                </span>
                                <div>
                                    <p className={`font-bold text-sm ${esIngreso ? 'text-green-800' : 'text-slate-700'}`}>
                                        {g.concepto}
                                        {g.validado && (
                                          <span className="ml-2 text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full border border-green-200" title={`Validado por: ${g.validadoPor}`}>
                                            ✅ {g.validadoPor}
                                          </span>
                                        )}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-400">
                                        <span>👤 {g.autorizadoPor}</span>
                                        <span>•</span>
                                        <span>🕒 {g.fecha?.seconds ? new Date(g.fecha.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</span>
                                    </div>
                                </div>
                            </div>
                            <span className={`font-mono font-black text-sm ${esIngreso ? 'text-green-600' : 'text-red-600'}`}>
                                {esIngreso ? '+ ' : '- '}${Number(g.monto).toFixed(2)}
                            </span>
                        </li>
                    );
                })}
              </ul>
            )}
          </div>
        </div>
        </div>
      </div>
  );
}