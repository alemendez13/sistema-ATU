"use client";
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 9, fontFamily: 'Helvetica' },
  // HEADER CORREGIDO
  header: { 
    flexDirection: 'row', 
    marginBottom: 20, 
    borderBottomWidth: 2, 
    borderBottomColor: '#0ea5e9', 
    paddingBottom: 5, 
    alignItems: 'center',
    justifyContent: 'space-between' // 👈 CLAVE PARA DISTRIBUIR
  },
  logo: { width: 80, height: 40, objectFit: 'contain' },
  // TÍTULO CENTRADO
  headerTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#0ea5e9', 
    textTransform: 'uppercase', 
    textAlign: 'center',
    flex: 1 // 👈 Ocupa todo el espacio central
  },
  meta: { marginLeft: 'auto', fontSize: 8, textAlign: 'right', color: 'gray' },
  
  infoBlock: { marginBottom: 15, padding: 10, backgroundColor: '#f0f9ff', borderRadius: 4 },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 120, fontWeight: 'bold', color: '#0369a1' },
  value: { flex: 1 },

  table: { marginTop: 10, borderWidth: 1, borderColor: '#e0f2fe' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#0ea5e9', color: 'white', padding: 5, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e0f2fe', padding: 5 },
  colDesc: { flex: 1 },
  colPrice: { width: 80, textAlign: 'right' },

  footer: { position: 'absolute', bottom: 30, left: 30, right: 30, fontSize: 7, textAlign: 'center', color: 'gray' },
  
  indicacionesBox: { marginTop: 20, padding: 10, borderWidth: 1, borderColor: '#0ea5e9', borderRadius: 4 },
  indicacionesTitle: { fontWeight: 'bold', color: '#0ea5e9', marginBottom: 5 }
});

interface Props {
  paciente: string;
  medico: string;
  items: any[];
  fecha: string;
}

export default function CotizacionLabPDF({ paciente, medico, items, fecha }: Props) {
  const total = items.reduce((acc, item) => acc + item.precio, 0);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        
        {/* Encabezado */}
        <View style={styles.header}>
          {/* Asegúrate de tener el logo en public/logo-sansce.png */}
          <Image src="/logo-sansce.png" style={styles.logo} />
          <Text style={styles.headerTitle}>Cotización de Estudios</Text>
          <View style={styles.meta}>
            <Text>ATU-FR-05</Text> {/* MODIFICACIÓN: Era ATU-FR-11, ahora es ATU-FR-05 según GEC-FR-02 */}
            <Text>Fecha: {fecha}</Text>
          </View>
        </View>

        {/* Datos */}
        <View style={styles.infoBlock}>
            <View style={styles.row}>
                <Text style={styles.label}>PACIENTE:</Text>
                <Text style={styles.value}>{paciente}</Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.label}>SOLICITA:</Text>
                <Text style={styles.value}>{medico}</Text>
            </View>
        </View>

        {/* Tabla */}
        <View style={styles.table}>
            <View style={styles.tableHeader}>
                <Text style={styles.colDesc}>ESTUDIO / CONCEPTO</Text>
                <Text style={styles.colPrice}>PRECIO</Text>
            </View>
            
            {items.map((item, i) => (
                <View key={i} style={styles.tableRow}>
                    <View style={styles.colDesc}>
                        <Text style={{fontWeight: 'bold'}}>{item.nombre}</Text>
                        {item.indicacionesPac && (
                            <Text style={{fontSize: 7, color: 'gray', marginTop: 2}}>
                                * Indicación: {item.indicacionesPac}
                            </Text>
                        )}
                    </View>
                    <Text style={styles.colPrice}>${item.precio.toLocaleString()}</Text>
                </View>
            ))}

            {/* Total */}
            <View style={[styles.tableRow, { borderBottomWidth: 0, backgroundColor: '#f0f9ff' }]}>
                <Text style={[styles.colDesc, { textAlign: 'right', paddingRight: 10, fontWeight: 'bold' }]}>TOTAL:</Text>
                <Text style={[styles.colPrice, { fontWeight: 'bold', color: '#0369a1' }]}>${total.toLocaleString()}</Text>
            </View>
        </View>

        <Text style={{ fontSize: 7, marginTop: 5, fontStyle: 'italic' }}>* Precios sujetos a cambios sin previo aviso. Vigencia 7 días.</Text>

        {/* Indicaciones Generales */}
        <View style={styles.indicacionesBox}>
            <Text style={styles.indicacionesTitle}>INDICACIONES GENERALES:</Text>
            <Text>• Verifique el horario de su cita.</Text>
            <Text>• Acude a la toma de muestras con tu solicitud de estudios.</Text>
            <Text>• Usa ropa cómoda para la toma de muestras.</Text>
            <Text>• Informar al personal sobre los medicamentos que toma de manera habitual.</Text>
        </View>

        <View style={styles.footer}>
            <Text>Clínica SANSCE S.A. de C.V. - Calle Magdalena #439, Col. del Valle Centro, CDMX.</Text>
        </View>

      </Page>
    </Document>
  );
}