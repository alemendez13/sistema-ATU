import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { formatCurrency } from '../../lib/utils'; // Asegúrate de que la ruta sea correcta

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#334155' },
  header: { marginBottom: 20, borderBottom: 1, borderBottomColor: '#e2e8f0', pb: 10, flexDirection: 'row', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  section: { marginBottom: 15 },
  label: { fontSize: 8, fontWeight: 'bold', color: '#64748b', uppercase: true, marginBottom: 2 },
  resumenBox: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  card: { flex: 1, padding: 10, borderRadius: 5, border: 1, borderColor: '#e2e8f0' },
  cardTpv: { flex: 1, padding: 8, borderRadius: 5, backgroundColor: '#f8fafc' },
  totalText: { fontSize: 14, fontWeight: 'bold', color: '#2563eb' },
  table: { width: 'auto', borderStyle: 'solid', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', py: 5 },
  tableColHeader: { fontWeight: 'bold', color: '#475569', fontSize: 9 },
  tableCol: { flex: 1 },
  textRight: { textAlign: 'right' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', color: '#94a3b8', fontSize: 8 }
});

export const LiquidacionMedicoPDF = ({ datos }: { datos: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Encabezado */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Liquidación de Honorarios</Text>
          <Text style={{ color: '#64748b' }}>Periodo: {datos.periodo}</Text>
        </View>
        <Text style={{ fontSize: 12, fontWeight: 'bold' }}>SANSCE Clínica</Text>
      </View>

      {/* Info del Médico */}
      <View style={styles.section}>
        <Text style={styles.label}>Profesional</Text>
        <Text style={{ fontSize: 12, fontWeight: 'bold' }}>{datos.medicoNombre}</Text>
      </View>

      {/* Tarjetas de Resumen Financiero */}
      <View style={styles.resumenBox}>
        <View style={styles.card}>
          <Text style={styles.label}>Total Cobrado</Text>
          <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{formatCurrency(datos.resumen.cobrado)}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Comisión Clínica</Text>
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#ef4444' }}>-{formatCurrency(datos.resumen.comision)}</Text>
        </View>
        <View style={[styles.card, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
          <Text style={[styles.label, { color: '#3b82f6' }]}>Neto a Pagar</Text>
          <Text style={styles.totalText}>{formatCurrency(datos.resumen.pagar)}</Text>
        </View>
      </View>

      {/* 🎯 DESGLOSE DE TPVs (NUEVO) */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        <View style={[styles.cardTpv, { borderLeft: 3, borderLeftColor: '#0ea5e9' }]}>
          <Text style={[styles.label, { color: '#0ea5e9' }]}>TPV Mercado Pago</Text>
          <Text style={{ fontWeight: 'bold' }}>{formatCurrency(datos.resumen.tpvMP || 0)}</Text>
        </View>
        <View style={[styles.cardTpv, { borderLeft: 3, borderLeftColor: '#059669' }]}>
          <Text style={[styles.label, { color: '#059669' }]}>TPV Banorte</Text>
          <Text style={{ fontWeight: 'bold' }}>{formatCurrency(datos.resumen.tpvBAN || 0)}</Text>
        </View>
      </View>

      {/* Tabla de Movimientos */}
      <View style={styles.section}>
        <Text style={[styles.label, { marginBottom: 10 }]}>Detalle de Consultas y Servicios</Text>
        <View style={[styles.tableRow, { backgroundColor: '#f1f5f9' }]}>
          <Text style={[styles.tableCol, styles.tableColHeader, { flex: 0.8 }]}>Fecha</Text>
          <Text style={[styles.tableCol, styles.tableColHeader, { flex: 1.5 }]}>Paciente</Text>
          <Text style={[styles.tableCol, styles.tableColHeader, { flex: 2 }]}>Servicio</Text>
          <Text style={[styles.tableCol, styles.tableColHeader, styles.textRight]}>Monto</Text>
        </View>
        {datos.movimientos.map((m: any, i: number) => (
          <View key={i} style={styles.tableRow}>
            <Text style={[styles.tableCol, { flex: 0.8, fontSize: 8 }]}>{m.fecha}</Text>
            <Text style={[styles.tableCol, { flex: 1.5, fontWeight: 'bold' }]}>{m.paciente}</Text>
            <Text style={[styles.tableCol, { flex: 2, fontSize: 8 }]}>{m.concepto}</Text>
            <Text style={[styles.tableCol, styles.textRight, { fontWeight: 'bold' }]}>{formatCurrency(m.monto)}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.footer}>
        Este documento es un comprobante de liquidación interna generado por el Sistema SANSCE OS v2.0. 
        Cualquier duda favor de contactar a administración.
      </Text>
    </Page>
  </Document>
);