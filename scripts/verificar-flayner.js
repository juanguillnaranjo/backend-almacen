require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const DeudaMia = require('../modules/module-deudasMias');

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const doc = await DeudaMia.findById('69bed32d93c20190a6449c4a');
    if (doc) {
      console.log('Proveedor:', doc.nombreProveedor);
      console.log('Facturas:', doc.facturas.length);
      doc.facturas.forEach((f, i) => {
        console.log(`  [${i}] numeroFactura: ${f.numeroFactura} (tipo: ${typeof f.numeroFactura}), monto: ${f.montoFactura}`);
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
