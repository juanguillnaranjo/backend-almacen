'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const DeudaMia = require('../modules/module-deudasMias');
const CuentaMia = require('../modules/module-cuentasMias');
const MovimientoMio = require('../modules/module-movimientoMios');

(async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });

  const [cuentaDebeAbono, cuentaHaberAbono] = await Promise.all([
    CuentaMia.findOne({ idCuenta: 'P2.2.005' }),
    CuentaMia.findOne({ idCuenta: 'P1.2.001' })
  ]);

  const proveedor = await DeudaMia.findById('69bead4185969e21426c0f61').lean();
  const facturas = proveedor?.facturas || [];
  const facturaIds = facturas.map(f => f._id).filter(Boolean);

  const totalAbonos = facturas.reduce((acc, f) => acc + ((f.abonos || []).length), 0);
  const abonosConCuentasCorrectas = facturas.reduce(
    (acc, f) => acc + (f.abonos || []).filter(
      a => String(a.cuentaDebeId) === String(cuentaDebeAbono?._id) && String(a.cuentaHaberId) === String(cuentaHaberAbono?._id)
    ).length,
    0
  );

  const movimientosRelacionados = await MovimientoMio.countDocuments({
    origenModelo: 'deudasmias',
    _idOrigen: { $in: facturaIds }
  });

  const resumenMovsP22005 = await MovimientoMio.aggregate([
    {
      $match: {
        origenModelo: 'deudasmias',
        _idOrigen: { $in: facturaIds },
        cuentaId: cuentaDebeAbono?._id
      }
    },
    {
      $group: {
        _id: '$cuentaId',
        totalDebe: { $sum: { $ifNull: ['$debe', 0] } },
        totalHaber: { $sum: { $ifNull: ['$haber', 0] } },
        movimientos: { $sum: 1 }
      }
    }
  ]);

  const resumenMovsP12001 = await MovimientoMio.aggregate([
    {
      $match: {
        origenModelo: 'deudasmias',
        _idOrigen: { $in: facturaIds },
        cuentaId: cuentaHaberAbono?._id
      }
    },
    {
      $group: {
        _id: '$cuentaId',
        totalDebe: { $sum: { $ifNull: ['$debe', 0] } },
        totalHaber: { $sum: { $ifNull: ['$haber', 0] } },
        movimientos: { $sum: 1 }
      }
    }
  ]);

  console.log({
    proveedor: proveedor?.nombreProveedor,
    totalFacturas: facturas.length,
    totalAbonos,
    abonosConCuentasCorrectas,
    totalAbonado: proveedor?.totalAbonado,
    totalPendiente: proveedor?.totalPendiente,
    movimientosRelacionados,
    resumenP22005: resumenMovsP22005[0] || null,
    resumenP12001: resumenMovsP12001[0] || null
  });

  await mongoose.disconnect();
})().catch(async (err) => {
  console.error('Error verificacion:', err.message || err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exitCode = 1;
});
