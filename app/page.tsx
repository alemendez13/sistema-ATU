"use client";
import Link from "next/link";
import ProtectedRoute from "../components/ProtectedRoute";
import { 
  Settings, Target, GitBranch, HeartPulse, 
  Users, Package, ClipboardList, BarChart3,
  Calendar, FolderOpen, FileText, Database, CheckSquare // ✅ Añadir iconos
} from "lucide-react";
import { useState } from "react"; 
import { collection, query, where, getDocs, writeBatch, doc, limit, deleteDoc, updateDoc } from "firebase/firestore"; 
import { db } from "@/lib/firebase"; 
import { toast } from "sonner"; 

export default function Home() {
  const [reparando, setReparando] = useState(false);

  // --- 1. REPARACIÓN DE FECHAS (Cruce de Bases) ---
  const repararFechasConCitas = async () => {
    if (!confirm("Iniciando cruce de bases de datos para reparar cobranza...")) return;
    setReparando(true);
    try {
      const batch = writeBatch(db);
      const opsSnap = await getDocs(collection(db, "operaciones"));
      let reparados = 0;

      for (const opDoc of opsSnap.docs) {
        const opData = opDoc.data();
        if (!opData.fechaCita && opData.pacienteId) {
          const citaQuery = query(
            collection(db, "citas"),
            where("pacienteId", "==", opData.pacienteId),
            limit(1) 
          );
          const citaSnap = await getDocs(citaQuery);
          if (!citaSnap.empty) {
            batch.update(doc(db, "operaciones", opDoc.id), {
              fechaCita: citaSnap.docs[0].data().fecha
            });
            reparados++;
          }
        }
      }
      if (reparados > 0) {
        await batch.commit();
        toast.success(`¡Reparación exitosa! ${reparados} operaciones sincronizadas.`);
      } else {
        toast.info("No se encontraron operaciones pendientes.");
      }
    } catch (error) {
      toast.error("Error en la cirugía de datos.");
    } finally {
      setReparando(false);
    }
  };

  // --- 2. NUEVA LÓGICA: CERRAR CITAS 2025 (Limpieza Radar) ---
  const cerrarCitasHistoricas = async () => {
    if (!confirm("Esto marcará como CONFIRMADAS todas las citas del 2025 que quedaron pendientes. ¿Continuar?")) return;
    setReparando(true);
    try {
      const batch = writeBatch(db);
      // Filtramos citas del 2025 que tengan confirmada: false
      const q = query(
        collection(db, "citas"),
        where("fecha", "<", "2026-01-01"),
        where("confirmada", "==", false)
      );
      
      const snap = await getDocs(q);
      let count = 0;

      snap.forEach((docSnap) => {
        batch.update(docSnap.ref, { 
          confirmada: true, 
          notasMantenimiento: "Cierre administrativo 2025" 
        });
        count++;
      });

      if (count > 0) {
        await batch.commit();
        toast.success(`Se cerraron ${count} citas históricas.`);
      } else {
        toast.info("No hay citas pendientes del 2025.");
      }
    } catch (error) {
      toast.error("Error al cerrar historial.");
    } finally {
      setReparando(false);
    }
  };

  // --- 3. ALINEACIÓN Y LIMPIEZA 2025 (Operaciones) ---
  const alinearColecciones = async () => {
    if (!confirm("Esto eliminará de forma PERMANENTE las operaciones de prueba del 2025. ¿Confirmar?")) return;
    setReparando(true);
    try {
      const opsRef = collection(db, "operaciones");
      const snapshot = await getDocs(opsRef);
      let eliminados = 0;
      let reparados = 0;

      for (const d of snapshot.docs) {
        const data = d.data();
        const docRef = doc(db, "operaciones", d.id);

        if (data.fechaCita?.includes("2025") || (data.fecha?.seconds && data.fecha.seconds < 1735689600)) {
          await deleteDoc(docRef);
          eliminados++;
          continue;
        }

        if (data.fechaCita && typeof data.fechaCita !== 'string') {
          const fechaString = new Date(data.fechaCita.seconds * 1000).toISOString().split('T')[0];
          await updateDoc(docRef, { fechaCita: fechaString });
          reparados++;
        }
      }
      toast.success(`Cirugía: ${eliminados} eliminados, ${reparados} reparados.`);
    } catch (e) {
      toast.error("Error en alineación.");
    } finally {
      setReparando(false);
    }
  };

  const modulos = [
    { id: 1, name: "Configuración", desc: "Cerebro GEC-FR-02 y Roles", icon: <Settings />, href: "/configuracion/conocimiento", color: "bg-slate-100 text-slate-600" },
    { id: 10, name: "Agenda Médica", desc: "Gestión de citas y tiempos", icon: <Calendar />, href: "/agenda", color: "bg-blue-50 text-blue-600" },
    { id: 11, name: "Directorio", desc: "Base de datos de pacientes", icon: <FolderOpen />, href: "/pacientes", color: "bg-emerald-50 text-emerald-600" }, 
    { id: 2, name: "Metas / Kpis", desc: "Misión, FODA y Metas", icon: <Target />, href: "/planeacion", color: "bg-blue-50 text-blue-600" },
    { id: 3, name: "Sistema de gestión", desc: "Repositorio y Auditoría", icon: <GitBranch />, href: "/procesos", color: "bg-purple-50 text-purple-600" },
    { id: 4, name: "Control diario de Pacientes", desc: "Pacientes y Agenda Médica", icon: <HeartPulse />, href: "/pacientes", color: "bg-red-50 text-red-600" },
    { id: 12, name: "Expediente Clínico", desc: "Historia médica y evolución", icon: <FileText />, href: "/expedientes", color: "bg-indigo-50 text-indigo-600" },
    { id: 5, name: "Recursos humanos", desc: "Control de RRHH", icon: <Users />, href: "/personal", color: "bg-orange-50 text-orange-600" },
    { id: 6, name: "Solicitudes de Materiales", desc: "Inventarios e Insumos", icon: <Package />, href: "/inventarios", color: "bg-amber-50 text-amber-600" },
    { id: 7, name: "Minuta", desc: "Limpieza e Infraestructura", icon: <ClipboardList />, href: "/mantenimiento", color: "bg-emerald-50 text-emerald-600" },
    { id: 8, name: "Reportes", desc: "Caja, Reportes y Cobranza", icon: <BarChart3 />, href: "/finanzas", color: "bg-indigo-50 text-indigo-600" },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen p-2 md:p-6">
        <div className="max-w-[1400px] mx-auto">
          <header className="mb-10">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase">
              Gestión Integral de la Clínica
            </h1>
            <p className="text-slate-500 font-medium italic mb-6">SANSCE OS v2.0</p>

            {/* PANEL DE MANTENIMIENTO 2026 */}
            <div className="flex flex-wrap gap-3 bg-white p-4 rounded-2xl border border-red-100 shadow-sm">
                <button 
                    onClick={alinearColecciones}
                    disabled={reparando}
                    className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-700 transition-all flex items-center gap-2"
                >
                    <Database size={14} /> 1. LIMPIAR PRUEBAS 2025
                </button>

                <button 
                    onClick={cerrarCitasHistoricas}
                    disabled={reparando}
                    className="bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-orange-600 transition-all flex items-center gap-2"
                >
                    <CheckSquare size={14} /> 2. CERRAR CITAS PENDIENTES 2025
                </button>

                <button 
                    onClick={repararFechasConCitas}
                    disabled={reparando}
                    className="bg-white text-indigo-600 border border-indigo-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-all flex items-center gap-2"
                >
                    <Database size={14} className={reparando ? "animate-spin" : ""} />
                    3. REPARAR FECHAS COBRANZA
                </button>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 items-stretch">
            {modulos.map((m) => (
              <Link key={m.id} href={m.href} className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all hover:-translate-y-1 flex flex-col items-center text-center h-full justify-center">
                <div className="flex flex-col items-center w-full mb-4">
                  <div className={`w-14 h-14 ${m.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm`}>
                    {m.icon}
                  </div>
                  <h3 className="text-lg lg:text-xl font-bold text-slate-800 leading-tight w-full text-balance">{m.name}</h3>
                </div>
                <p className="text-xs text-slate-500 px-4">{m.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}