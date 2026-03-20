require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const MovimientoMio = require('../modules/module-movimientoMios');
const DeudaMia = require('../modules/module-deudasMias');

async function analizarMovimientos() {
  try {
    console.log('[INICIO] Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[OK] Conexión exitosa\n');

    // LAZUELA
    const lazuela = await DeudaMia.findById('69bead4185969e21426c0f61');
    console.log('FERRETERIA LA LAZUELA (DOÑA DOLLY)');
    console.log('='.repeat(70));

    // Contar facturas y abonos
    let totalFacturas = lazuela.facturas.length;
    let totalAbonos = 0;
    for (const factura of lazuela.facturas) {
      totalAbonos += factura.abonos.length;
    }

    console.log(`Facturas en documento: ${totalFacturas}`);
    console.log(`Abonos en documento: ${totalAbonos}`);
    console.log(`Movimientos esperados: ${totalFacturas * 2 + totalAbonos * 2}`);

    // Obtener movimientos por origen
    const movimientos = await MovimientoMio.find({
      origenModelo: 'deudasmias'
    });

    console.log(`\nMovimientos totales en BD (todos los orígenes): ${movimientos.length}`);

    // Contar movimientos por proveedor
    const movPorProveedor = {};
    for (const mov of movimientos) {
      const key = String(mov._idOrigen || '');
      if (!movPorProveedor[key]) {
        movPorProveedor[key] = 0;
      }
      movPorProveedor[key]++;
    }

    console.log(`\nMovimientos por proveedor:`);
    for (const [id, count] of Object.entries(movPorProveedor)) {
      const factura = lazuela.facturas.find(f => String(f._id) === id);
      if (factura) {
        console.log(`  Factura ${factura.numeroFactura}: ${count} movimientos (abonos: ${factura.abonos.length})`);
      }
    }

    // Buscar duplicados exactos (misma fecha, concepto, cuentaId, debe, haber)
    console.log(`\n${'='.repeat(70)}`);
    console.log('Búsqueda de duplicados exactos...');
    console.log(`${'='.repeat(70)}`);

    const signatures = {};
    const duplicados = [];

    for (const mov of movimientos) {
      const sig = `${mov.fecha.toISOString()}|${mov.descripcion}|${mov.cuentaId}|${mov.debe}|${mov.haber}`;
      
      if (signatures[sig]) {
        duplicados.push({
          fecha: mov.fecha,
          descripcion: mov.descripcion,
          debe: mov.debe,
          haber: mov.haber,
          id: mov._id,
          prevId: signatures[sig]
        });
      } else {
        signatures[sig] = mov._id;
      }
    }

    if (duplicados.length > 0) {
      console.log(`\nEncontrados ${duplicados.length} movimientos EXACTAMENTE DUPLICADOS:\n`);
      for (const dup of duplicados) {
        console.log(`  ${dup.fecha.toISOString().split('T')[0]} | ${dup.descripcion}`);
        console.log(`  Debe: ${dup.debe}, Haber: ${dup.haber}`);
        console.log(`  ID original: ${dup.prevId}`);
        console.log(`  ID duplicado: ${dup.id}`);
        console.log('');
      }
    } else {
      console.log('\n✓ NO hay movimientos exactamente duplicados');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('[ERROR] ', error.message);
    process.exit(1);
  }
}

analizarMovimientos();
