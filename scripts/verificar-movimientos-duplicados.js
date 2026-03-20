require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const MovimientoMio = require('../modules/module-movimientoMios');
const DeudaMia = require('../modules/module-deudasMias');

async function verificarDuplicados() {
  try {
    console.log('[INICIO] Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[OK] Conexión exitosa\n');

    // Proveedores a verificar
    const proveedores = [
      { id: '69bead4185969e21426c0f61', nombre: 'FERRETERIA LA LAZUELA (DOÑA DOLLY)' },
      { id: '69bed32d93c20190a6449c4a', nombre: 'FLAYNER' }
    ];

    for (const proveedor of proveedores) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`[PROVEEDOR] ${proveedor.nombre}`);
      console.log(`${'='.repeat(70)}`);

      // Obtener documento del proveedor
      const doc = await DeudaMia.findById(proveedor.id);
      if (!doc) {
        console.log('[ERROR] Proveedor no encontrado');
        continue;
      }

      console.log(`Facturas: ${doc.facturas.length}`);

      // Contar movimientos totales
      const totalMovimientos = await MovimientoMio.countDocuments({
        origenModelo: 'deudasmias',
        _idOrigen: { $in: doc.facturas.map(f => f._id) }
      });

      console.log(`Movimientos totales en BD: ${totalMovimientos}`);

      // Analizar cada factura
      let abonosTotal = 0;
      for (const factura of doc.facturas) {
        abonosTotal += factura.abonos.length;
      }

      console.log(`Total abonos en documento: ${abonosTotal}`);
      console.log(`Movimientos esperados (abonos * 2): ${abonosTotal * 2}`);

      if (totalMovimientos > abonosTotal * 2) {
        console.log(`\n⚠️  ADVERTENCIA: Hay ${totalMovimientos - (abonosTotal * 2)} movimientos DUPLICADOS\n`);

        // Buscar duplicados
        const movimientos = await MovimientoMio.find({
          origenModelo: 'deudasmias',
          _idOrigen: { $in: doc.facturas.map(f => f._id) }
        }).sort({ fecha: 1, _id: 1 });

        // Detectar pares duplicados (misma fecha, descripción y montos)
        const duplicados = [];
        const vistos = {};

        for (const mov of movimientos) {
          const key = `${mov.fecha}|${mov.descripcion}|${mov.debe}|${mov.haber}`;
          
          if (vistos[key]) {
            duplicados.push({
              fecha: mov.fecha,
              descripcion: mov.descripcion,
              debe: mov.debe,
              haber: mov.haber,
              ids: [vistos[key]._id, mov._id]
            });
          } else {
            vistos[key] = mov;
          }
        }

        if (duplicados.length > 0) {
          console.log(`Encontrados ${duplicados.length} registros duplicados:`);
          duplicados.forEach((dup, i) => {
            console.log(`  [${i+1}] ${dup.fecha.toISOString().split('T')[0]} - ${dup.descripcion}`);
            console.log(`      Debe: ${dup.debe}, Haber: ${dup.haber}`);
            console.log(`      IDs: ${dup.ids[0]} / ${dup.ids[1]}`);
          });
        }
      } else if (totalMovimientos === abonosTotal * 2) {
        console.log('[OK] Movimientos correctos, sin duplicados ✓');
      } else {
        console.log(`[WARN] Hay menos movimientos de lo esperado: ${totalMovimientos} vs ${abonosTotal * 2}`);
      }
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log('[INFO] Verificación completada');
    console.log(`${'='.repeat(70)}\n`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('[ERROR] ', error.message);
    process.exit(1);
  }
}

verificarDuplicados();
