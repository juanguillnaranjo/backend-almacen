require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  try {
    console.log('[INICIO] Conectando a MongoDB...')
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[OK] Conexión exitosa\n');

    const db = mongoose.connection.db;
    
    // Contar documentos en deudamias
    const countDeudas = await db.collection('deudamias').countDocuments();
    const countMovs = await db.collection('movimientomios').countDocuments();
    
    console.log(`Documentos en deudamias: ${countDeudas}`);
    console.log(`Documentos en movimientomios: ${countMovs}\n`);
    
    // Obtener un documento para ver structure
    const sample = await db.collection('deudamias').findOne();
    
    if (sample) {
      console.log('ESTRUCTURA DE DEUDAMIA:');
      console.log('='.repeat(60));
      console.log(`ID: ${sample._id}`);
      console.log(`Proveedor: ${sample.nombreProveedor}`);
      console.log(`Facturas: ${sample.facturas?.length || 0} documentos`);
      
      if (sample.facturas && sample.facturas.length > 0) {
        const firstFactura = sample.facturas[0];
        console.log(`\nPRIMERA FACTURA:`);
        console.log(`  Número: ${firstFactura.numeroFactura}`);
        console.log(`  Abonos: ${firstFactura.abonos?.length || 0} documentos`);
        
        if (firstFactura.abonos && firstFactura.abonos.length > 0) {
          console.log(`  PRIMER ABONO: ${JSON.stringify(firstFactura.abonos[0], null, 2).split('\n').slice(0, 6).join('\n')}`);
        }
      }
    }
    
    // Contar total de abonos en toda deudamias
    const totalAbonoResult = await db.collection('deudamias').aggregate([
      { $unwind: '$facturas' },
      { $unwind: '$facturas.abonos' },
      { $count: 'total' }
    ]).toArray();
    
    const totalAbonos = totalAbonoResult[0]?.total || 0;
    console.log(`\nTOTAL DE ABONOS EN DEUDAMIAS: ${totalAbonos}`);
    
    // Contar movimientos creados por facturas (sin abono)
    const abonoMovs = await db.collection('movimientomios')
      .aggregate([
        { $match: { 'descripcion': { $regex: /abono|ABONO/i } } },
        { $count: 'total' }
      ]).toArray();
    
    console.log(`Movimientos con "abono": ${abonoMovs[0]?.total || 0}`);

    await mongoose.connection.close();
    console.log('\n[OK] Conexión cerrada');

  } catch (error) {
    console.error('[ERROR]', error.message);
    process.exit(1);
  }
}

main();
