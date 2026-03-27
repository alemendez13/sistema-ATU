/* lib/firebase-guard.ts */
import {
  getDocs as originalGetDocs,
  getDoc as originalGetDoc,
  onSnapshot as originalOnSnapshot,
  Query,
  DocumentReference,
  QuerySnapshot,
  DocumentSnapshot,
  DocumentData,
  Unsubscribe,
  FirestoreError // 👈 1. Importamos este tipo nuevo
} from "firebase/firestore";
import { monitor } from "./monitor-core";
// 🛡️ IMPORTACIÓN SANSCE: Traemos las herramientas de la bodega de fotos para vigilarlas
import { 
  getDownloadURL as originalGetDownloadURL, 
  StorageReference 
} from "firebase/storage";

// 1. Re-exportamos todo lo demás
export * from "firebase/firestore";
// 🛡️ NOTA SANSCE: Se elimina el export masivo de Storage para evitar conflictos con Firestore.
// Las funciones de Storage que necesitemos proteger se exportarán una a una (como getDownloadURL abajo).

// 2. Wrappers para Lecturas Únicas
export async function getDocs<T = DocumentData>(
  query: Query<T>
): Promise<QuerySnapshot<T>> {
  monitor.trackRead();
  if (monitor.isLocked()) throw new Error("⛔ SISTEMA BLOQUEADO");
  return originalGetDocs(query);
}

export async function getDoc<T = DocumentData>(
  reference: DocumentReference<T>
): Promise<DocumentSnapshot<T>> {
  monitor.trackRead();
  if (monitor.isLocked()) throw new Error("⛔ SISTEMA BLOQUEADO");
  return originalGetDoc(reference);
}

// 3. Wrappers para Listeners (onSnapshot) CON MANEJO DE ERRORES

// Caso A: Lista (Query) + Error Opcional
export function onSnapshot<T = DocumentData>(
  query: Query<T>,
  observer: (snapshot: QuerySnapshot<T>) => void,
  onError?: (error: FirestoreError) => void // 👈 2. Definimos el callback de error
): Unsubscribe;

// Caso B: Documento Único (Reference) + Error Opcional
export function onSnapshot<T = DocumentData>(
  reference: DocumentReference<T>,
  observer: (snapshot: DocumentSnapshot<T>) => void,
  onError?: (error: FirestoreError) => void // 👈 2. Definimos el callback de error
): Unsubscribe;

// Implementación Real
export function onSnapshot(...args: any[]): Unsubscribe {
  monitor.trackRead();
  
  if (monitor.isLocked()) {
     console.warn("⛔ Listener bloqueado");
     return () => {}; 
  }
  
  // @ts-ignore
  return originalOnSnapshot(...args);
}

// 🛡️ BLOQUE DE SEGURIDAD PARA FOTOS (STORAGE)
// Este wrapper vigila cada vez que el Reloj Checador pide una URL de foto maestra.
export async function getDownloadURL(ref: StorageReference): Promise<string> {
  monitor.trackRead(); // Contamos esto como una lectura de seguridad
  
  if (monitor.isLocked()) {
    console.error("⛔ STORAGE BLOQUEADO: Exceso de consumo detectado.");
    throw new Error("SISTEMA BLOQUEADO POR CONSUMO");
  }
  
  return originalGetDownloadURL(ref);
}