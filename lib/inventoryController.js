import { collection, getDocs, query, where, orderBy, updateDoc, doc, serverTimestamp, addDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Verifica si hay suficiente stock en el Inventario Satélite (Firebase)
 */
export const verificarStock = async (sku, cantidadRequerida) => {
  const q = query(
    collection(db, "inventarios"),
    where("sku", "==", sku),
    where("stockActual", ">", 0)
  );
  const snapshot = await getDocs(q);
  
  let stockTotal = 0;
  snapshot.forEach(doc => {
    stockTotal += Number(doc.data().stockActual);
  });

  return {
    suficiente: stockTotal >= cantidadRequerida,
    stockTotal
  };
};

/**
 * Algoritmo PEPS (Primeras Entradas, Primeras Salidas)
 * Descuenta del lote con fecha de caducidad más próxima.
 */
export const descontarStockPEPS = async (sku, nombreProducto, cantidadRequerida) => {
  // 1. Buscar lotes con stock, ordenados por fecha de caducidad (lo que vence primero sale primero)
  // 1. Buscar lotes con stock
  // IMPORTANTE: El orden de los 'where' y 'orderBy' debe coincidir con el índice de Firebase
  const q = query(
    collection(db, "inventarios"),
    where("sku", "==", sku),
    where("stockActual", ">", 0),
    orderBy("stockActual", "asc"), // <-- AGREGAMOS ESTO (Truco técnico)
    orderBy("fechaCaducidad", "asc")
  );

  const snapshot = await getDocs(q);
  let faltante = cantidadRequerida;
  const lotesAfectados = [];

  // 2. Recorrer lotes y restar
  for (const documento of snapshot.docs) {
    if (faltante <= 0) break; // Ya terminamos

    const loteData = documento.data();
    const stockLote = Number(loteData.stockActual);
    const idLote = documento.id;

    let aDescontar = 0;

    if (stockLote >= faltante) {
      // Este lote tiene suficiente para cubrir todo lo que falta
      aDescontar = faltante;
      faltante = 0;
    } else {
      // Este lote no alcanza, tomamos todo lo que tiene y pasamos al siguiente
      aDescontar = stockLote;
      faltante -= stockLote;
    }

    // Actualizamos el lote en Firebase
    await updateDoc(doc(db, "inventarios", idLote), {
      stockActual: stockLote - aDescontar
    });

    lotesAfectados.push({
      lote: loteData.lote,
      cantidad: aDescontar
    });
  }

  // 3. Si después de recorrer todo sigue faltando, hubo un error de sincronización
  if (faltante > 0) {
    throw new Error(`Error crítico: Inventario insuficiente. Faltaron ${faltante} unidades.`);
  }

  // 4. Registrar el movimiento en el historial (Kardex)
  await addDoc(collection(db, "movimientos_inventario"), {
    sku,
    nombreProducto,
    tipo: "SALIDA_VENTA",
    cantidad: cantidadRequerida,
    lotesAfectados, // Guardamos qué lotes se tocaron
    fecha: serverTimestamp()
  });

  return true;
};