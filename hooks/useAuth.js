/* hooks/useAuth.js - VERSIÓN DEFINITIVA (Híbrida) */
import { useState, useEffect, useContext, createContext } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

const defaultAuth = { user: null, loading: true };
const AuthContext = createContext(defaultAuth);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      // 1. Iniciamos bloque de seguridad
      try {
        if (currentUser) {
          // --- BLOQUE RESTAURADO DEL ORIGINAL (TRAZABILIDAD) ---
          console.log("------------------------------------------------");
          console.log("🆔 UID del Usuario Logueado (Auth):", currentUser.uid);
          console.log("📂 Buscando en colección Firestore: usuarios_roles");

          const docRef = doc(db, "usuarios_roles", currentUser.uid);
          
          // --- LOGICA ORIGINAL RESTAURADA: Si falla Firestore, no bloquea el Auth ---
          const docSnap = await getDoc(docRef).catch(e => {
             console.warn("⚠️ Error leyendo rol (Se asignará visitante):", e);
             return null;
          });

          let userRole = "visitante";
          
          if (docSnap && docSnap.exists()) {
            // ÉXITO: Encontramos el documento
            console.log("✅ ¡DOCUMENTO ENCONTRADO! Datos:", docSnap.data());
            userRole = docSnap.data().rol;
            console.log("👑 Rol extraído:", userRole);
          } else {
            // ERROR: No existe el documento (Logs originales)
            console.error("❌ NO ENCONTRADO. El documento en Firestore no existe.");
            console.warn("⚠️ Verifica que el ID del documento en 'usuarios_roles' sea EXACTAMENTE:", currentUser.uid);
          }
          console.log("------------------------------------------------");
          // -----------------------------------------------------

          setUser({ 
             ...currentUser, 
             uid: currentUser.uid,
             email: currentUser.email,
             rol: userRole,
             getIdToken: () => currentUser.getIdToken() 
          });

          // Cookie para middleware
          const token = await currentUser.getIdToken();
          document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`;

        } else {
          // No hay usuario logueado
          setUser(null);
          document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
        }
      } catch (error) {
        console.error("❌ Error crítico Auth:", error);
        // En caso de error catastrófico, limpiamos usuario
        setUser(null);
      } finally {
        // ✅ MEJORA CRÍTICA: Esto garantiza que la pantalla de carga desaparezca
        // independientemente de si hubo éxito, error, o usuario nulo.
        setLoading(false); 
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children} 
    </AuthContext.Provider>
  );
}

// 2. EL BLINDAJE FINAL PARA EL BUILD
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) return defaultAuth;
  return context;
};