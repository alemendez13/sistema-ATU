"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Button from "../../../../components/ui/Button";
import { agendarCitaGoogle } from "../../../../lib/actions"; // Importar función de agenda
import { descontarStockPEPS } from "../../../../lib/inventoryController";

interface Props {
  pacienteId: string;
  servicios: any[];
  medicos: any[]; // <--- AHORA RECIBIMOS MÉDICOS TAMBIÉN
}

export default function VentaForm({ pacienteId, servicios, medicos }: Props) {
  const [servicioSku, setServicioSku] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  // Estados para Agenda (Solo si es servicio)
  const [esServicio, setEsServicio] = useState(false);
  const [medicoId, setMedicoId] = useState("");
  const [fechaCita, setFechaCita] = useState("");
  const [horaCita, setHoraCita] = useState("");

  // Buscar detalles del servicio seleccionado
  const servicioSeleccionado = servicios.find(s => s.sku === servicioSku);

  useEffect(() => {
    if (servicioSeleccionado?.tipo === 'Servicio') {
        setEsServicio(true);
    } else {
        setEsServicio(false);
        setMedicoId("");
    }
  }, [servicioSku, servicioSeleccionado]);

  // Filtrar médicos por el área del servicio seleccionado
  const medicosDisponibles = medicos.filter(m => 
    !servicioSeleccionado?.area || m.especialidad === servicioSeleccionado.area || m.especialidad === "General"
  );

  const handleVenta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!servicioSku) return;
    
    // Validación de Agenda
    if (esServicio && (!medicoId || !fechaCita || !horaCita)) {
        toast.error("Para servicios médicos, debes seleccionar doctor, fecha y hora.");
        return;
    }

    setLoading(true);

    try {
      const pDoc = await getDoc(doc(db, "pacientes", pacienteId));
      const pNombre = pDoc.exists() ? pDoc.data().nombreCompleto : "Desconocido";
      const medicoElegido = medicos.find(m => m.id === medicoId);

      // 1. Crear OPERACIÓN (Deuda)
      await addDoc(collection(db, "operaciones"), {
        pacienteId,
        pacienteNombre: pNombre,
        servicioSku: servicioSeleccionado.sku,
        servicioNombre: servicioSeleccionado.nombre,
        monto: servicioSeleccionado.precio,
        fecha: serverTimestamp(),
        estatus: "Pendiente de Pago",
        // Datos extra si es cita
        esCita: esServicio,
        doctorId: medicoId || null,
        doctorNombre: medicoElegido?.nombre || null,
        fechaCita: fechaCita || null,
        horaCita: horaCita || null
      });

      // Si NO es servicio (es decir, es producto tangible), descontamos inventario
if (!esServicio) {
    try {
        await descontarStockPEPS(
            servicioSeleccionado.sku, 
            servicioSeleccionado.nombre, 
            1 // O la cantidad que se venda
        );
        toast.success("Inventario actualizado");
    } catch (stockError) {
        console.error(stockError);
        toast.warning("Venta registrada pero hubo error al descontar stock.");
    }
}

      // 2. Si es servicio, AGENDAR EN GOOGLE Y FIREBASE (Citas)
      if (esServicio && medicoElegido) {
        // a. Guardar en colección 'citas' (Agenda Interna)
        await addDoc(collection(db, "citas"), {
            doctorId: medicoId,
            doctorNombre: medicoElegido.nombre,
            paciente: pNombre,
            motivo: servicioSeleccionado.nombre,
            fecha: fechaCita,
            hora: horaCita,
            creadoEn: new Date()
        });

        // b. Guardar en Google Calendar
        const duracion = parseInt(servicioSeleccionado.duracion || "30");
        await agendarCitaGoogle({
            doctorId: medicoId,
            doctorNombre: medicoElegido.nombre,
            calendarId: medicoElegido.calendarId,
            pacienteNombre: pNombre,
            motivo: servicioSeleccionado.nombre,
            fecha: fechaCita,
            hora: horaCita,
            duracionMinutos: duracion
        });
      }

      toast.success(esServicio ? "✅ Cita agendada y cargo generado." : "✅ Venta registrada.");
      router.push("/finanzas"); 

    } catch (error) {
      console.error(error);
      toast.error("Error al procesar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 flex justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full h-fit border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            🛒 Nueva Venta / Cita
        </h1>
        
        <form onSubmit={handleVenta} className="space-y-6">
          
          {/* SELECCIÓN DE PRODUCTO */}
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">Producto o Servicio</label>
            <select 
              className="w-full border p-3 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
              value={servicioSku}
              onChange={e => setServicioSku(e.target.value)}
              required
            >
              <option value="">-- Seleccionar del Catálogo --</option>
              {servicios.map(s => (
                <option key={s.sku} value={s.sku}>
                    {s.nombre} ({s.tipo}) - {s.precio}
                </option>
              ))}
            </select>
          </div>

          {/* OBSERVACIONES (Información Visual) */}
          {servicioSeleccionado?.observaciones && (
             <div className="bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400 text-sm text-yellow-800">
                <strong>📝 Nota:</strong> {servicioSeleccionado.observaciones}
             </div>
          )}

          {/* --- BLOQUE DE AGENDA (Solo aparece si es Servicio) --- */}
          {esServicio && (
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 animate-fade-in">
                <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                    📅 Agendar Cita 
                    <span className="text-xs font-normal bg-blue-200 px-2 py-1 rounded text-blue-800">
                        Área: {servicioSeleccionado?.area}
                    </span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Selector de Médico (Filtrado) */}
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Profesional</label>
                        <select 
                            className="w-full border p-2 rounded"
                            value={medicoId}
                            onChange={e => setMedicoId(e.target.value)}
                            required
                        >
                            <option value="">-- Elegir Doctor --</option>
                            {medicosDisponibles.map(m => (
                                <option key={m.id} value={m.id}>{m.nombre}</option>
                            ))}
                        </select>
                    </div>

                    {/* Fecha */}
                    <div>
                        <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Fecha</label>
                        <input 
                            type="date" 
                            className="w-full border p-2 rounded"
                            value={fechaCita}
                            onChange={e => setFechaCita(e.target.value)}
                            required
                        />
                    </div>

                    {/* Hora */}
                    <div>
                        <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Hora</label>
                        <input 
                            type="time" 
                            className="w-full border p-2 rounded"
                            value={horaCita}
                            onChange={e => setHoraCita(e.target.value)}
                            required
                        />
                    </div>
                </div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => router.back()} className="flex-1 py-3 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                Cancelar
            </button>
            <Button type="submit" isLoading={loading} className="flex-1 py-3 text-lg shadow-md">
                {esServicio ? "Confirmar Cita y Cargo" : "Generar Nota de Venta"}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}