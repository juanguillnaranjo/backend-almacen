'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const DeudaMia = require('../modules/module-deudasMias');
const CuentaMia = require('../modules/module-cuentasMias');
const MovimientoMio = require('../modules/module-movimientoMios');

(async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });

  const [cuentaDebe, cuentaHaber] = await Promise.all([
    CuentaMia.findOne({ idCuenta: 'P3.0.001' }),
    CuentaMia.findOne({ idCuenta: 'P2.2.005' })
  ]);

  const proveedor = await DeudaMia.findById('69bead4185969e21426c0f61').lean();
  const facturas = proveedor?.facturas || [];
  const facturaIds = facturas.map(f => f._id);

  const debeP3001 = facturas.filter(f => String(f.cuentaDebeId) === String(cuentaDebe?._id)).length;
  const haberP22005 = facturas.filter(f => String(f.cuentaHaberId) === String(cuentaHaber?._id)).length;

  const movimientosP3001 = await MovimientoMio.aggregate([
    {
      $match: {
        origenModelo: 'deudasmias',
        _idOrigen: { $in: facturaIds },
        cuentaId: cuentaDebe?._id
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

  const movimientosP22005 = await MovimientoMio.aggregate([
    {
      $match: {
        origenModelo: 'deudasmias',
        _idOrigen: { $in: facturaIds },
        cuentaId: cuentaHaber?._id
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
    facturasConDebeP3001: debeP3001,
    facturasConHaberP22005: haberP22005,
    resumenP3001: movimientosP3001[0] || null,
    resumenP22005: movimientosP22005[0] || null
  });

  await mongoose.disconnect();
})().catch(async (err) => {
  console.error('Error verificacion:', err.message || err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exitCode = 1;
});
