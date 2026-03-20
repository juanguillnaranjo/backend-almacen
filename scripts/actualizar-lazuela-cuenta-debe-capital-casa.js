'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const DeudaMia = require('../modules/module-deudasMias');
const CuentaMia = require('../modules/module-cuentasMias');
const MovimientoMio = require('../modules/module-movimientoMios');

const PROVEEDOR_ID = '69bead4185969e21426c0f61';
const PROVEEDOR_NOMBRE = 'FERRETERIA LA LAZUELA (DOÑA DOLLY)';
const NUEVA_CUENTA_DEBE_ID_CUENTA = 'P3.0.001';
const ORIGEN_MODELO = 'deudasmias';

function construirDescripcionFactura(proveedor, factura) {
  return `Factura ${factura.numeroFactura} - ${proveedor.nombreProveedor}`;
}

function construirDescripcionAbono(proveedor, factura) {
  return `Abono factura ${factura.numeroFactura} - ${proveedor.nombreProveedor}`;
}

function validarObjectId(valor) {
  return !!valor && mongoose.Types.ObjectId.isValid(String(valor));
}

function construirMovimientosFacturaMia(proveedor, factura) {
  const movimientos = [];
  const montoFactura = Number(factura.montoFactura || 0);

  if (!validarObjectId(factura.cuentaDebeId) || !validarObjectId(factura.cuentaHaberId)) {
    throw new Error(`La factura ${factura.numeroFactura} no tiene cuentas validas`);
  }

  if (String(factura.cuentaDebeId) === String(factura.cuentaHaberId)) {
    throw new Error(`La factura ${factura.numeroFactura} tiene cuentas iguales en debe y haber`);
  }

  if (montoFactura > 0) {
    movimientos.push({
      cuentaId: factura.cuentaDebeId,
      origenModelo: ORIGEN_MODELO,
      _idOrigen: factura._id,
      debe: montoFactura,
      haber: 0,
      descripcion: construirDescripcionFactura(proveedor, factura),
      fecha: factura.fechaFactura
    });

    movimientos.push({
      cuentaId: factura.cuentaHaberId,
      origenModelo: ORIGEN_MODELO,
      _idOrigen: factura._id,
      debe: 0,
      haber: montoFactura,
      descripcion: construirDescripcionFactura(proveedor, factura),
      fecha: factura.fechaFactura
    });
  }

  for (const abono of (factura.abonos || [])) {
    const montoAbono = Number(abono.monto || 0);
    if (!(montoAbono > 0)) continue;

    if (!validarObjectId(abono.cuentaDebeId) || !validarObjectId(abono.cuentaHaberId)) {
      throw new Error(`Abono invalido en factura ${factura.numeroFactura}: cuentas no validas`);
    }

    if (String(abono.cuentaDebeId) === String(abono.cuentaHaberId)) {
      throw new Error(`Abono invalido en factura ${factura.numeroFactura}: cuentas iguales en debe y haber`);
    }

    movimientos.push({
      cuentaId: abono.cuentaDebeId,
      origenModelo: ORIGEN_MODELO,
      _idOrigen: factura._id,
      debe: montoAbono,
      haber: 0,
      descripcion: construirDescripcionAbono(proveedor, factura),
      fecha: abono.fecha || new Date()
    });

    movimientos.push({
      cuentaId: abono.cuentaHaberId,
      origenModelo: ORIGEN_MODELO,
      _idOrigen: factura._id,
      debe: 0,
      haber: montoAbono,
      descripcion: construirDescripcionAbono(proveedor, factura),
      fecha: abono.fecha || new Date()
    });
  }

  return movimientos;
}

async function run() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI no esta definido en backend/.env');
  }

  console.log('Conectando a MongoDB Atlas...');
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 30000
  });
  console.log('Conexion OK');

  const cuentaDebeNueva = await CuentaMia.findOne({ idCuenta: NUEVA_CUENTA_DEBE_ID_CUENTA });
  if (!cuentaDebeNueva) {
    throw new Error(`No existe CuentaMia con idCuenta ${NUEVA_CUENTA_DEBE_ID_CUENTA}`);
  }

  const proveedor = await DeudaMia.findOne({
    _id: new mongoose.Types.ObjectId(PROVEEDOR_ID),
    nombreProveedor: PROVEEDOR_NOMBRE
  });

  if (!proveedor) {
    throw new Error('No se encontro el proveedor objetivo por _id y nombreProveedor');
  }

  if (!Array.isArray(proveedor.facturas) || proveedor.facturas.length === 0) {
    throw new Error('El proveedor no tiene facturas para actualizar');
  }

  const facturaIds = proveedor.facturas.map(f => f._id);

  let actualizadas = 0;
  for (const factura of proveedor.facturas) {
    if (String(factura.cuentaDebeId) !== String(cuentaDebeNueva._id)) {
      factura.cuentaDebeId = cuentaDebeNueva._id;
      actualizadas += 1;
    }
  }

  await proveedor.save();

  const proveedorActualizado = await DeudaMia.findById(proveedor._id);
  const movimientos = [];
  for (const factura of proveedorActualizado.facturas) {
    movimientos.push(...construirMovimientosFacturaMia(proveedorActualizado, factura));
  }

  await MovimientoMio.deleteMany({
    origenModelo: ORIGEN_MODELO,
    _idOrigen: { $in: facturaIds }
  });

  if (movimientos.length > 0) {
    await MovimientoMio.insertMany(movimientos);
  }

  const totalMovimientos = await MovimientoMio.countDocuments({
    origenModelo: ORIGEN_MODELO,
    _idOrigen: { $in: facturaIds }
  });

  console.log('Proveedor:', proveedorActualizado.nombreProveedor);
  console.log('Facturas totales:', proveedorActualizado.facturas.length);
  console.log('Facturas con cuentaDebeId actualizada:', actualizadas);
  console.log('Cuenta Debe aplicada:', `${cuentaDebeNueva.idCuenta} - ${cuentaDebeNueva.nombre}`);
  console.log('Movimientos reconstruidos:', totalMovimientos);
}

run()
  .catch((err) => {
    console.error('Error en actualizacion:', err.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch (_) {
      // no-op
    }
  });
