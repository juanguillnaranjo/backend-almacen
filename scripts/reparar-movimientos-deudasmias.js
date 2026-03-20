require('dotenv').config();
const mongoose = require('mongoose');
const DeudaMia = require('../modules/module-deudasMias');
const MovimientoMio = require('../modules/module-movimientoMios');

const ORIGEN = 'deudasmias';

function construirDescripcionFactura(proveedor, factura) {
  return `Factura ${factura.numeroFactura} - ${proveedor.nombreProveedor}`;
}

function construirDescripcionAbono(proveedor, factura) {
  return `Abono factura ${factura.numeroFactura} - ${proveedor.nombreProveedor}`;
}

function construirMovimientos(proveedor, factura) {
  const movimientos = [];
  const montoFactura = Number(factura.montoFactura || 0);

  if (montoFactura > 0) {
    movimientos.push({
      cuentaId: factura.cuentaDebeId,
      origenModelo: ORIGEN,
      _idOrigen: factura._id,
      debe: montoFactura,
      haber: 0,
      descripcion: construirDescripcionFactura(proveedor, factura),
      fecha: factura.fechaFactura
    });

    movimientos.push({
      cuentaId: factura.cuentaHaberId,
      origenModelo: ORIGEN,
      _idOrigen: factura._id,
      debe: 0,
      haber: montoFactura,
      descripcion: construirDescripcionFactura(proveedor, factura),
      fecha: factura.fechaFactura
    });
  }

  for (const abono of (factura.abonos || [])) {
    const monto = Number(abono.monto || 0);
    if (!(monto > 0)) continue;

    movimientos.push({
      cuentaId: abono.cuentaDebeId,
      origenModelo: ORIGEN,
      _idOrigen: factura._id,
      debe: monto,
      haber: 0,
      descripcion: construirDescripcionAbono(proveedor, factura),
      fecha: abono.fecha || new Date()
    });

    movimientos.push({
      cuentaId: abono.cuentaHaberId,
      origenModelo: ORIGEN,
      _idOrigen: factura._id,
      debe: 0,
      haber: monto,
      descripcion: construirDescripcionAbono(proveedor, factura),
      fecha: abono.fecha || new Date()
    });
  }

  return movimientos;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const proveedores = await DeudaMia.find({});
  let facturasReparadas = 0;
  let movimientosInsertados = 0;

  for (const proveedor of proveedores) {
    for (const factura of (proveedor.facturas || [])) {
      const esperados = 2 + ((factura.abonos || []).length * 2);
      const actuales = await MovimientoMio.countDocuments({ origenModelo: ORIGEN, _idOrigen: factura._id });

      if (actuales === esperados) continue;

      const nuevos = construirMovimientos(proveedor, factura);

      await MovimientoMio.deleteMany({ origenModelo: ORIGEN, _idOrigen: factura._id });
      if (nuevos.length > 0) {
        await MovimientoMio.insertMany(nuevos);
      }

      facturasReparadas += 1;
      movimientosInsertados += nuevos.length;
      console.log(`Reparada factura ${factura.numeroFactura} (${proveedor.nombreProveedor}): ${actuales} -> ${nuevos.length}`);
    }
  }

  console.log('=============================');
  console.log('Facturas reparadas:', facturasReparadas);
  console.log('Movimientos reinsertados:', movimientosInsertados);

  await mongoose.connection.close();
}

main().catch(async (err) => {
  console.error(err);
  try { await mongoose.connection.close(); } catch (_) {}
  process.exit(1);
});
