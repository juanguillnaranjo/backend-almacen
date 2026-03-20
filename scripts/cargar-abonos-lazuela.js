'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const DeudaMia = require('../modules/module-deudasMias');
const CuentaMia = require('../modules/module-cuentasMias');
const MovimientoMio = require('../modules/module-movimientoMios');

const PROVEEDOR_ID = '69bead4185969e21426c0f61';
const PROVEEDOR_NOMBRE = 'FERRETERIA LA LAZUELA (DOÑA DOLLY)';
const ORIGEN_MODELO = 'deudasmias';

const CUENTA_DEBE_ABONO_ID_CUENTA = 'P2.2.005';
const CUENTA_HABER_ABONO_ID_CUENTA = 'P1.2.001';

const RAW_ABONOS = `
2024-11-09,2000000,ABONO RECIBO 00360663,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2024-11-17,1000000,ABONO TRANSFERENCIA FLAI,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2024-11-17,1000000,ABONO EN EFECTIVO FLAI,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2024-11-23,2500000,abono efectivo flai,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2024-11-29,2000000,entrego a flai para abono ferreteria,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2024-12-02,2000000,abono ferreteria por transferencia flai y efectivo,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2024-12-08,1000000,abono por transferencia de 3000000 con mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2024-12-09,2000000,abono transferencia flai,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2024-12-12,4000000,abono transferencia flai,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
1900-01-06,2000000,abono transferencia flai,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2024-12-27,3000000,abono,entrega en efectivo flainer con nomina 5500000,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-01-04,1000000,abono por transferencia de 3000000 con mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-01-07,2000000,abono transferencia flai para materiales,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-01-11,2000000,ABONO EN EFECTIVO FLAI,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-01-18,2000000,ABONO EFECTIVO FLAI 3500000 + 500000 TRANSFERENCIA CON MANO DE OBRA,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-01-25,3000000,ABONO POR TRANSFERENCIA FLAI PARA MATRIALES,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-02-01,2000000,TRANSFERENCIA FLAI PARA PAGO MATERIALES Y MANO OBRA 5000000,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-02-08,3000000,TRANSFERENCIA FLAI PARA PAGO MATERIALES Y MANO OBRA 5000000,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-02-16,3000000,TRANSFERENCIA FLAI PARA PAGO MATERIALES Y MANO OBRA 5000000,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-02-20,1000000,abono en efectivo flai,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-02-22,3000000,TRANSFERENCIA FLAI PARA PAGO MATERIALES  3000000,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-02-27,5000000,TRANSFERENCIA FLAI PARA PAGO DE INICIO PLACA FACIL,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-02-28,1000000,TRANSFFERENCIA PARA AJUSTE DE 1000000 PLACA FACIL A CUENTA FLAI Y 2000000 DE NOMINA,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-03-08,3000000,TRANSFERENCIA FLAI A CUENTA DE ESPOSA FLAI PARA PAGO MANO DE OBRA 2000000 Y MATERIALES 3000000,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-03-17,3000000,TRANSFERENCIA MUJER FLAI PARA 3000000 MATERIALES Y 2000000NOMINA,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-03-17,1500000,ABONO EN EFECTIVO PARA MATERIALES,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-03-19,1500000,TRANSFERENCIA PARA ABNO MATERIALES CUENTA JUJER FLAI,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-03-20,3000000,TRANSFERENCIA PARA PAGO MATERIALES A CUENTA MUJER FLAI,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-03-22,2000000,TRANSFERENCIA PARA PAGO MATERIALES 2000000 Y NOMINA 3000000 A CUENTA DE MUJER FLAI,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-03-29,3000000,TRANSFERENCIA FLAI A CUENTA MUJER 5000000 3 MATERIALES Y 2 MANO DE OBRA,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-04-05,5000000,TRANSFERENCIA FLAI A CUENTA MUJER 5000000  MATERIALES NO MANO DE OBRA,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-04-11,5000000,TRANSFERENCIA FLAI A CUENTA MUJER 5000000  MATERIALES NO MANO DE OBRA,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-04-19,4000000,TRANSFERENCIA FLAI A CUENTA MUJER 4000000  MATERIALES Y 1000000  MANO DE OBRA,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-04-28,4000000,ABONO EFECTIVO FLAI 6000000 MANO OBRA 2000000 Y 4000000 MATERIALES,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-05-05,3000000,ABONO EFECTIVO FLAI 6000000 MANO OBRA 2000000 Y 3000000 MATERIALES,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-05-10,3000000,ABONO EFECTIVO FLAI 6000000 MANO OBRA 2000000 Y 3000000 MATERIALES,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-05-17,6000000,ABONO EFECTIVO FLAI 8000000 MANO DE OBRA 2000000 MATERIALES 6000000,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-05-24,3000000,ABONO EFECTIVO FLAI 5000000 MANO DE OBRA 2000000 MATERIALES 3000000,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-05-28,5000000,ABONO EFECTIVO FLAI 5000000  MATERIALES,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-05-31,3000000,ABONO FLAI 2800000 EFECTIVO Y 2200000 TRANSFERENCIA A CUENTA DE NORA SANCHEZ PARA MATERIALES 3000000 Y MANO DE OBRA 2000000,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-06-08,3000000,ABONO FLAI CUENTA FLAI 5000000 MATERIALES 3000000 MANO DE OBRA 2000000,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-06-14,5000000,ABONO FLAI CUENTA FLAI 5000000 MATERIALES,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-06-19,5000000,ABONO FLAI CUENTA FLAI 5000000 MATERIALES,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-06-24,2000000,ABONO FLAI EFECTIVO MATERIALES 2000000 NOMINA 2000000,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-06-29,4000000,ABONO FLAI TRANSFERENCIA A CUENTA FLAI PARA ABONO MATERIALES,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-07-07,3000000,ABONO FLAI EFECTIVO MATERIALES 3000000 NOMINA 2000000,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-07-12,3000000,ABONO EFECTIVO FLAI 5000000 MANO DE OBRA 2000000 MATERIALES 3000000,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-07-21,3000000,ABONO EFECTIVO FLAI 5000000 MANO DE OBRA 2000000 MATERIALES 3000000,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-07-25,2000000,ABONO FLAI TRANSFERENCIA A CUENTA FLAI PARA ABONO MATERIALES 2000000 MANO OBRA 3000000,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-07-29,1000000,ABONO EFECTIVO MATERIALES 1000000,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-08-02,3000000,PAGO FALI NOMINA 2000000 Y MATERIALES 3000000,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-08-09,5000000,PAGO FALI NOMINA 2000000 Y MATERIALES 5000000,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-08-19,4000000,PAGO FLAY MATERIALES 4000000,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-08-26,1500000,TRANSFERENCIA PARA PAGO MANO DE OBRA Y MATERIALES,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-08-27,500000,PAGO EN EFECTIVO FLAI PARA MANO DE OBRA Y MATERIALES,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-09-10,2000000,abono flai 2000000  y 2000000 a materiales pagados 1600000 en efectivo y 2400000 en transferencia,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-09-17,2000000,abono flai 2000000 y 2000000 PARA materiales Y NOMINA pagados 2750000 en efectivo y 1250000 en transferencia,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-09-24,2000000,abono flai 2000000 y 2000000 PARA materiales Y NOMINA pagados EN EFECTIVO,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-10-02,1000000,ABONO FLAI PARA MATERIALES,TRANSFERENCIA,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-10-08,2000000,ABONO FLAI PARA MATERIALES,EFECTIVO,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-10-15,1000000,ABONO FLAI PARA MATERIALES 1000000,Y 1500000  EFECTIVO  + 150000 DE DESCUENTOS,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-10-29,1000000,ABONO FLAI PARA MATERIALES 1000000,Y 1500000  EFECTIVO  + 150000 DE DESCUENTOS,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-11-13,3000000,ABONO TRANSFERENCIA FLAI PARA MATERIALES 3000000 Y MANO OBRA 1000000,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-11-25,2000000,abono efectivo FLAI PARA MATERIALES,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-12-18,3000000,abono efectivo flai,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2026-01-18,2000000,ABONO FLAI PARA MATERIALES,TRANSFERENCIA,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2026-02-19,1500000,ABONO FLAI PARA MATERIALES,TRANSFERENCIA,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
`.trim();

function parseLocalDate(yyyyMmDd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(yyyyMmDd || '').trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function calcularEstadoFactura(montoFactura, montoAbonado) {
  if (montoAbonado <= 0) return 'pendiente';
  if (montoAbonado >= montoFactura) return 'pagada';
  return 'parcial';
}

function recalcularTotalesProveedor(proveedor) {
  let totalDeuda = 0;
  let totalAbonado = 0;
  let totalPendiente = 0;

  for (const factura of proveedor.facturas) {
    totalDeuda += Number(factura.montoFactura || 0);
    totalAbonado += Number(factura.montoAbonado || 0);
    totalPendiente += Number(factura.saldoPendiente || 0);
  }

  proveedor.totalFacturas = proveedor.facturas.length;
  proveedor.totalDeuda = Number(totalDeuda.toFixed(2));
  proveedor.totalAbonado = Number(totalAbonado.toFixed(2));
  proveedor.totalPendiente = Number(totalPendiente.toFixed(2));
}

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

function parseAbonos(raw) {
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  return lines.map((line, index) => {
    const parts = line.split(',').map(p => p.trim());
    if (parts.length < 5) {
      throw new Error(`Linea ${index + 1} invalida: ${line}`);
    }

    const fecha = parseLocalDate(parts[0]);
    const monto = Number(parts[1]);
    const cuentaDebeLabel = parts[parts.length - 2];
    const cuentaHaberLabel = parts[parts.length - 1];
    const descripcion = parts.slice(2, parts.length - 2).join(',').trim();

    if (!fecha) {
      throw new Error(`Linea ${index + 1}: fecha invalida (${parts[0]})`);
    }

    if (!(monto > 0)) {
      throw new Error(`Linea ${index + 1}: monto invalido (${parts[1]})`);
    }

    return {
      fecha,
      monto,
      descripcion: descripcion || 'Abono de factura',
      cuentaDebeLabel,
      cuentaHaberLabel
    };
  });
}

async function run() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI no esta definido en backend/.env');

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000, socketTimeoutMS: 30000 });

  const [cuentaDebeAbono, cuentaHaberAbono] = await Promise.all([
    CuentaMia.findOne({ idCuenta: CUENTA_DEBE_ABONO_ID_CUENTA }),
    CuentaMia.findOne({ idCuenta: CUENTA_HABER_ABONO_ID_CUENTA })
  ]);

  if (!cuentaDebeAbono) throw new Error(`No existe la cuenta ${CUENTA_DEBE_ABONO_ID_CUENTA}`);
  if (!cuentaHaberAbono) throw new Error(`No existe la cuenta ${CUENTA_HABER_ABONO_ID_CUENTA}`);

  const proveedor = await DeudaMia.findOne({
    _id: new mongoose.Types.ObjectId(PROVEEDOR_ID),
    nombreProveedor: PROVEEDOR_NOMBRE
  });

  if (!proveedor) throw new Error('Proveedor no encontrado por id + nombre');

  const abonosEntrada = parseAbonos(RAW_ABONOS);

  const facturasOrdenadas = [...(proveedor.facturas || [])].sort((a, b) => {
    const fa = new Date(a.fechaFactura || 0).getTime();
    const fb = new Date(b.fechaFactura || 0).getTime();
    if (fa !== fb) return fa - fb;
    return String(a.numeroFactura || '').localeCompare(String(b.numeroFactura || ''));
  });

  if (facturasOrdenadas.length === 0) {
    throw new Error('Proveedor sin facturas. No hay donde distribuir abonos.');
  }

  for (const factura of facturasOrdenadas) {
    factura.abonos = [];
    factura.montoAbonado = 0;
    factura.saldoPendiente = Number(factura.montoFactura || 0);
    factura.estado = 'pendiente';
  }

  let abonosAsignados = 0;
  let totalAbonadoAsignado = 0;
  let excedente = 0;

  for (const abono of abonosEntrada) {
    let restante = Number(abono.monto || 0);

    for (const factura of facturasOrdenadas) {
      if (restante <= 0) break;

      const saldo = Number(factura.saldoPendiente || 0);
      if (saldo <= 0) continue;

      const aplicar = Math.min(restante, saldo);

      factura.abonos.push({
        fecha: abono.fecha,
        monto: Number(aplicar.toFixed(2)),
        descripcion: abono.descripcion,
        cuentaDebeId: cuentaDebeAbono._id,
        cuentaHaberId: cuentaHaberAbono._id
      });

      factura.montoAbonado = Number((Number(factura.montoAbonado || 0) + aplicar).toFixed(2));
      factura.saldoPendiente = Number((Number(factura.montoFactura || 0) - Number(factura.montoAbonado || 0)).toFixed(2));
      factura.estado = calcularEstadoFactura(factura.montoFactura, factura.montoAbonado);

      restante = Number((restante - aplicar).toFixed(2));
      abonosAsignados += 1;
      totalAbonadoAsignado += aplicar;
    }

    if (restante > 0) {
      excedente += restante;
    }
  }

  recalcularTotalesProveedor(proveedor);
  await proveedor.save();

  const proveedorGuardado = await DeudaMia.findById(proveedor._id);
  const facturaIds = (proveedorGuardado.facturas || []).map(f => f._id);

  const movimientos = [];
  for (const factura of proveedorGuardado.facturas) {
    movimientos.push(...construirMovimientosFacturaMia(proveedorGuardado, factura));
  }

  await MovimientoMio.deleteMany({
    origenModelo: ORIGEN_MODELO,
    _idOrigen: { $in: facturaIds }
  });

  if (movimientos.length > 0) {
    await MovimientoMio.insertMany(movimientos);
  }

  console.log('Proveedor:', proveedorGuardado.nombreProveedor);
  console.log('Facturas:', proveedorGuardado.facturas.length);
  console.log('Filas abonos de entrada:', abonosEntrada.length);
  console.log('Abonos aplicados (incluye fraccionados):', abonosAsignados);
  console.log('Total aplicado:', Number(totalAbonadoAsignado.toFixed(2)));
  console.log('Excedente sin aplicar:', Number(excedente.toFixed(2)));
  console.log('Totales proveedor:', {
    totalDeuda: proveedorGuardado.totalDeuda,
    totalAbonado: proveedorGuardado.totalAbonado,
    totalPendiente: proveedorGuardado.totalPendiente
  });
}

run()
  .catch((err) => {
    console.error('Error cargando abonos:', err.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch (_) {
      // no-op
    }
  });
