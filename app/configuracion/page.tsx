// app/configuracion/page.tsx
"use client";
import React, { useState } from 'react';
import { Users, BookOpen, UserPlus, ShieldCheck, Mail, Briefcase } from 'lucide-react';
import { DatabaseZap } from 'lucide-react';
import { Trash2, ShieldAlert, Clock } from 'lucide-react';
import { useEffect } from 'react';


import { createSANSCEUser, getSANSCEUsers, deleteSANSCEUser, migrateUsersFromSheet, updateSANSCEUser } from '@/lib/actions/users';
import { Pencil, XCircle } from 'lucide-react'; // Nuevos iconos para edición
import { toast } from 'sonner';
import CerebroConocimientoISO from './conocimiento/page'; 

import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, Image as ImageIcon } from 'lucide-react';

export default function CentroDeMando() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };
  const [activeTab, setActiveTab] = useState<'usuarios' | 'conocimiento'>('usuarios');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null); // 👈 Controla quién estamos editando

  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);

  const handleMigration = async () => {
    if (confirm("🚀 ¿Desea iniciar la migración masiva? El sistema sincronizará los usuarios del Excel con Firebase, respetando a los que ya existen.")) {
      setIsMigrating(true);
      const res = await migrateUsersFromSheet();
      if (res.success) {
        toast.success(res.message);
        fetchUsers(); // Refrescamos la tabla para ver a los nuevos
      } else {
        toast.error("Fallo en migración: " + res.error);
      }
      setIsMigrating(false);
    }
  };

  // Función para cargar/refrescar la lista
  const fetchUsers = async () => {
    setLoadingUsers(true);
    const res = await getSANSCEUsers();
    if (res.success) setUsers(res.users);
    setLoadingUsers(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (uid: string, nombre: string) => {
    if (confirm(`⚠️ ¿ESTÁ SEGURO? Esto revocará el acceso de ${nombre} de forma permanente e inmediata.`)) {
      const res = await deleteSANSCEUser(uid);
      if (res.success) {
        toast.success("Acceso revocado correctamente");
        fetchUsers(); // Refrescamos la tabla
      } else {
        toast.error("Error al eliminar: " + res.error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    // 🛡️ GESTIÓN DE IDENTIDAD SANSCE
    const email = editingUser ? editingUser.email : formData.get('email') as string;
    
    const data: any = {
      nombre: formData.get('nombre') as string,
      email: email,
      rol: formData.get('rol') as any,
      especialidad: formData.get('especialidad') as string,
      pin: formData.get('pin') as string,
    };

    // 📸 PROCESAMIENTO DE PATRÓN BIOMÉTRICO (Firebase Storage)
    if (selectedFile) {
      try {
        // Creamos una ruta única por usuario basada en su email
        const fileRef = ref(storage, `fotos_maestras/${email}`);
        await uploadBytes(fileRef, selectedFile);
        data.fotoMaestraUrl = await getDownloadURL(fileRef);
      } catch (uploadError) {
        toast.error("Error crítico al subir la Foto Maestra a la nube");
        setIsSubmitting(false);
        return;
      }
    }

    // 🧠 SINCRONIZACIÓN HÍBRIDA
    const result = editingUser 
      ? await updateSANSCEUser(editingUser.uid, data)
      : await createSANSCEUser(data);
    
    if (result.success) {
      toast.success(editingUser ? "Datos actualizados" : "Usuario creado correctamente");
      
      // 🧼 LIMPIEZA SANSCE: Borramos el rastro de la foto anterior
      setSelectedFile(null); // Vacía el archivo de la memoria
      setPreviewUrl(null);   // Quita la imagen del círculo de vista previa
      
      setEditingUser(null); // Salimos del modo edición
      (e.target as HTMLFormElement).reset();
      fetchUsers(); // Refrescamos la tabla
    } else {
      toast.error("Error: " + result.error);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* Header del Centro de Mando */}
      <div className="max-w-6xl mx-auto mb-8">
        <h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase mb-2">
          Centro de Mando <span className="text-blue-600">SANSCE</span>
        </h1>
        <p className="text-slate-500 font-medium">Gestión estratégica de identidad y conocimiento.</p>
      </div>

      {/* Selector de Pestañas (Tabs) */}
      <div className="max-w-6xl mx-auto mb-6 flex gap-2 p-1 bg-slate-200 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('usuarios')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'usuarios' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Users size={18} /> Personal
        </button>
        <button 
          onClick={() => setActiveTab('conocimiento')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'conocimiento' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <BookOpen size={18} /> Conocimiento (ISO)
        </button>
      </div>

      <div className="max-w-6xl mx-auto">
        {activeTab === 'usuarios' ? (
  <>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            
            {/* Formulario de Gestión (Alta / Edición) */}
            <div className="lg:col-span-1">
              <div className={`p-6 rounded-2xl shadow-sm border transition-all duration-500 ${editingUser ? 'bg-amber-50 border-amber-200 shadow-amber-100' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-start mb-6">
                  <div className={`flex items-center gap-2 ${editingUser ? 'text-amber-600' : 'text-blue-600'}`}>
                    {editingUser ? <Pencil size={24} /> : <UserPlus size={24} />}
                    <h2 className="font-bold text-lg text-slate-800">
                      {editingUser ? 'Editando Personal' : 'Alta de Personal'}
                    </h2>
                  </div>
                  {editingUser && (
                    <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-red-500 transition-colors">
                      <XCircle size={20} />
                    </button>
                  )}
                </div>
                
                <form 
                  key={editingUser?.uid || 'new-user-form'} 
                  onSubmit={handleSubmit} 
                  className="space-y-4"
                >
                  <div>
                    <label className="text-xs font-black uppercase text-slate-400 ml-1">Nombre Completo</label>
                    <input name="nombre" defaultValue={editingUser?.nombre} required className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Ej. Dr. Mario Santos" />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase text-slate-400 ml-1">Correo Institucional</label>
                    <input 
                      name="email" 
                      type="email" 
                      defaultValue={editingUser?.email} 
                      disabled={!!editingUser}
                      required 
                      className={`w-full p-3 border rounded-xl outline-none transition-all ${editingUser ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-slate-200 focus:ring-2 focus:ring-blue-500'}`} 
                      placeholder="usuario@sansce.com" 
                    />
                    {editingUser && <p className="text-[10px] text-amber-600 font-bold mt-1 ml-1">⚠️ El correo no es editable por seguridad.</p>}
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase text-slate-400 ml-1">Rol en Plataforma</label>
                    <select name="rol" defaultValue={editingUser?.rol || 'atu'} className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
                      <option value="atu">ATU (Atención al Usuario)</option>
                      <option value="medico_renta">Médico (Renta)</option>
                      <option value="profesional_salud">Profesional Salud (Nómina)</option>
                      <option value="coordinacion_admin">Coordinación Administrativa</option>
                      <option value="admin_general">Admin General (Acceso Total)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase text-slate-400 ml-1">Especialidad / Área</label>
                    <input name="especialidad" defaultValue={editingUser?.especialidad} className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Ej. Ginecología" />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase text-slate-400 ml-1">PIN de Asistencia (4 dígitos)</label>
                    <input 
                      name="pin" 
                      type="text" 
                      maxLength={4} 
                      pattern="\d{4}"
                      defaultValue={editingUser?.pin} 
                      required 
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                      placeholder="Ej. 1234" 
                    />
                    <p className="text-[9px] text-slate-400 mt-1 ml-1">Este PIN será usado por el colaborador en la Tablet de acceso.</p>
                  </div>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all disabled:bg-slate-300 ${editingUser ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'}`}
                  >
                    {isSubmitting ? "Sincronizando..." : editingUser ? "Guardar Cambios" : "Dar de Alta y Generar Acceso"}
                  </button>
                  <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <label className="text-xs font-black uppercase text-slate-400 block mb-3">Foto Maestra (Patrón Biométrico)</label>
                    
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
                        {previewUrl || editingUser?.fotoMaestraUrl ? (
                          <img src={previewUrl || editingUser?.fotoMaestraUrl} className="w-full h-full object-cover" alt="Preview" />
                        ) : (
                          <Camera className="text-slate-400" size={24} />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <label className="cursor-pointer bg-white border border-slate-200 px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-2 w-fit">
                          <ImageIcon size={14} />
                          {previewUrl || editingUser?.fotoMaestraUrl ? 'Cambiar Foto' : 'Subir Foto Oficial'}
                          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        </label>
                        <p className="text-[9px] text-slate-400 mt-2 italic leading-tight">Use una foto de frente, con buena luz y fondo claro para garantizar el match.</p>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            {/* Panel Informativo de Roles */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-blue-600 rounded-2xl p-8 text-white relative overflow-hidden shadow-xl">
                <ShieldCheck className="absolute right-[-20px] bottom-[-20px] text-blue-500 opacity-20" size={200} />
                <h3 className="text-2xl font-bold mb-2">Seguridad Activa</h3>
                <p className="text-blue-100 mb-6 max-w-md">Al crear un usuario, el sistema genera automáticamente un <b>Gafete Digital</b> encriptado con los permisos específicos de su rol.</p>
                
                    <button 
                    onClick={handleMigration}
                    disabled={isMigrating}
                    className="flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-blue-900 px-4 py-2 rounded-lg font-black text-xs uppercase tracking-tighter transition-all shadow-lg active:scale-95 disabled:bg-slate-400 disabled:text-slate-200 mb-6"
                    >
                    <DatabaseZap size={16} />
                    {isMigrating ? "Procesando Mudanza..." : "Sincronizar Usuarios (Google Sheets)"}
                    </button>
                <div className="flex gap-4">
                  <div className="bg-blue-700/50 p-3 rounded-lg border border-blue-400/30">
                    <p className="text-xs font-bold uppercase opacity-60">Firebase Auth</p>
                    <p className="font-mono text-sm tracking-wider">● CONECTADO</p>
                  </div>
                  <div className="bg-blue-700/50 p-3 rounded-lg border border-blue-400/30">
                    <p className="text-xs font-bold uppercase opacity-60">Matriz RBAC</p>
                    <p className="font-mono text-sm tracking-wider">● ACTUALIZADA</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-start gap-4 shadow-sm">
                  <div className="bg-orange-100 p-3 rounded-xl text-orange-600"><Mail size={24}/></div>
                  <div>
                    <h4 className="font-bold text-slate-800">Email Automatizado</h4>
                    <p className="text-sm text-slate-500">El usuario recibirá un correo con su contraseña temporal y link de acceso.</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-start gap-4 shadow-sm">
                  <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600"><Briefcase size={24}/></div>
                  <div>
                    <h4 className="font-bold text-slate-800">Trazabilidad ISO</h4>
                    <p className="text-sm text-slate-500">Cada alta queda registrada con fecha y responsable en el historial del sistema.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* DASHBOARD DE SALUD DE IDENTIDAD (SOLO NUMÉRICO) */}
          <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
            {[
              { label: 'Admin Gral', rol: 'admin_general', color: 'border-purple-500 text-purple-600' },
              { label: 'Coord. Admin', rol: 'coordinacion_admin', color: 'border-blue-500 text-blue-600' },
              { label: 'Personal ATU', rol: 'atu', color: 'border-cyan-500 text-cyan-600' },
              { label: 'Médicos (Renta)', rol: 'medico_renta', color: 'border-emerald-500 text-emerald-600' },
              { label: 'Salud (Nómina)', rol: 'profesional_salud', color: 'border-slate-500 text-slate-600' },
            ].map((stat) => (
              <div key={stat.rol} className={`bg-white p-4 rounded-2xl border-l-4 shadow-sm ${stat.color}`}>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{stat.label}</p>
                <p className="text-3xl font-black italic">
                  {users.filter(u => u.rol === stat.rol).length}
                </p>
              </div>
            ))}
          </div>

          {/* TABLA DE SUPERVISIÓN DE PERSONAL */}
            <div className="lg:col-span-3 mt-8">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="text-slate-400" size={20} />
                    <h3 className="font-bold text-slate-800 tracking-tight uppercase text-sm">Personal con Acceso Activo</h3>
                  </div>
                  <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-2 py-1 rounded-full uppercase">
                    {users.length} Usuarios Detectados
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                        <th className="px-6 py-4">Nombre y Especialidad</th>
                        <th className="px-6 py-4">Email / ID</th>
                        <th className="px-6 py-4">Rol en Plataforma</th>
                        <th className="px-6 py-4">Fecha de Alta</th>
                        <th className="px-6 py-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loadingUsers ? (
                        <tr><td colSpan={5} className="p-10 text-center text-slate-400 font-medium">Sincronizando con Firebase Auth...</td></tr>
                      ) : users.map((u) => (
                        <tr key={u.uid} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-700 text-sm">{u.nombre}</p>
                            <p className="text-xs text-slate-400 font-medium italic">{u.especialidad}</p>
                          </td>
                          <td className="px-6 py-4 text-xs font-mono text-slate-500">{u.email}</td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase border ${
                              u.rol === 'admin_general' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                              u.rol === 'atu' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>
                              {u.rol?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400">
                            <div className="flex items-center gap-1">
                              <Clock size={12} /> {u.fechaCreacion ? new Date(u.fechaCreacion).toLocaleDateString() : 'Desconocida'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => {
                                  setEditingUser(u);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="p-2 text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                title="Editar Usuario"
                              >
                                <Pencil size={18} />
                              </button>
                              
                              <button 
                                onClick={() => handleDelete(u.uid, u.nombre)}
                                className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Revocar Acceso"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
          </div>
        </div>
      </>
    ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Renderiza tu componente actual del Cerebro */}
            <CerebroConocimientoISO />
          </div>
        )}
      </div>
    </div>
  );
}