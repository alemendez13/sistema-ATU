/* app/configuracion/auditoria/page.tsx */

"use client";

import { useState } from 'react';
import { auditCollectionBatchAction, updateRecordManualAction, searchIndividualAction, repairPatientFolioAction } from '@/lib/actions';
import SubNavbarGestion from '@/components/SubNavbarGestion';
import { Search, X, Edit3 } from 'lucide-react'; // ✅ Iconos para el buscador

export default function AuditoriaPage() {
    const [coleccion, setColeccion] = useState('pacientes');
    const [resultados, setResultados] = useState<any[]>([]);
    const [lastId, setLastId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // --- ESTADOS PARA EL BUSCADOR EMERGENTE ---
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchList, setSearchList] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // --- ESTADOS PARA EL FORMULARIO DE EDICIÓN ---
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<any>(null); // Datos del registro a editar
    const [formValues, setFormValues] = useState({
        nombre: '',
        folio: '',
        curp: '',
        fechaCita: ''
    });

    // 1. FUNCIÓN DE PROCESAMIENTO POR LOTES (100 en 100)
    const ejecutarLote = async () => {
        setLoading(true);
        const res = await auditCollectionBatchAction(coleccion, lastId || undefined);
        
        if (res.success && res.report) {
            // ✅ CORRECCIÓN TS: Aseguramos que 'report' sea un array antes de usarlo
            setResultados(prev => [...prev, ...res.report!]);
            // ✅ CORRECCIÓN TS: Usamos ?? null para evitar que 'undefined' rompa el estado
            setLastId(res.lastId ?? null);
        } else {
            alert("Error en el lote: " + res.error);
        }
        setLoading(false);
    };

    // 2. FUNCIÓN DE CORRECCIÓN QUIRÚRGICA INDIVIDUAL
    const corregirDato = async (id: string, campo: string, valor: string) => {
        const confirmacion = confirm(`¿Desea corregir el campo [${campo}] a: "${valor}"?`);
        if (!confirmacion) return;

        const res = await updateRecordManualAction(coleccion, id, { [campo]: valor });
        if (res.success) {
            alert("Registro actualizado. Ejecute el lote de nuevo para validar.");
        } else {
            alert("Error: " + res.error);
        }
    };

    // 3. LÓGICA DEL BUSCADOR INDIVIDUAL
    const handleSearch = async () => {
        if (!searchTerm.trim()) return;
        setIsSearching(true);
        const res = await searchIndividualAction(coleccion, searchTerm);
        if (res.success) {
            setSearchList(res.results || []);
        }
        setIsSearching(false);
    };

    // 4. INTEGRAR RESULTADO A LA MESA DE TRABAJO
    const seleccionarResultado = (item: any) => {
        // Si el registro ya está en la tabla, no lo duplicamos
        if (!resultados.find(r => r.id === item.id)) {
            setResultados(prev => [item, ...prev]);
        }
        setIsSearchOpen(false);
        setSearchTerm('');
        setSearchList([]);
    };

    // 5. PREPARAR EDICIÓN (Carga los datos actuales al formulario)
    const abrirEditor = (item: any) => {
        setEditTarget(item);
        setFormValues({
            nombre: item.referencia || '',
            folio: item.folio !== 'N/A' ? item.folio : '',
            curp: item.curp || '', // ✅ Ahora precarga el CURP si existe
            fechaCita: item.fechaCita || '' // ✅ Precarga fecha si es operación
        });
        setIsEditOpen(true);
    };

    // 6. GUARDAR CAMBIOS QUIRÚRGICOS
    const guardarEdicion = async () => {
        if (!editTarget) return;
        
        const updates: any = {};
        // 🛡️ Reglas de Mapeo SANSCE OS
        if (formValues.nombre) updates[coleccion === 'pacientes' ? 'nombreCompleto' : 'paciente'] = formValues.nombre;
        if (formValues.folio) updates.folioExpediente = formValues.folio;
        if (formValues.curp && coleccion === 'pacientes') updates.curp = formValues.curp;
        
        // 📅 Trazabilidad Sagrada: Solo inyectamos fechaCita en la colección correcta
        if (formValues.fechaCita && coleccion === 'operaciones') {
            updates.fechaCita = formValues.fechaCita;
        }

        const res = await updateRecordManualAction(coleccion, editTarget.id, updates);
        
        if (res.success) {
            alert("✅ Cambio aplicado con trazabilidad.");
            setIsEditOpen(false);
            // Actualizamos la vista local sin recargar
            setResultados(prev => prev.map(r => r.id === editTarget.id ? { ...r, referencia: formValues.nombre, folio: formValues.folio, estatus: 'Correcto' } : r));
        } else {
            alert("❌ Error: " + res.error);
        }
    };

    // 7. REPARACIÓN MASIVA DE FOLIOS (Saneamiento de Lote)
    const repararFoliosLote = async () => {
        const incompletos = resultados.filter(r => r.errores.includes('Falta Folio SANSCE'));
        if (incompletos.length === 0) return alert("No hay folios pendientes por reparar en este lote.");
        
        if (!confirm(`¿Desea generar automáticamente ${incompletos.length} folios bajo norma SSA?`)) return;

        setLoading(true);
        for (const item of incompletos) {
            await repairPatientFolioAction(item.id);
        }
        
        alert("✅ Saneamiento completado. Refrescando auditoría...");
        setResultados([]); // Limpiamos para forzar nueva lectura
        setLastId(null);
        ejecutarLote();
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* ✅ Nombre de Módulo Actualizado */}
            <div className="mb-2">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Sistema de Gestión</span>
                <h1 className="text-3xl font-extrabold text-gray-900">Auditoría de Integridad SSA</h1>
            </div>

            <SubNavbarGestion /> {/* ✅ Sub-Navbar Activo */}
            
            {/* --- BARRA DE CONTROL UNIFICADA SANSCE --- */}
            <div className="bg-blue-50 p-5 rounded-xl mb-6 flex items-end justify-between border border-blue-200 shadow-sm">
                <div className="flex gap-4 items-end">
                    <div>
                        <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Colección</label>
                        <select 
                            value={coleccion} 
                            onChange={(e) => { setColeccion(e.target.value); setResultados([]); setLastId(null); }}
                            className="block w-48 rounded-lg border-gray-300 py-2 pl-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="pacientes">Pacientes (NOM-004)</option>
                            <option value="citas">Citas (Agenda)</option>
                            <option value="operaciones">Operaciones (Finanzas)</option>
                        </select>
                    </div>

                    <button 
                        onClick={() => setIsSearchOpen(true)}
                        className="flex items-center gap-2 bg-white border border-blue-300 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-semibold text-sm transition-all"
                    >
                        <Search size={16} />
                        Localizar Específico
                    </button>
                </div>
                
                <button 
                    onClick={ejecutarLote}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold disabled:bg-gray-400 transition-all shadow-md active:scale-95"
                >
                    {loading ? "Procesando Lote..." : resultados.length > 0 ? "Auditar Siguientes 100" : "Iniciar Auditoría Masiva"}
                </button>
            </div>

            {/* BOTÓN DE SANEAMIENTO AUTOMÁTICO */}
            {resultados.some(r => r.errores.includes('Falta Folio SANSCE')) && (
                <div className="mb-4 flex justify-end animate-in fade-in slide-in-from-right-4 duration-500">
                    <button 
                        onClick={repararFoliosLote}
                        className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-all flex items-center gap-2 shadow-sm"
                    >
                        ✨ Reparar {resultados.filter(r => r.errores.includes('Falta Folio SANSCE')).length} folios faltantes en este lote
                    </button>
                </div>
            )}

            {/* --- MODAL EMERGENTE DE BÚSQUEDA --- */}
            {isSearchOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h2 className="font-bold text-gray-800">Localizar en {coleccion}</h2>
                            <button onClick={() => setIsSearchOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                        </div>
                        <div className="p-6">
                            <div className="flex gap-2 mb-4">
                                <input 
                                    type="text"
                                    placeholder="Nombre, Apellido o Folio..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    autoFocus
                                />
                                <button onClick={handleSearch} disabled={isSearching} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
                                    {isSearching ? '...' : 'Buscar'}
                                </button>
                            </div>

                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {searchList.map(res => (
                                    <div 
                                        key={res.id} 
                                        onClick={() => seleccionarResultado(res)}
                                        className="flex justify-between items-center p-3 border rounded-xl hover:bg-blue-50 cursor-pointer transition-colors group"
                                    >
                                        <div>
                                            <p className="font-bold text-sm text-gray-900 group-hover:text-blue-700">{res.referencia}</p>
                                            <p className="text-xs text-gray-500">{res.folio}</p>
                                        </div>
                                        <Edit3 size={16} className="text-gray-300 group-hover:text-blue-500" />
                                    </div>
                                ))}
                                {searchList.length === 0 && !isSearching && searchTerm && (
                                    <p className="text-center text-gray-400 py-4 text-sm">No se encontraron coincidencias exactas.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL DE EDICIÓN QUIRÚRGICA (NIVEL FINAL) --- */}
            {isEditOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[70] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* Cabecera Técnica */}
                        <div className="p-5 border-b bg-slate-50 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Corrección de Identidad</h2>
                                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Doc ID: {editTarget?.id}</p>
                            </div>
                            <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Cuerpo del Formulario Quirúrgico */}
                        <div className="p-6 space-y-5">
                            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex gap-3 items-start">
                                <div className="text-amber-500 mt-0.5">🛡️</div>
                                <p className="text-[11px] text-amber-800 leading-tight">
                                    <strong>Blindaje de Trazabilidad:</strong> Los montos financieros y fechas de pago están bloqueados por seguridad. Solo se permiten cambios en datos de identidad SSA.
                                </p>
                            </div>

                            {/* Campo 1: Nombre */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">Nombre Completo / Referencia</label>
                                <input 
                                    type="text"
                                    value={formValues.nombre}
                                    onChange={(e) => setFormValues({...formValues, nombre: e.target.value.toUpperCase()})}
                                    className="w-full border-slate-200 border rounded-lg px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="NOMBRE DEL PACIENTE"
                                />
                            </div>

                            {/* Campo 2: Folio */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">Folio SANSCE (Expediente SSA)</label>
                                <input 
                                    type="text"
                                    value={formValues.folio}
                                    onChange={(e) => setFormValues({...formValues, folio: e.target.value.toUpperCase()})}
                                    className="w-full border-slate-200 border rounded-lg px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="SANSCE-2026-XXXX"
                                />
                            </div>

                            {/* Campo 3: CURP (Solo si es Pacientes) */}
                            {coleccion === 'pacientes' && (
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">CURP (18 Dígitos)</label>
                                    <input 
                                        type="text"
                                        value={formValues.curp}
                                        onChange={(e) => setFormValues({...formValues, curp: e.target.value.toUpperCase()})}
                                        className="w-full border-slate-200 border rounded-lg px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                                        maxLength={18}
                                        placeholder="AAAA000000XXXXXX00"
                                    />
                                </div>
                            )}

                            {/* Campo 4: Fecha de Cita (SOLO OPERACIONES) */}
                            {coleccion === 'operaciones' && (
                                <div>
                                    <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1 tracking-wider">
                                        Fecha de Cita (Trazabilidad Nómina)
                                    </label>
                                    <input 
                                        type="date"
                                        value={formValues.fechaCita}
                                        onChange={(e) => setFormValues({...formValues, fechaCita: e.target.value})}
                                        className="w-full border-blue-100 bg-blue-50/50 border rounded-lg px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                    <p className="text-[9px] text-blue-400 mt-1 italic">
                                        * Formato requerido: AAAA-MM-DD para compatibilidad con reportes.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Pie de Modal - Acciones Ejecutivas */}
                        <div className="p-4 bg-slate-50 border-t flex gap-3 justify-end">
                            <button 
                                onClick={() => setIsEditOpen(false)}
                                className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                DESCARTAR
                            </button>
                            <button 
                                onClick={guardarEdicion}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl text-sm font-extrabold shadow-lg shadow-indigo-200 transition-all active:scale-95"
                            >
                                APLICAR CAMBIOS
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TABLA DE RESULTADOS DE TRAZABILIDAD */}
            <div className="overflow-x-auto bg-white shadow rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referencia / Folio</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estatus SSA</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brechas Identificadas</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {resultados.map((item) => (
                            <tr key={item.id} className={item.estatus === 'Incompleto' ? 'bg-red-50' : ''}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <div className="font-bold text-gray-900">{item.referencia}</div>
                                    <div className="text-gray-500">{item.folio}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${item.estatus === 'Correcto' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {item.estatus}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {item.errores && item.errores.length > 0 ? item.errores.join(', ') : '✅ Sin observaciones'}
                                </td>
                                <td className="px-6 py-4 text-center text-sm space-x-4">
                                    <button 
                                        onClick={() => abrirEditor(item)}
                                        className="text-indigo-600 hover:text-indigo-900 font-bold"
                                    >
                                        Editar
                                    </button>
                                    {item.estatus === 'Incompleto' && (
                                        <button 
                                            onClick={() => corregirDato(item.id, 'elaboradoPor', 'admin@sansce.com')}
                                            className="text-blue-600 hover:text-blue-900 underline text-xs"
                                        >
                                            Firma Rápida
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {resultados.length === 0 && !loading && (
                    <div className="p-10 text-center text-gray-400">
                        Seleccione una colección y presione iniciar para comenzar el diagnóstico.
                    </div>
                )}
            </div>

            {/* --- TABLA DE PROGRESO Y CHECKLIST DE INTEGRIDAD (Punto 5) --- */}
            <div className="mt-12 border-t pt-8">
                <div className="flex items-center gap-2 mb-6 text-slate-800">
                    <div className="bg-indigo-600 p-2 rounded-lg text-white font-bold text-xs">Punto 5</div>
                    <h2 className="text-xl font-extrabold uppercase tracking-tight">Checklist de Integridad del Ecosistema</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Tarjeta de Progreso: Pacientes */}
                    <div className="bg-white border rounded-2xl p-6 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-sm font-bold text-slate-500 uppercase">Integridad Pacientes</span>
                            <span className="text-2xl font-black text-indigo-600">
                                {resultados.length > 0 ? Math.round((resultados.filter(r => r.estatus === 'Correcto').length / resultados.length) * 100) : 0}%
                            </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                                className="bg-indigo-500 h-full transition-all duration-1000" 
                                style={{ width: `${resultados.length > 0 ? (resultados.filter(r => r.estatus === 'Correcto').length / resultados.length) * 100 : 0}%` }}
                            ></div>
                        </div>
                        <ul className="mt-6 space-y-3">
                            <li className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                <div className={`w-2 h-2 rounded-full ${resultados.length > 0 ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                Diagnóstico Masivo Iniciado
                            </li>
                            <li className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                <div className={`w-2 h-2 rounded-full ${resultados.some(r => r.errores.includes('Sin firma digital')) ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
                                Firma Digital (elaboradoPor)
                            </li>
                            <li className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                <div className={`w-2 h-2 rounded-full ${resultados.some(r => r.errores.includes('CURP ausente')) ? 'bg-red-500' : 'bg-slate-300'}`}></div>
                                Validación CURP (SSA)
                            </li>
                        </ul>
                    </div>

                    {/* Tarjeta de Trazabilidad: Operaciones */}
                    <div className="bg-white border rounded-2xl p-6 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-sm font-bold text-slate-500 uppercase">Integridad Financiera</span>
                            <span className="text-2xl font-black text-emerald-600">--</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mb-4 italic">Se requiere diagnóstico de la colección "operaciones" para medir progreso.</p>
                        <div className="space-y-3">
                            <div className="flex justify-between text-xs border-b pb-2">
                                <span className="text-slate-500">Monto Nulo</span>
                                <span className="font-bold text-slate-700">Auditando...</span>
                            </div>
                            <div className="flex justify-between text-xs border-b pb-2">
                                <span className="text-slate-500">Pagos sin Fecha</span>
                                <span className="font-bold text-slate-700">Auditando...</span>
                            </div>
                        </div>
                    </div>

                    {/* Tarjeta de Cumplimiento: Motor de Búsqueda */}
                    <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Motor de Búsqueda SANSCE</span>
                        <h3 className="text-lg font-bold mt-2 mb-4">Estatus del Indexado</h3>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black">{resultados.filter(r => r.searchReady).length}</span>
                            <span className="text-slate-400 text-sm">/ {resultados.length} registros</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
                            Mide cuántos registros tienen el array <code className="text-indigo-300">searchKeywords</code> activo para ser localizados instantáneamente.
                        </p>
                    </div>
                </div>
            </div>

        </div>
    );
}