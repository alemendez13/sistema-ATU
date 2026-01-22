// app/configuracion/conocimiento/page.tsx
"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ExternalLink, FileText, AppWindow, Loader2, 
  ChevronDown, ChevronRight, BookOpen 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from "@/hooks/useAuth";
import { toast } from 'sonner';

// --- CORRECCIÓN DE IMPORTS ---
import { db } from '@/lib/firebase';
// Usamos las funciones oficiales de Firestore para leer el rol
import { doc, getDoc } from 'firebase/firestore'; 

// Definición de tipos
type DocumentoMaestro = {
  codigo: string;
  nombre: string;
  edicion: string;
  modulo: string;
  tipo: 'Documento' | 'Integrado' | 'App Externa';
  estatus_sistema: 'Verde' | 'Amarillo' | 'Rojo';
  roles_acceso: string[];
  ruta_tecnica?: string;
  link_externo?: string;
};

const GROUPS_ORDER = [
  "MG", "PMR", "GEC", "COM", "AUD", "MEJ", "RIE", "MKT", 
  "ATU", "CLI", "EDU", "GEM", "FIN", "RHU", "IYM"
];

export default function CerebroConocimientoISO() {
  const { user } = useAuth(); 
  const router = useRouter();
  
  const [userRole, setUserRole] = useState<string>(""); 
  const [docs, setDocs] = useState<DocumentoMaestro[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // --- EFECTO DE SEGURIDAD CORREGIDO (SOLUCIÓN ERRORES VSC) ---
  useEffect(() => {
    async function fetchRole() {
      // TRUCO: Convertimos 'user' a 'any' para que VS Code nos deje leer el uid
      const currentUser = user as any;

      if (currentUser?.uid) {
        try {
          const roleRef = doc(db, "usuarios_roles", currentUser.uid);
          const roleSnap = await getDoc(roleRef);
          if (roleSnap.exists()) {
            setUserRole(roleSnap.data().rol || "invitado");
          }
        } catch (error) {
          console.error("Error obteniendo rol", error);
        }
      }
    }
    fetchRole();
  }, [user]);

  // Cargar datos desde Google Sheets (API Intermedia)
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/conocimiento'); 
        const data = await res.json();
        // Validación simple para evitar errores si la API falla
        if (Array.isArray(data)) {
          setDocs(data);
        } else {
          console.error("Formato de datos incorrecto:", data);
        }
      } catch (error) {
        console.error(error);
        toast.error("Error conectando con el Cerebro Maestro");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Lógica de Filtrado de Seguridad (RBAC)
  const groupedDocs = useMemo(() => {
    const groups: Record<string, DocumentoMaestro[]> = {};
    GROUPS_ORDER.forEach(g => groups[g] = []);

    if (!user || !userRole) return groups;

    docs.forEach(doc => {
      // Protección contra valores nulos en el Excel
      const rolesPermitidos = doc.roles_acceso || []; 
      const tieneAcceso = rolesPermitidos.includes('all') || rolesPermitidos.includes(userRole);
      
      if (!tieneAcceso && userRole !== 'admin') return; 

      let prefix = (doc.codigo || "").split('-')[0].toUpperCase();
      if (prefix === "GER") prefix = "RIE";
      
      if (groups[prefix]) {
        groups[prefix].push(doc);
      } else {
        if (!groups["OTROS"]) groups["OTROS"] = [];
        groups["OTROS"].push(doc);
      }
    });
    return groups;
  }, [docs, user, userRole]);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const handleNavigation = (doc: DocumentoMaestro) => {
    if (doc.tipo === 'Integrado' && doc.ruta_tecnica) {
      router.push(doc.ruta_tecnica);
    } else if (doc.link_externo) {
      window.open(doc.link_externo, '_blank');
    } else {
      toast.info("Documento en proceso de digitalización.");
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <Loader2 className="animate-spin text-[#78c9cf]" size={48} />
      <span className="ml-3 text-gray-500 font-medium">Sincronizando permisos...</span>
    </div>
  );

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-light text-gray-800 flex items-center gap-3">
            <BookOpen className="text-[#78c9cf]" /> Cerebro de Conocimiento
          </h1>
          <p className="text-gray-500 mt-2 text-sm italic">
            Vista para: <span className="font-bold text-[#78c9cf] uppercase">{userRole || 'Cargando...'}</span>
          </p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          Recargar Matriz
        </button>
      </div>

      <div className="space-y-4">
        {GROUPS_ORDER.map(groupKey => {
          const groupDocs = groupedDocs[groupKey];
          if (!groupDocs || groupDocs.length === 0) return null;
          const isExpanded = expandedGroups[groupKey];

          return (
            <div key={groupKey} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button 
                onClick={() => toggleGroup(groupKey)}
                className="w-full p-4 flex justify-between items-center bg-white hover:bg-gray-50 transition-colors border-b border-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-cyan-50 text-[#78c9cf] flex items-center justify-center font-black text-xs">
                    {groupKey}
                  </div>
                  <span className="font-bold text-gray-700 uppercase tracking-widest text-xs">
                    Capítulo: {groupKey}
                  </span>
                  <span className="bg-gray-100 text-gray-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {groupDocs.length} DOCS
                  </span>
                </div>
                {isExpanded ? <ChevronDown className="text-gray-300" /> : <ChevronRight className="text-gray-300" />}
              </button>

              {isExpanded && (
                <div className="overflow-x-auto animate-in slide-in-from-top-2 duration-200">
                  <table className="w-full text-left text-xs">
                    <tbody className="divide-y divide-gray-50">
                      {groupDocs.map((doc) => (
                        <tr key={doc.codigo} className="hover:bg-blue-50/20 transition-colors group">
                          <td className="p-4 font-mono font-bold text-[#78c9cf] w-32">{doc.codigo}</td>
                          <td className="p-4 text-gray-600 font-medium">
                            {doc.nombre}
                            <span className={`ml-2 w-2 h-2 inline-block rounded-full ${
                              doc.estatus_sistema === 'Verde' ? 'bg-green-400' : 
                              doc.estatus_sistema === 'Amarillo' ? 'bg-yellow-400' : 'bg-red-300'
                            }`} title={`Estatus: ${doc.estatus_sistema}`}></span>
                          </td>
                          <td className="p-4 text-center text-gray-400 w-16">{doc.edicion}</td>
                          <td className="p-4 w-40">
                            <div className="flex items-center gap-2">
                              {doc.tipo === "Integrado" && <span className="text-green-600 flex items-center gap-1 font-bold bg-green-50 px-2 py-1 rounded"><AppWindow size={14}/> APP</span>}
                              {doc.tipo === "App Externa" && <span className="text-blue-500 flex items-center gap-1 font-bold bg-blue-50 px-2 py-1 rounded"><ExternalLink size={14}/> LINK</span>}
                              {doc.tipo === "Documento" && <span className="text-orange-400 flex items-center gap-1 font-bold bg-orange-50 px-2 py-1 rounded"><FileText size={14}/> DOC</span>}
                            </div>
                          </td>
                          <td className="p-4 text-right w-24">
                            <button 
                              onClick={() => handleNavigation(doc)}
                              className="px-3 py-1.5 bg-gray-50 hover:bg-[#78c9cf] hover:text-white text-gray-500 rounded-lg transition-all font-bold text-[10px] uppercase shadow-sm border border-gray-100"
                            >
                              Ver
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}