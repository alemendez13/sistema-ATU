/* hooks/useAuth.js - VERSIÓN DEFINITIVA FASE 12 */
import { useState, useEffect, useContext, createContext } from "react";
import { onIdTokenChanged } from "firebase/auth"; // ✅ CONSERVADO: Listener robusto
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ✅ CONSERVADO: Usamos onIdTokenChanged para detectar login, logout Y refresco de token
    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          // --- NUEVA LÓGICA (FASE 12): OBTENER ROL ---
          // REGLA ZERO-LOOP: getDoc asegura una sola lectura, no un listener infinito
          const docRef = doc(db, "usuarios_roles", currentUser.uid);
          const docSnap = await getDoc(docRef);

          let userRole = "visitante"; // Rol por defecto (seguridad)

          if (docSnap.exists()) {
            userRole = docSnap.data().rol;
          }

          // --- FUSIÓN DE DATOS ---
          // ✅ CONSERVADO: No "recortamos" el usuario. Usamos spread operator (...currentUser)
          // para mantener photoURL, displayName, etc., y le pegamos el rol.
          // Nota: currentUser es un objeto complejo, lo asignamos y extendemos.
          const userWithRole = { 
             ...currentUser, 
             uid: currentUser.uid, // Aseguramos que UID esté visible
             email: currentUser.email,
             rol: userRole,
             // Hack para mantener acceso a métodos originales si fuera necesario
             getIdToken: () => currentUser.getIdToken() 
          };
          
          setUser(userWithRole);

          // --- LÓGICA ORIGINAL CRÍTICA (COOKIES) ---
          // ✅ CONSERVADO: Actualización de cookie para el Middleware
          const token = await currentUser.getIdToken();
          document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`;

        } catch (error) {
          console.error("Error crítico en Auth:", error);
          // En fallo, permitimos login pero sin rol privilegiado
          setUser({ ...currentUser, rol: "visitante" });
        }
      } else {
        // ✅ CONSERVADO: Limpieza de sesión y cookies
        setUser(null);
        document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Hook para consumir el contexto
export const useAuth = () => useContext(AuthContext);