require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const DeudaMia = require('../modules/module-deudasMias');

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const doc = await DeudaMia.findById('69bed32d93c20190a6449c4a');
    if (doc) {
      console.log('Proveedor:', doc.nombreProveedor);
      console.log('Total Deuda:', doc.totalDeuda);
      console.log('Total Abonado:', doc.totalAbonado);
      console.log('Total Pendiente:', doc.totalPendiente);
      doc.facturas.forEach((f, i) => {
        console.log(`\n  Factura [${i}]:`);
        console.log(`    numeroFactura: ${f.numeroFactura}`);
        console.log(`    montoFactura: ${f.montoFactura}`);
        console.log(`    montoAbonado: ${f.montoAbonado}`);
        console.log(`    saldoPendiente: ${f.saldoPendiente}`);
        console.log(`    estado: ${f.estado}`);
        console.log(`    abonos count: ${f.abonos?.length || 0}`);
        if (f.abonos && f.abonos.length > 0) {
          console.log(`    Primeros 3 abonos:`);
          f.abonos.slice(0, 3).forEach((a, j) => {
            console.log(`      [${j}] fecha: ${a.fecha.toISOString().split('T')[0]}, monto: ${a.monto}, desc: ${a.descripcion}`);
          });
          console.log(`    Últimos 3 abonos:`);
          f.abonos.slice(-3).forEach((a, j) => {
            console.log(`      [${f.abonos.length - 3 + j}] fecha: ${a.fecha.toISOString().split('T')[0]}, monto: ${a.monto}, desc: ${a.descripcion}`);
          });
        }
      });
    } else {
      console.log('No encontrado');
    }
    await mongoose.disconnect();
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
check();
