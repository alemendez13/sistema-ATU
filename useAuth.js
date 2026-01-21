/* hooks/useAuth.js - CORREGIDO PARA NETLIFY */
import { useState, useEffect, useContext, createContext } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

const AuthContext = createContext({ user: null, loading: true }); // ✅ MEJORA 1: Valor por defecto inicial

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          // Lógica de Rol
          const docRef = doc(db, "usuarios_roles", currentUser.uid);
          const docSnap = await getDoc(docRef);

          let userRole = "visitante"; 

          if (docSnap.exists()) {
            userRole = docSnap.data().rol;
          }

          const userWithRole = { 
             ...currentUser, 
             uid: currentUser.uid,
             email: currentUser.email,
             rol: userRole,
             getIdToken: () => currentUser.getIdToken() 
          };
          
          setUser(userWithRole);

          // Cookies para Middleware
          const token = await currentUser.getIdToken();
          document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`;

        } catch (error) {
          console.error("Error crítico en Auth:", error);
          setUser({ ...currentUser, rol: "visitante" });
        }
      } else {
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

// ✅ CORRECCIÓN CRÍTICA PARA NETLIFY:
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  // Si el contexto es undefined (pasa durante el build de Next.js),
  // devolvemos un objeto seguro para evitar el crash.
  if (context === undefined) {
    return { user: null, loading: true };
  }
  
  return context;
};