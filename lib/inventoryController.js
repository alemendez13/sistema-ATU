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
} from "@/lib/firebase-guard";
import { db } from "./firebase";

/**
 * Verifica stock (Lectura simple para UI)
 */
/**
 * ✅ VERIFICACIÓN CONGRUENTE (SANSCE OS)
 * Ahora valida stock real filtrando por la ubicación específica (Satélite/Central).
 */
export const verificarStock = async (sku, cantidadRequerida, ubicacion = null) => {
  const condiciones = [
    where("sku", "==", sku),
    where("stockActual", ">", 0)
  ];

  // 🛡️ FILTRO CRÍTICO: Si se define ubicación, solo cuenta lo que hay en ese estante físico.
  if (ubicacion) {
    condiciones.push(where("ubicacion", "==", ubicacion));
  }

  const q = query(
    collection(db, "inventarios"),
    ...condiciones
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
 * 🔒 DESCUENTO TRANSACCIONAL (ACTUALIZADO CON FOLIO)
 * @param {string} sku
 * @param {string} nombreProducto
 * @param {number} cantidadRequerida
 * @param {string} pacienteFolio  <-- 1. Añadimos esta instrucción para VS Code
 */
// Definición nueva con parámetro 'ubicacion' opcional
export const descontarStockPEPS = async (sku, nombreProducto, cantidadRequerida, pacienteFolio, ubicacion = null) => {
  
  // Paso 1: Transacción Atómica
  await runTransaction(db, async (transaction) => {
    
    // Construimos las reglas de búsqueda dinámicamente
    const condiciones = [
        where("sku", "==", sku),
        where("stockActual", ">", 0)
    ];

    // 🛡️ FILTRO DE SEGURIDAD: Si nos piden una ubicación específica (ej. "Satelite"), la forzamos.
    if (ubicacion) {
        condiciones.push(where("ubicacion", "==", ubicacion));
    }

    const q = query(
        collection(db, "inventarios"),
        ...condiciones, // Esparce las condiciones (SKU + Stock + [Ubicación])
        orderBy("fechaCaducidad", "asc") 
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        throw "SinStock"; 
    }

    let faltante = cantidadRequerida;
    const lotesAfectados = [];
    const actualizaciones = []; 

    for (const docSnapshot of snapshot.docs) {
        if (faltante <= 0) break;

        const loteRef = doc(db, "inventarios", docSnapshot.id);
        const loteFresco = await transaction.get(loteRef);
        
        if (!loteFresco.exists()) continue; 

        const stockDisponible = Number(loteFresco.data().stockActual);
        if (stockDisponible <= 0) continue; 

        let aDescontar = 0;
        if (stockDisponible >= faltante) {
            aDescontar = faltante;
            faltante = 0;
        } else {
            aDescontar = stockDisponible;
            faltante -= stockDisponible;
        }

        actualizaciones.push({
            ref: loteRef,
            nuevoStock: stockDisponible - aDescontar,
            lote: loteFresco.data().lote,
            cantidad: aDescontar
        });
    }

    if (faltante > 0) {
        throw "Insuficiente"; 
    }

    actualizaciones.forEach(update => {
        transaction.update(update.ref, { stockActual: update.nuevoStock });
        lotesAfectados.push({ lote: update.lote, cantidad: update.cantidad });
    });

    // 2. REGISTRO EN HISTORIAL (Ahora con Folio del Paciente)
    const nuevoMovimientoRef = doc(collection(db, "movimientos_inventario"));
    transaction.set(nuevoMovimientoRef, {
        sku,
        nombreProducto,
        pacienteFolio: pacienteFolio || "VENTA_MOSTRADOR", // <-- ASIGNACIÓN DE FOLIO
        tipo: "SALIDA_VENTA",
        cantidad: cantidadRequerida,
        lotesAfectados,
        fecha: serverTimestamp()
    });

  });

  return true; 
};