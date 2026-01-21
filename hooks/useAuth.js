/* hooks/useAuth.js */
import { useState, useEffect } from "react";
import { onIdTokenChanged } from "firebase/auth"; // 👈 CAMBIO CLAVE
import { auth } from "../lib/firebase";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Usamos onIdTokenChanged en lugar de onAuthStateChanged
    // Esto se dispara al login, al logout Y cuando el token se refresca automáticamente (cada hora)
    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      if (currentUser) {
        // 1. El usuario está logueado o refrescó token
        setUser(currentUser);
        
        // 2. Obtenemos el token FRESCO
        const token = await currentUser.getIdToken();
        
        // 3. Actualizamos la cookie silenciosamente para que el Middleware siempre vea un pase válido
        // Max-Age 86400 = 24 horas
        document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`;
      } else {
        // 4. El usuario cerró sesión
        setUser(null);
        // Borramos la cookie para asegurar que el Middleware bloquee el paso
        document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
}
