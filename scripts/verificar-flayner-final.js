require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const DeudaMia = require('../modules/module-deudasMias');
const MovimientoMio = require('../modules/module-movimientoMios');

async function verificarFlayner() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const doc = await DeudaMia.findById('69bed32d93c20190a6449c4a');
    if (!doc) {
      console.log('Proveedor no encontrado');
      process.exit(1);
    }

    const factura = doc.facturas[0];
    const movimientos = await MovimientoMio.countDocuments({
      origenModelo: 'deudasmias',
      _idOrigen: factura._id
    });

    // Calcular suma de abonos
    let sumaAbonos = 0;
    for (const abono of factura.abonos) {
      sumaAbonos += Number(abono.monto || 0);
    }

    console.log('═'.repeat(70));
    console.log('VERIFICACIÓN FINAL - FLAYNER');
    console.log('═'.repeat(70));
    console.log('\n[PROVEEDOR]');
    console.log(`  Nombre: ${doc.nombreProveedor}`);
    console.log(`  Total Deuda: ${doc.totalDeuda.toLocaleString('es-CO')}`);
    console.log(`  Total Abonado: ${doc.totalAbonado.toLocaleString('es-CO')}`);
    console.log(`  Total Pendiente: ${doc.totalPendiente.toLocaleString('es-CO')}`);

    console.log('\n[FACTURA]');
    console.log(`  Número: ${factura.numeroFactura}`);
    console.log(`  Monto Original: ${Number(factura.montoFactura).toLocaleString('es-CO')}`);
    console.log(`  Total Abonado: ${Number(factura.montoAbonado).toLocaleString('es-CO')}`);
    console.log(`  Saldo Pendiente: ${Number(factura.saldoPendiente).toLocaleString('es-CO')}`);
    console.log(`  Estado: ${factura.estado}`);

    console.log('\n[ABONOS]');
    console.log(`  Cantidad de abonos: ${factura.abonos.length}`);
    console.log(`  Suma de abonos (verificación): ${sumaAbonos.toLocaleString('es-CO')}`);
    console.log(`  Coincide con Total Abonado: ${sumaAbonos === Number(factura.montoAbonado) ? 'SÍ ✓' : 'NO ✗'}`);
    
    console.log(`\n[ABONOS - DETALLE]`);
    console.log(`  Primer abono: ${factura.abonos[0].fecha.toISOString().split('T')[0]} - ${factura.abonos[0].monto}`);
    console.log(`  Último abono: ${factura.abonos[factura.abonos.length-1].fecha.toISOString().split('T')[0]} - ${factura.abonos[factura.abonos.length-1].monto}`);

    console.log('\n[MOVIMIENTOS CONTABLES]');
    console.log(`  Total de movimientos en BD: ${movimientos}`);
    console.log(`  Esperados (abonos × 2): ${factura.abonos.length * 2}`);
    console.log(`  Coincide: ${movimientos === factura.abonos.length * 2 ? 'SÍ ✓' : 'NO ✗'}`);

    console.log('\n[VALIDACIONES]');
    const validates = [
      ['Factura tiene saldo pendiente', factura.saldoPendiente > 0],
      ['Total abonado > 0', factura.montoAbonado > 0],
      ['Estado = "parcial"', factura.estado === 'parcial'],
      ['Abonos coinciden con total guardado', sumaAbonos === Number(factura.montoAbonado)],
      ['Movimientos correctos', movimientos === factura.abonos.length * 2]
    ];

    validates.forEach(([desc, valid]) => {
      console.log(`  ${valid ? '✓' : '✗'} ${desc}`);
    });

    const allValid = validates.every(v => v[1]);
    console.log(`\n${allValid ? '✓ VERIFICACIÓN COMPLETADA - TODO CORRECTO' : '✗ HAY PROBLEMAS'}`);
    console.log('═'.repeat(70));

    await mongoose.disconnect();
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

verificarFlayner();
