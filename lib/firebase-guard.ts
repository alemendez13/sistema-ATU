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

// 1. Re-exportamos todo lo demás
export * from "firebase/firestore";

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