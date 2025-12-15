/* lib/inventoryController.js */
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  doc, 
  serverTimestamp, 
  runTransaction 
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Verifica stock (Lectura simple para UI)
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
 * 🔒 DESCUENTO TRANSACCIONAL (BLINDADO)
 * Garantiza que nunca se venda stock que no existe, incluso con ventas simultáneas.
 */
export const descontarStockPEPS = async (sku, nombreProducto, cantidadRequerida) => {
  
  // Paso 1: Transacción Atómica
  await runTransaction(db, async (transaction) => {
    
    // A. Búsqueda de Lotes (Lectura dentro de la transacción para bloquear)
    // Nota: Firebase requiere leer antes de escribir en una transacción.
    // Buscamos los lotes candidatos.
    const q = query(
        collection(db, "inventarios"),
        where("sku", "==", sku),
        where("stockActual", ">", 0),
        orderBy("fechaCaducidad", "asc") // PEPS: Lo más viejo sale primero
    );

    // Ejecutamos la query. OJO: getDocs aquí no es parte del objeto 'transaction' directamente en v9,
    // pero los documentos que leamos individualmente SÍ deben pasar por 'transaction.get'.
    // Estrategia híbrida: Traemos los candidatos y luego los bloqueamos uno por uno.
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        throw "SinStock"; // Lanzamos error para abortar
    }

    let faltante = cantidadRequerida;
    const lotesAfectados = [];
    const actualizaciones = []; // Guardamos lo que vamos a hacer

    // B. Lógica de Distribución (En memoria)
    // Es vital volver a leer el doc con transaction.get(ref) para asegurar que tenemos el dato REAL
    for (const docSnapshot of snapshot.docs) {
        if (faltante <= 0) break;

        // 🔒 BLOQUEO: Leemos el dato fresco directo de la DB dentro de la transacción
        const loteRef = doc(db, "inventarios", docSnapshot.id);
        const loteFresco = await transaction.get(loteRef);
        
        if (!loteFresco.exists()) continue; // Por si alguien lo borró

        const stockDisponible = Number(loteFresco.data().stockActual);
        
        // Si alguien ya se ganó el stock, saltamos este lote
        if (stockDisponible <= 0) continue; 

        let aDescontar = 0;
        if (stockDisponible >= faltante) {
            aDescontar = faltante;
            faltante = 0;
        } else {
            aDescontar = stockDisponible;
            faltante -= stockDisponible;
        }

        // Preparamos la actualización (No la ejecutamos todavía)
        actualizaciones.push({
            ref: loteRef,
            nuevoStock: stockDisponible - aDescontar,
            lote: loteFresco.data().lote,
            cantidad: aDescontar
        });
    }

    // C. Verificación Final
    if (faltante > 0) {
        throw "Insuficiente"; // Esto cancela TODA la operación y no guarda nada
    }

    // D. Escritura (Commit)
    // 1. Actualizamos los stocks de los lotes
    actualizaciones.forEach(update => {
        transaction.update(update.ref, { stockActual: update.nuevoStock });
        lotesAfectados.push({ lote: update.lote, cantidad: update.cantidad });
    });

    // 2. Creamos el registro en el Historial (Kardex)
    // Usamos transaction.set en una referencia nueva para que sea atómico también
    const nuevoMovimientoRef = doc(collection(db, "movimientos_inventario"));
    transaction.set(nuevoMovimientoRef, {
        sku,
        nombreProducto,
        tipo: "SALIDA_VENTA",
        cantidad: cantidadRequerida,
        lotesAfectados,
        fecha: serverTimestamp()
    });

  });

  return true; // Si llegamos aquí, todo salió bien
};