import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Este es el "oído" que escucha si alguien entra o sale
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false); // Ya terminamos de revisar, quitamos la carga
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
}