/* hooks/useAuth.js - VERSIÓN BLINDADA */
import { useState, useEffect, useContext, createContext } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

// 1. Definimos el valor por defecto explícito
const defaultAuth = { user: null, loading: true };
const AuthContext = createContext(defaultAuth);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {

          console.log("------------------------------------------------");
          console.log("🆔 UID del Usuario Logueado (Auth):", currentUser.uid);
          console.log("📂 Buscando en colección Firestore: usuarios_roles");

          console.log("🔍 Usuario detectado:", currentUser.uid); // Debug
          const docRef = doc(db, "usuarios_roles", currentUser.uid);
          
          // Leemos el rol con timeout implícito (si falla, sigue)
          const docSnap = await getDoc(docRef).catch(e => {
             console.warn("Error leyendo rol:", e);
             return null;
          });

          let userRole = "visitante";
          if (docSnap && docSnap.exists()) {
            // ÉXITO: Encontramos el documento
            console.log("✅ ¡DOCUMENTO ENCONTRADO! Datos:", docSnap.data());
            userRole = docSnap.data().rol;
            console.log("👑 Rol extraído:", userRole);
          } else {
            // ERROR: No existe el documento
            console.error("❌ NO ENCONTRADO. El documento en Firestore no existe.");
            console.warn("⚠️ Verifica que el ID del documento en 'usuarios_roles' sea EXACTAMENTE:", currentUser.uid);
            console.warn("⚠️ Verifica mayúsculas, minúsculas y ceros vs letras O.");
          }
          console.log("------------------------------------------------");

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

        } catch (error) {
          console.error("❌ Error crítico Auth:", error);
          setUser({ ...currentUser, rol: "visitante" });
        }
      } else {
        setUser(null);
        document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
      }
      setLoading(false); // <--- IMPORTANTE: Siempre terminamos de cargar
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
  // Si el contexto falla o es undefined, devolvemos el objeto por defecto.
  // Esto engaña a Next.js durante el build para que no rompa las páginas.
  if (!context) return defaultAuth;
  return context;
};