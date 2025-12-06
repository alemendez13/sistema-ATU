"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, getDoc, doc } from "firebase/firestore"; 
import { db } from "../../../lib/firebase";
import { getMedicosAction, enviarCorteMedicoAction } from "../../../lib/actions";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Link from "next/link";
import { toast } from "sonner";

export default function ReporteIngresosMedicos() {
  const [medicos, setMedicos] = useState<any[]>([]);
  // Usamos ID porque es más seguro que el nombre (evita errores si hay dos Juanes)
  const [medicoId, setMedicoId] = useState(""); 
  
  // Fechas por defecto (Mes actual)
  const date = new Date();
  const primerDia = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  const ultimoDia = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [fechaInicio, setFechaInicio] = useState(primerDia);
  const [fechaFin, setFechaFin] = useState(ultimoDia);
  
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resumen, setResumen] = useState({ cobrado: 0, comisionSansce: 0, aPagarMedico: 0 });

  // 1. Cargar médicos
  useEffect(() => {
    getMedicosAction().then(setMedicos).catch(err => {
        console.error("Error médicos:", err);
        toast.error("Error cargando catálogo de médicos");
    });
  }, []);

  // 2. Generar Reporte (Versión "Experiencia 5 Estrellas" ⭐)
  const generarCorte = async () => {
    if (!medicoId) return toast.warning("Selecciona un médico");
    
    setLoading(true);
    setMovimientos([]);
    setResumen({ cobrado: 0, comisionSansce: 0, aPagarMedico: 0 });

    try {
      const medicoSelected = medicos.find(m => m.id === medicoId);
      // Limpieza del porcentaje
      const porcentaje = parseFloat((medicoSelected?.porcentajeComision || "0").toString().replace('%', '')) / 100;

      const start = new Date(`${fechaInicio}T00:00:00`);
      const end = new Date(`${fechaFin}T23:59:59`);

      console.log("🔥 LECTURA EJECUTADA EN: [NOMBRE_DEL_ARCHIVO] - " + new Date().toLocaleTimeString());

      // 🟢 1. CONSULTA "ARPÓN" (Ya optimizada con índice)
      const q = query(
        collection(db, "operaciones"),
        where("estatus", "==", "Pagado"),
        where("doctorId", "==", medicoId), // Filtro directo en servidor
        where("fechaPago", ">=", start),
        where("fechaPago", "<=", end),
        orderBy("fechaPago", "desc")
      );

      const snapshot = await getDocs(q);
      let totalCobrado = 0;

      // 🧠 MEMORIA TEMPORAL (Caché de Pacientes)
      // Esto evita buscar al mismo paciente múltiples veces
      const cachePacientes: Record<string, any> = {};

      // Procesamiento
      const promesas = snapshot.docs.map(async (docOp) => {
        const data = docOp.data();
        
        // Nota: Como ya filtramos por doctorId en la query, 
        // ya no necesitamos los "if (coincideID...)" aquí. Todos son de este médico.
            
        // --- LÓGICA DE FACTURA OPTIMIZADA ---
        let pideFactura = "No";
        
        if (data.pacienteId && data.pacienteId !== "EXTERNO") {
            try {
                // VERIFICAMOS SI YA LO BUSCAMOS ANTES (Caché)
                if (!cachePacientes[data.pacienteId]) {
                    // Si no está en memoria, lo buscamos y guardamos la promesa
                    const pacRef = doc(db, "pacientes", data.pacienteId);
                    cachePacientes[data.pacienteId] = getDoc(pacRef).then(snap => snap.exists() ? snap.data() : null);
                }

                // Usamos el dato de la memoria (Instantáneo si ya se cargó)
                const pData = await cachePacientes[data.pacienteId];
                
                if (pData?.datosFiscales?.rfc && pData.datosFiscales.rfc.length > 10) {
                    pideFactura = "Sí";
                }
            } catch (e) { console.warn("Error verificando factura", e); }
        }

        const monto = Number(data.monto) || 0;
        totalCobrado += monto;
        
        return {
            id: docOp.id,
            fecha: data.fechaPago?.seconds ? new Date(data.fechaPago.seconds * 1000).toLocaleDateString('es-MX') : "S/F",
            paciente: data.pacienteNombre,
            concepto: data.servicioNombre,
            formaPago: data.metodoPago || "No especificado",
            factura: pideFactura,
            monto: monto
        };
      });

      const resultados = await Promise.all(promesas);
      // Filtramos nulos por si acaso (aunque con la nueva query no debería haber)
      const filtrados = resultados.filter(r => r !== null);

      const comision = totalCobrado * porcentaje;
      const aPagar = totalCobrado - comision;

      setMovimientos(filtrados);
      setResumen({
        cobrado: totalCobrado,
        comisionSansce: comision,
        aPagarMedico: aPagar
      });

      if (filtrados.length === 0) toast.info("No se encontraron movimientos para este médico en el periodo.");

    } catch (error) {
      console.error(error);
      toast.error("Error generando el corte.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Enviar Correo
  const handleEnviarCorreo = async () => {
    const medico = medicos.find(m => m.id === medicoId);
    if (!medico?.email) return toast.error("Este médico no tiene email configurado en Google Sheets.");

    if (!confirm(`¿Enviar reporte a ${medico.email}?`)) return;

    setEnviando(true);
    try {
        const resultado = await enviarCorteMedicoAction({
            medicoNombre: medico.nombre,
            medicoEmail: medico.email,
            periodo: `${fechaInicio} al ${fechaFin}`,
            resumen: { 
                cobrado: resumen.cobrado, 
                comision: resumen.comisionSansce, 
                pagar: resumen.aPagarMedico 
            },
            movimientos: movimientos
        });

        if (resultado.success) {
            toast.success("✅ Correo enviado exitosamente");
        } else {
            toast.error("Error del servidor: " + resultado.error);
        }
    } catch (e) {
        console.error(e);
        toast.error("Error de comunicación al enviar correo.");
    } finally {
        setEnviando(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          
          <div className="flex items-center gap-4 mb-6">
            <Link href="/reportes" className="text-slate-500 hover:text-blue-600 font-bold text-xl">←</Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Liquidación de Profesionales</h1>
              <p className="text-sm text-slate-500">Cálculo de nómina variable y validación</p>
            </div>
          </div>

          {/* CONTROLES */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Seleccionar Médico</label>
                    {/* 🚨 CAMBIO CLAVE: Usamos m.id en el value, no m.nombre */}
                    <select 
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-700 font-medium"
                        value={medicoId}
                        onChange={e => setMedicoId(e.target.value)}
                    >
                        <option value="">-- Elige un profesional --</option>
                        {medicos.map((m) => (
                            <option key={m.id} value={m.id}>{m.nombre}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Desde</label>
                    <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-full border p-2 rounded-lg" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hasta</label>
                    <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="w-full border p-2 rounded-lg" />
                </div>
            </div>
            
            <button 
                onClick={generarCorte}
                disabled={loading}
                className="mt-4 w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition-colors shadow-md flex justify-center gap-2 disabled:opacity-50"
            >
                {loading ? "Analizando..." : "🧮 Calcular Liquidación"}
            </button>
          </div>

          {/* RESULTADOS */}
          {movimientos.length > 0 && (
            <div className="animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
                      <p className="text-xs font-bold text-slate-400 uppercase">Cobrado Total</p>
                      <p className="text-3xl font-bold text-slate-800 mt-2">${resumen.cobrado.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
                      <p className="text-xs font-bold text-slate-400 uppercase">Retención Clínica</p>
                      <p className="text-3xl font-bold text-slate-400 mt-2">-${resumen.comisionSansce.toLocaleString()}</p>
                  </div>
                  <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-200 shadow-sm text-center relative overflow-hidden">
                      <p className="text-xs font-bold text-indigo-500 uppercase">A Pagar al Médico</p>
                      <p className="text-4xl font-extrabold text-indigo-700 mt-2">${resumen.aPagarMedico.toLocaleString()}</p>
                  </div>
              </div>

              {/* BOTÓN DE ENVÍO DE CORREO */}
              <div className="flex justify-end mb-4">
                 <button 
                    onClick={handleEnviarCorreo}
                    disabled={enviando}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg shadow flex items-center gap-2 disabled:opacity-50"
                 >
                    {enviando ? "Enviando..." : "📧 Enviar Corte y Solicitar Validación"}
                 </button>
              </div>

              {/* TABLA DETALLADA */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                    <h3 className="font-bold text-slate-700">Desglose de Movimientos</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-indigo-600 text-white uppercase text-xs font-bold">
                            <tr>
                                <th className="px-4 py-3">Fecha</th>
                                <th className="px-4 py-3">Paciente</th>
                                <th className="px-4 py-3">Concepto</th>
                                <th className="px-4 py-3">Forma Pago</th>
                                <th className="px-4 py-3 text-center">Factura</th>
                                <th className="px-4 py-3 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {movimientos.map((mov) => (
                                <tr key={mov.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{mov.fecha}</td>
                                    <td className="px-4 py-3 font-bold text-slate-700">{mov.paciente}</td>
                                    <td className="px-4 py-3 text-slate-600 text-xs">{mov.concepto}</td>
                                    <td className="px-4 py-3">{mov.formaPago}</td>
                                    
                                    {/* Columna Visual de Factura */}
                                    <td className="px-4 py-3 text-center">
                                        {mov.factura === "Sí" ? (
                                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-200">
                                                SÍ
                                            </span>
                                        ) : (
                                            <span className="text-slate-300 text-xs">-</span>
                                        )}
                                    </td>
                                    
                                    <td className="px-4 py-3 text-right font-bold text-slate-800">${mov.monto.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
}