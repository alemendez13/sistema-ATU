/* components/documents/HojaFrontalPDF.tsx */
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

// Definimos los estilos para imitar tu Excel
const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 9, fontFamily: 'Helvetica' },
  
  // Cabecera con Logo
  headerContainer: { flexDirection: 'row', marginBottom: 10, borderBottomWidth: 2, borderBottomColor: '#00a884', paddingBottom: 5 },
  logoArea: { width: '20%' },
  logo: { width: 60, height: 30, objectFit: 'contain' },
  titleArea: { width: '60%', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: 'bold', color: '#00a884', textTransform: 'uppercase' },
  metaArea: { width: '20%', fontSize: 8, alignItems: 'flex-end' },

  // Tablas y Celdas
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', minHeight: 20, alignItems: 'center' },
  cellLabel: { width: '25%', fontWeight: 'bold', backgroundColor: '#f0fdf4', padding: 4, color: '#166534' }, // Verde clarito
  cellValue: { width: '25%', padding: 4, borderRightWidth: 1, borderRightColor: '#e5e7eb' },
  
  // Sección Fiscal (Color más oscuro)
  sectionHeader: { backgroundColor: '#00a884', color: 'white', padding: 5, fontWeight: 'bold', fontSize: 10, marginTop: 15 },
  
  // Disclaimer abajo
  footer: { position: 'absolute', bottom: 30, left: 30, right: 30, fontSize: 7, textAlign: 'center', color: 'gray' },
  
  // Firmas
  signatures: { flexDirection: 'row', marginTop: 60, justifyContent: 'space-around' },
  signBox: { borderTopWidth: 1, width: '40%', textAlign: 'center', paddingTop: 5 },

  // Checklist lateral (Simulado abajo para que quepa mejor)
  checklistContainer: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#000', padding: 5 },
  checkRow: { flexDirection: 'row', justifyContent: 'space-between', fontSize: 8 },
});

interface HojaProps {
  paciente: any;
}

export default function HojaFrontalPDF({ paciente }: HojaProps) {
  const hoy = new Date().toLocaleDateString('es-MX');
  const p = paciente || {};
  const fiscal = p.datosFiscales || {};

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        
        {/* 1. ENCABEZADO */}
        <View style={styles.headerContainer}>
          <View style={styles.logoArea}>
             {/* Intentamos cargar el logo, si falla no se muestra */}
             {/* Asegúrate de que logo-sansce.png esté en la carpeta public */}
             <Image src="/logo-sansce.png" style={styles.logo} />
          </View>
          <View style={styles.titleArea}>
            <Text style={styles.title}>Expediente Clínico</Text>
          </View>
          <View style={styles.metaArea}>
            <Text>CLI-FR-01</Text>
            <Text>Ed. 01</Text>
          </View>
        </View>

        {/* 2. DATOS DEL PACIENTE (GRID) */}
        <View style={{ borderWidth: 1, borderColor: '#e5e7eb' }}>
            
            <View style={styles.row}>
                <Text style={[styles.cellLabel, {width: '15%'}]}>NOMBRE:</Text>
                <Text style={[styles.cellValue, {width: '55%'}]}>{p.nombreCompleto}</Text>
                <Text style={[styles.cellLabel, {width: '15%'}]}>CONVENIO:</Text>
                <Text style={[styles.cellValue, {width: '15%'}]}>-</Text>
            </View>

            <View style={styles.row}>
                <Text style={[styles.cellLabel, {width: '15%'}]}>FECHA:</Text>
                <Text style={[styles.cellValue, {width: '35%'}]}>{hoy}</Text>
                <Text style={[styles.cellLabel, {width: '25%'}]}>No. EXPEDIENTE:</Text>
                <Text style={[styles.cellValue, {width: '25%'}]}>{p.id?.slice(0,8).toUpperCase()}</Text>
            </View>

            <View style={styles.row}>
                <Text style={[styles.cellLabel, {width: '10%'}]}>EDAD:</Text>
                <Text style={[styles.cellValue, {width: '10%'}]}>{p.edad}</Text>
                <Text style={[styles.cellLabel, {width: '15%'}]}>FECHA NAC:</Text>
                <Text style={[styles.cellValue, {width: '25%'}]}>{p.fechaNacimiento}</Text>
                <Text style={[styles.cellLabel, {width: '15%'}]}>SEXO:</Text>
                <Text style={[styles.cellValue, {width: '25%'}]}>{p.genero}</Text>
            </View>

            <View style={styles.row}>
                <Text style={[styles.cellLabel, {width: '20%'}]}>LUGAR NAC:</Text>
                <Text style={[styles.cellValue, {width: '30%'}]}>{p.lugarNacimiento || '-'}</Text>
                <Text style={[styles.cellLabel, {width: '20%'}]}>RESIDENCIA:</Text>
                <Text style={[styles.cellValue, {width: '30%'}]}>{p.lugarResidencia || '-'}</Text>
            </View>

             <View style={styles.row}>
                <Text style={[styles.cellLabel, {width: '15%'}]}>RELIGIÓN:</Text>
                <Text style={[styles.cellValue, {width: '35%'}]}>{p.religion || '-'}</Text>
                <Text style={[styles.cellLabel, {width: '20%'}]}>ESTADO CIVIL:</Text>
                <Text style={[styles.cellValue, {width: '30%'}]}>{p.estadoCivil || '-'}</Text>
            </View>

             <View style={styles.row}>
                <Text style={[styles.cellLabel, {width: '15%'}]}>CELULAR:</Text>
                <Text style={[styles.cellValue, {width: '35%'}]}>{p.telefonoCelular}</Text>
                <Text style={[styles.cellLabel, {width: '15%'}]}>OCUPACIÓN:</Text>
                <Text style={[styles.cellValue, {width: '35%'}]}>{p.ocupacion || '-'}</Text>
            </View>

             <View style={styles.row}>
                <Text style={[styles.cellLabel, {width: '15%'}]}>EMAIL:</Text>
                <Text style={[styles.cellValue, {width: '35%'}]}>{p.email || '-'}</Text>
                <Text style={[styles.cellLabel, {width: '15%'}]}>ESCOLARIDAD:</Text>
                <Text style={[styles.cellValue, {width: '35%'}]}>{p.escolaridad || '-'}</Text>
            </View>

            <View style={styles.row}>
                <Text style={[styles.cellLabel, {width: '15%'}]}>REFERIDO POR:</Text>
                <Text style={[styles.cellValue, {width: '35%'}]}>{p.medioMarketing || p.referidoPor || '-'}</Text>
                <Text style={[styles.cellLabel, {width: '15%'}]}>TUTOR:</Text>
                <Text style={[styles.cellValue, {width: '35%'}]}>{p.tutor || '-'}</Text>
            </View>
        </View>

        {/* 3. DATOS FISCALES */}
        <Text style={styles.sectionHeader}>DATOS DE FACTURACIÓN</Text>
        <View style={{ borderWidth: 1, borderColor: '#00a884' }}>
            <View style={styles.row}>
                <Text style={[styles.cellLabel, {width: '20%'}]}>RAZÓN SOCIAL:</Text>
                <Text style={[styles.cellValue, {width: '80%'}]}>{fiscal.razonSocial || 'PÚBLICO EN GENERAL'}</Text>
            </View>
            <View style={styles.row}>
                <Text style={[styles.cellLabel, {width: '20%'}]}>RFC:</Text>
                <Text style={[styles.cellValue, {width: '30%'}]}>{fiscal.rfc || 'XAXX010101000'}</Text>
                <Text style={[styles.cellLabel, {width: '20%'}]}>RÉGIMEN:</Text>
                <Text style={[styles.cellValue, {width: '30%'}]}>{fiscal.regimenFiscal || '616 - Sin obligaciones'}</Text>
            </View>
             <View style={styles.row}>
                <Text style={[styles.cellLabel, {width: '20%'}]}>CP FISCAL:</Text>
                <Text style={[styles.cellValue, {width: '30%'}]}>{fiscal.cpFiscal || '-'}</Text>
                <Text style={[styles.cellLabel, {width: '20%'}]}>USO CFDI:</Text>
                <Text style={[styles.cellValue, {width: '30%'}]}>{fiscal.usoCFDI || 'S01'}</Text>
            </View>
             <View style={styles.row}>
                <Text style={[styles.cellLabel, {width: '20%'}]}>EMAIL FACTURA:</Text>
                <Text style={[styles.cellValue, {width: '80%'}]}>{fiscal.emailFacturacion || p.email || '-'}</Text>
            </View>
        </View>

        {/* 4. CHECKLIST DE VERIFICACIÓN */}
        <View style={styles.checklistContainer}>
            <Text style={{fontSize: 10, fontWeight: 'bold', marginBottom: 5}}>CHECKLIST DE INTEGRACIÓN (Uso Administrativo)</Text>
            <View style={styles.checkRow}>
                <Text>[   ] Hoja Frontal</Text>
                <Text>[   ] Historia Clínica</Text>
                <Text>[   ] Aviso Privacidad</Text>
                <Text>[   ] Consentimiento Informado</Text>
                <Text>[   ] Copia Identificación</Text>
            </View>
        </View>

        {/* 5. FIRMAS */}
        <View style={styles.signatures}>
            <View style={styles.signBox}>
                <Text>ELABORÓ (ADMISIÓN)</Text>
            </View>
            <View style={styles.signBox}>
                <Text>FIRMA DEL PACIENTE / TUTOR</Text>
                <Text style={{fontSize: 6, color: 'gray', marginTop: 5}}>
                    Declaro que los datos proporcionados son verídicos y autorizo su uso para fines clínicos.
                </Text>
            </View>
        </View>

        {/* 6. PIE DE PÁGINA */}
        <View style={styles.footer}>
             <Text>Clínica SANSCE; SANSCE S.A. de C.V. Calle Magdalena #439, Col. del Valle Centro, CDMX.</Text>
             <Text>Favor de verificar sus Datos Fiscales, ya que no habrá cambios ni cancelaciones de Facturas posteriores al mes en curso.</Text>
        </View>

      </Page>
    </Document>
  );
}