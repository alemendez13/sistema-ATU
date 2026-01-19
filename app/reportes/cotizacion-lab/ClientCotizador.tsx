/* app/reportes/cotizacion-lab/ClientCotizador.tsx */
"use client";
import { useState, useEffect } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer"; 
import CotizacionLabPDF from "../../../components/documents/CotizacionLabPDF";
import Link from "next/link";
import { collection, query, where, getDocs, limit } from "@/lib/firebase-guard";
import { db } from "../../../lib/firebase";
import { cleanPrice } from "../../../lib/utils";

export default function ClientCotizador({ catalogo, medicos }: { catalogo: any[], medicos: any[] }) {
  // Estados
  const [pacienteInput, setPacienteInput] = useState(""); 
  const [medicoInput, setMedicoInput] = useState("");     
  const [resultadosPacientes, setResultadosPacientes] = useState<any[]>([]);
  const [busquedaEstudio, setBusquedaEstudio] = useState("");
  const [itemsSeleccionados, setItemsSeleccionados] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Evitar hidratación incorrecta
  useEffect(() => setIsClient(true), []);

  // 1. BUSCADOR DE PACIENTES (Firebase)
  useEffect(() => {
    const buscar = async () => {
      if (pacienteInput.length < 3) {
        setResultadosPacientes([]);
        return;
      }

      try {
        const q = query(
            collection(db, "pacientes"),
            where("nombreCompleto", ">=", pacienteInput.toUpperCase()),
            where("nombreCompleto", "<=", pacienteInput.toUpperCase() + '\uf8ff'),
            limit(5)
        );
        const snap = await getDocs(q);
        setResultadosPacientes(snap.docs.map(d => d.data()));
      } catch (e) {
        console.error("Error buscando pacientes", e);
      }
    };

    const timer = setTimeout(buscar, 300);
    return () => clearTimeout(timer);
  }, [pacienteInput]);

  const seleccionarPaciente = (nombre: string) => {
      setPacienteInput(nombre); 
      setResultadosPacientes([]); 
  };

  // 2. FILTRO DE ESTUDIOS (Local)
  const resultadosEstudios = busquedaEstudio.length > 0 
    ? catalogo.filter(c => 
        c.nombre.toLowerCase().includes(busquedaEstudio.toLowerCase()) || 
        c.sku.includes(busquedaEstudio.toUpperCase())
      ).slice(0, 10) 
    : [];

  const agregarItem = (item: any) => {
    const itemLimpio = { ...item, precio: cleanPrice(item.precio) };
    setItemsSeleccionados([...itemsSeleccionados, itemLimpio]);
    setBusquedaEstudio(""); 
  };

  const quitarItem = (index: number) => {
    const nuevos = [...itemsSeleccionados];
    nuevos.splice(index, 1);
    setItemsSeleccionados(nuevos);
  };

  const total = itemsSeleccionados.reduce((acc, curr) => acc + (curr.precio || 0), 0);

  const datosPDF = {
      paciente: pacienteInput.toUpperCase() || "PÚBLICO EN GENERAL",
      medico: medicoInput || "SANSCE",
      items: itemsSeleccionados,
      fecha: new Date().toLocaleDateString()
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* IZQUIERDA: DATOS */}
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/pacientes" className="text-2xl text-slate-400 hover:text-blue-600">←</Link>
                <h1 className="text-2xl font-bold text-slate-800">Cotizador de Laboratorio</h1>
            </div>

            {/* AVISO DE CONEXIÓN (Solo aparece si falló Google Sheets) */}
            {catalogo.length === 0 && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">
                    ⚠️ <strong>Modo Sin Conexión:</strong> No se pudo conectar con el catálogo de precios. Verifica tu conexión a Google Sheets.
                </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4 relative">
                <div className="relative">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Paciente</label>
                    <input 
                        className="w-full border p-2 rounded uppercase" 
                        value={pacienteInput} 
                        onChange={e => setPacienteInput(e.target.value)}
                        placeholder="Buscar o escribir nuevo..." 
                        autoComplete="off"
                    />
                    
                    {resultadosPacientes.length > 0 && (
                        <div className="absolute z-50 w-full bg-white border border-slate-200 shadow-xl mt-1 rounded-lg max-h-60 overflow-y-auto">
                            {resultadosPacientes.map((p, i) => (
                                <button 
                                    key={i} 
                                    className="w-full text-left p-3 hover:bg-blue-50 border-b border-slate-50 text-sm flex flex-col"
                                    onClick={() => seleccionarPaciente(p.nombreCompleto)}
                                >
                                    <span className="font-bold text-slate-800">{p.nombreCompleto}</span>
                                    <span className="text-xs text-slate-400">Cel: {p.telefonoCelular || "Sin dato"}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Médico Solicitante</label>
                    <select 
                        className="w-full border p-2 rounded bg-white"
                        value={medicoInput}
                        onChange={e => setMedicoInput(e.target.value)}
                    >
                        <option value="">-- Seleccionar Médico --</option>
                        {medicos.map((m, i) => (
                            <option key={i} value={m.nombre}>{m.nombre}</option>
                        ))}
                        <option value="SANSCE">CLÍNICA SANSCE (Directo)</option>
                    </select>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative z-0">
                <label className="block text-xs font-bold text-slate-500 mb-2">Agregar Estudio</label>
                <input 
                    className="w-full border p-3 rounded bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" 
                    value={busquedaEstudio}
                    onChange={e => setBusquedaEstudio(e.target.value)}
                    placeholder="🔍 Ej. Antígeno, Biometría..."
                    disabled={catalogo.length === 0} // Bloquear si no hay datos
                />
                
                {resultadosEstudios.length > 0 && (
                    <div className="mt-2 border rounded bg-white max-h-60 overflow-y-auto shadow-lg absolute w-[90%] z-10">
                        {resultadosEstudios.map((item, i) => (
                            <button 
                                key={i} 
                                onClick={() => agregarItem(item)}
                                className="w-full text-left p-2 hover:bg-blue-50 border-b text-sm flex justify-between items-center"
                            >
                                <div className="flex-1">
                                    <span className="font-bold block">{item.nombre}</span>
                                    <span className="text-[10px] text-slate-400">{item.sku}</span>
                                </div>
                                <span className="font-bold text-blue-600 ml-4">
                                    ${(item.precio || 0).toFixed(2)}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* DERECHA: RESUMEN */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100 flex flex-col h-full">
            <h3 className="font-bold text-slate-700 mb-4 border-b pb-2 flex justify-between">
                <span>Resumen ({itemsSeleccionados.length})</span>
                <span className="text-blue-600 text-lg">${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-2 mb-6">
                {itemsSeleccionados.length === 0 && <p className="text-slate-400 text-center italic py-10">Lista vacía...</p>}
                
                {itemsSeleccionados.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start bg-slate-50 p-3 rounded border border-slate-100">
                        <div className="flex-1 pr-2">
                            <p className="font-medium text-sm text-slate-800">{item.nombre}</p>
                            <p className="text-[10px] text-slate-500 mb-1">{item.tiempo} • {item.muestra}</p>
                            
                            {item.indicacionesPersonal && (
                                <div className="bg-amber-50 text-amber-700 text-[10px] px-2 py-1 rounded border border-amber-100 inline-block mt-1 font-medium">
                                    ⚠️ <strong>Ojo Clínico:</strong> {item.indicacionesPersonal}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className="font-bold text-slate-700 text-sm">${(item.precio || 0).toFixed(2)}</span>
                            <button onClick={() => quitarItem(idx)} className="text-red-400 hover:text-red-600 font-bold text-xs bg-white border px-2 py-0.5 rounded">Quitar</button>
                        </div>
                    </div>
                ))}
            </div>

            {itemsSeleccionados.length > 0 && isClient && (
                <div className="pt-4 border-t">
                    <PDFDownloadLink 
                        document={<CotizacionLabPDF {...datosPDF} />}
                        fileName={`Cotizacion_${datosPDF.paciente.replace(/ /g, '_')}.pdf`}
                        className="block w-full"
                    >
                        {/* @ts-ignore */}
                        {({ blob, url, loading, error }) => (
                            <button 
                                disabled={loading} 
                                className={`w-full py-3 rounded-lg font-bold shadow transition-all ${
                                    loading ? "bg-slate-200 text-slate-500" : "bg-blue-600 text-white hover:bg-blue-700"
                                }`}
                            >
                                {loading ? "Generando Documento..." : "📥 Descargar PDF Listo"}
                            </button>
                        )}
                    </PDFDownloadLink>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}