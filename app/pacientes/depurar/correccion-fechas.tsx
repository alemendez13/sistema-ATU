/* app/pacientes/depurar/correccion-fechas.tsx */
"use client";
import { useState } from "react";
// 1. Agregamos 'limit' para proteger tus cuotas de lectura
import { collection, query, where, getDocs, updateDoc, doc, Timestamp, limit } from "firebase/firestore";
// 2. CORRECCIÓN DE RUTA: Usamos '@' para ir directo a la raíz, evitando líos con '../'
import { db } from "@/lib/firebase"; 
import { toast } from "sonner";

export default function CorrectorFechas() {
  const [log, setLog] = useState<string[]>([]);
  const [procesando, setProcesando] = useState(false);

  const ejecutarCorreccion = async () => {
    if (!confirm("⚠️ ¿Estás seguro de ejecutar la corrección masiva de fechas?")) return;
    
    setProcesando(true);
    setLog(["🚀 Iniciando escaneo de operaciones tipo 'Cortesía'..."]);

    try {
      // 1. Buscar operaciones 'Cortesía'
      // 🛡️ SEGURIDAD: Agregamos 'limit(50)' para evitar lecturas masivas accidentales.
      // Si tienes más de 50, puedes dar clic al botón varias veces hasta que diga "0 corregidos".
      const q = query(
        collection(db, "operaciones"),
        where("metodoPago", "==", "Cortesía"),
        limit(50) 
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setLog(prev => [...prev, "✅ No se encontraron registros de cortesía para revisar en este lote."]);
        setProcesando(false);
        return;
      }

      setLog(prev => [...prev, `🔍 Analizando lote de ${snapshot.size} registros...`]);

      let corregidos = 0;

      for (const documento of snapshot.docs) {
        const data = documento.data();
        
        // Validamos que tenga fechaCita válida
        if (data.fechaCita && typeof data.fechaCita === 'string') {
            
            // Construimos la fecha objetivo
            const hora = data.horaCita || "12:00";
            const fechaObjetivo = new Date(`${data.fechaCita}T${hora}:00`);
            
            // Obtenemos la fecha actual de pago registrada
            const fechaPagoActual = data.fechaPago instanceof Timestamp 
                ? data.fechaPago.toDate() 
                : null;

            // CRITERIO DE CORRECCIÓN:
            // Comparamos solo la parte de la fecha (YYYY-MM-DD) para ver si coinciden
            const fechaPagoString = fechaPagoActual ? fechaPagoActual.toISOString().split('T')[0] : "SIN_FECHA";
            const esMismoDia = fechaPagoString === data.fechaCita;

            if (!esMismoDia) {
                // 🔥 ACTUALIZAMOS
                await updateDoc(doc(db, "operaciones", documento.id), {
                    fechaPago: fechaObjetivo
                });
                setLog(prev => [...prev, `✅ Corregido: ${data.pacienteNombre || 'S/N'} | Cita: ${data.fechaCita} (Antes tenía fecha: ${fechaPagoString})`]);
                corregidos++;
            }
        }
      }

      setLog(prev => [...prev, `🏁 LOTE FINALIZADO. Total corregidos en este pase: ${corregidos}`]);
      
      if (corregidos > 0) {
        toast.success(`Se corrigieron ${corregidos} registros. Ejecuta de nuevo si crees que faltan más.`);
      } else {
        toast.info("Todos los registros de este lote ya estaban correctos.");
      }

    } catch (error: any) {
      console.error(error);
      setLog(prev => [...prev, `❌ ERROR CRÍTICO: ${error.message}`]);
      toast.error("Error al ejecutar el script.");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="p-10 max-w-3xl mx-auto bg-slate-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-2 text-slate-800">Herramienta de Corrección Temporal</h1>
      <p className="mb-6 text-slate-600">
        Este script alinea la <strong>Fecha de Pago</strong> con la <strong>Fecha de Cita</strong> para las cortesías. 
        <br/>
        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded border border-yellow-200">
          🛡️ Modo Seguro: Procesa lotes de 50 en 50.
        </span>
      </p>
      
      <button 
        onClick={ejecutarCorreccion} 
        disabled={procesando}
        className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
      >
        {procesando ? "⏳ Procesando lote..." : "▶️ Ejecutar Corrección (Lote de 50)"}
      </button>

      <div className="mt-6 bg-slate-900 text-green-400 p-4 rounded-xl h-96 overflow-y-auto font-mono text-xs shadow-inner border border-slate-700">
        {log.length === 0 ? (
            <span className="text-slate-500 opacity-50">Esperando ejecución...</span>
        ) : (
            log.map((l, i) => <div key={i} className="mb-1 border-b border-slate-800 pb-1 last:border-0">{l}</div>)
        )}
      </div>
    </div>
  );
}