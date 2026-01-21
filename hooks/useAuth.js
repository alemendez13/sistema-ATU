/* hooks/useAuth.js - CORREGIDO PARA NETLIFY & FIRESTORE */
import { useState, useEffect, useContext, createContext } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore"; // Usamos la librería nativa para el hook base
import { auth, db } from "../lib/firebase"; 

// 1. Contexto con valor inicial seguro para evitar crash
const AuthContext = createContext({ user: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escucha cambios de sesión en tiempo real
    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          console.log("🔍 1. Usuario autenticado, buscando rol para UID:", currentUser.uid);
          // --- OBTENCIÓN DEL ROL ---
          // Usamos la referencia directa a Firestore
          const docRef = doc(db, "usuarios_roles", currentUser.uid);
          const docSnap = await getDoc(docRef);

          let userRole = "visitante"; // Rol por defecto si falla la DB

          if (docSnap.exists()) {
            userRole = docSnap.data().rol; 
            // OJO: Aquí es donde Firebase lee "admin" de tu base de datos
          }else {
      console.warn("⚠️ 2. EL DOCUMENTO NO EXISTE en la ruta: usuarios_roles/" + currentUser.uid);
      console.warn("Revisa que estés en el proyecto de Firebase correcto.");
    }

          // Construimos el objeto usuario enriquecido
          const userWithRole = { 
             ...currentUser, 
             uid: currentUser.uid,
             email: currentUser.email,
             rol: userRole, // Inyectamos el rol
             getIdToken: () => currentUser.getIdToken() 
          };
          
          setUser(userWithRole);

          // Seteamos la cookie para el Middleware
          const token = await currentUser.getIdToken();
          document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`;

        } catch (error) {
          console.error("Error obteniendo rol:", error);
          // En caso de error, dejamos entrar pero sin privilegios
          setUser({ ...currentUser, rol: "visitante" });
        }
      } else {
        // Logout: Limpiamos todo
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

// --- CORRECCIÓN CRÍTICA PARA NETLIFY ---
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  // SI EL CONTEXTO NO EXISTE (Build Time), devolvemos un objeto "fantasma" seguro.
  // Esto evita que Sidebar.tsx explote al hacer "const { user } = useAuth()"
  if (context === undefined) {
    return { user: null, loading: true };
  }
  
  return context;
};