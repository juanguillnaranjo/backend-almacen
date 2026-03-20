require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  try {
    console.log('[INICIO] Conectando a MongoDB...')
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[OK] Conexión exitosa\n');

    const db = mongoose.connection.db;
    
    // Contar movimientos por origen
    const origenes = await db.collection('movimientomios').aggregate([
      {
        $group: {
          _id: '$origenModelo',
          cantidad: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    console.log('CONTEO DE MOVIMIENTOS POR ORIGEN:');
    console.log('='.repeat(60));
    let totalMovimientos = 0;
    for (const origen of origenes) {
      console.log(`${origen._id}: ${origen.cantidad}`);
      totalMovimientos += origen.cantidad;
    }
    console.log('='.repeat(60));
    console.log(`TOTAL: ${totalMovimientos} movimientos\n`);

    // Contar abonos por proveedor en deudamias
    console.log('ABONOS EN DEUDAMIAS:');
    console.log('='.repeat(60));
    
    const deudas = await db.collection('deudamias').find().toArray();
    
    let totalAbonos = 0;
    let totalFacturas = 0;
    
    for (const deuda of deudas) {
      const numFacturas = deuda.facturas?.length || 0;
      let numAbonos = 0;
      
      for (const factura of (deuda.facturas || [])) {
        numAbonos += (factura.abonos?.length || 0);
      }
      
      if (numAbonos > 0) {
        console.log(`${deuda.nombreProveedor}:`);
        console.log(`  Facturas: ${numFacturas}, Abonos: ${numAbonos}`);
        totalAbonos += numAbonos;
        totalFacturas += numFacturas;
      }
    }
    
    console.log('='.repeat(60));
    console.log(`TOTAL: ${totalAbonos} abonos en ${totalFacturas} facturas`);
    console.log(`Movimientos esperados: ${(totalFacturas * 2) + (totalAbonos * 2)}\n`);

    await mongoose.connection.close();
    console.log('[OK] Conexión cerrada');

  } catch (error) {
    console.error('[ERROR]', error.message);
    process.exit(1);
  }
}

main();
