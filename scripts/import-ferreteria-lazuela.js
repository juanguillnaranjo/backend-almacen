'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const DeudaMia = require('../modules/module-deudasMias');
const CuentaMia = require('../modules/module-cuentasMias');

const PROVEEDOR_ID = '69bead4185969e21426c0f61';
const PROVEEDOR_NOMBRE = 'FERRETERIA LA LAZUELA (DOÑA DOLLY)';
const CUENTA_DEBE_REF = 'P1.2.001';
const CUENTA_HABER_REF = 'P2.2.005';

const DATA = `
71339,inversion casa,2024-11-04,2098049,0,2098049
71404,inversion casa,2024-11-06,546200,0,546200
71443,inversion casa,2024-11-07,1234800,0,1234800
71603,inversion casa,2024-11-12,1828499,0,1828499
71756,inversion casa,2024-11-14,879049,0,879049
71858,inversion casa,2024-11-18,1240900,0,1240900
71940,inversion casa,2024-11-19,1702999,0,1702999
72072,inversion casa,2024-11-22,189499,0,189499
72141,inversion casa,2024-11-25,1865100,0,1865100
72217,inversion casa,2024-12-26,1201999,0,1201999
72321,inversion casa,2024-11-28,548349,0,548349
2462,inversion casa,2024-12-02,1206400,0,1206400
72539,inversion casa,2024-12-03,1081399,0,1081399
72655,inversion casa,2024-12-05,812799,0,812799
72747,inversion casa,2024-12-09,1297100,0,1297100
72796,inversion casa,2024-12-10,799599,0,799599
72901,inversion casa,2024-12-12,594900,0,594900
73087,inversion casa,2024-12-17,1770299,0,1770299
73157,inversion casa,2024-12-18,1074700,0,1074700
73187,inversion casa,2024-12-19,1755899,0,1755899
73232,inversion casa,2024-12-20,939999,0,939999
73350,inversion casa,2024-12-23,1225999,0,1225999
73424,inversion casa,2024-12-26,1248699,0,1248699
73527,inversion casa,2024-12-31,861999,0,861999
73556,inversion casa,2025-01-02,1233799,0,1233799
73647,inversion casa,2025-01-06,772900,0,772900
73724,inversion casa,2025-01-08,1286599,0,1286599
73889,inversion casa,2025-01-14,917199,0,917199
73845,inversion casa,2025-01-14,821099,0,821099
73973,inversion casa,2025-01-16,1122599,0,1122599
74085,inversion casa,2025-01-20,1699100,0,1699100
74154,inversion casa,2025-01-21,754000,0,754000
74203,inversion casa,2025-01-22,505200,0,505200
74359,inversion casa,2025-01-27,1573599,0,1573599
74412,inversion casa,2025-01-28,814000,0,814000
74456,inversion casa,2024-01-29,329700,0,329700
74507,inversion casa,2025-01-30,375600,0,375600
74603,inversion casa,2025-02-03,1207499,0,1207499
1balastro,inversion casa,2025-02-03,350000,0,350000
74693,inversion casa,2025-02-05,976700,0,976700
74760,inversion casa,2025-02-06,961500,0,961500
74847,inversion casa,2025-02-10,1377399,0,1377399
74959,inversion casa,2025-02-12,854200,0,854200
75107,inversion casa,2025-02-12,406100,0,406100
75148,inversion casa,2025-02-17,1492099,0,1492099
75209,inversion casa,2025-02-18,862500,0,862500
75287,inversion casa,2025-02-19,1383898,0,1383898
1contado,inversion casa,2025-02-20,817600,0,817600
75433,inversion casa,2025-02-24,912400,0,912400
75529,inversion casa,2025-02-26,871849,0,871849
75586,inversion casa,2025-02-27,3420399,0,3420399
75720,inversion casa,2025-03-01,1686700,0,1686700
75869,inversion casa,2025-03-05,184699,0,184699
75796,inversion casa,2025-03-04,2835401,0,2835401
76016,inversion casa,2025-03-10,1812500,0,1812500
76154,inversion casa,2025-03-12,731199,0,731199
76207,inversion casa,2025-03-13,607100,0,607100
76382,inversion casa,2025-03-17,794049,0,794049
76500,inversion casa,2025-03-20,4223599,0,4223599
76502,inversion casa,2025-03-20,1850900,0,1850900
76660,inversion casa,2025-03-24,3560301,0,3560301
75751,inversion casa,2025-03-26,1386199,0,1386199
76771,inversion casa,2025-03-27,1047799,0,1047799
76942,inversion casa,2025-04-01,1128449,0,1128449
77032,inversion casa,2025-04-03,875199,0,875199
77093,inversion casa,2025-04-04,2437501,0,2437501
77253,inversion casa,2025-04-08,2151399,0,2151399
77443,inversion casa,2025-04-12,2160000,0,2160000
77599,inversion casa,2025-04-15,1474999,0,1474999
77774,inversion casa,2025-04-21,2475499,0,2475499
77868,inversion casa,2025-04-23,2025799,0,2025799
78191,inversion casa,2025-04-29,1438599,0,1438599
78331,inversion casa,2025-05-02,1014300,0,1014300
78431,inversion casa,2025-05-05,2158100,0,2158100
78634,inversion casa,2025-05-08,1997999,0,1997999
78726,inversion casa,2025-05-10,747699,0,747699
78757,inversion casa,2025-05-12,981900,0,981900
78867,inversion casa,2025-05-14,1323751,0,1323751
78921,inversion casa,2025-05-15,3603299,0,3603299
79041,inversion casa,2025-05-19,1878701,0,1878701
79101,inversion casa,2025-05-20,726800,0,726800
79348,inversion casa,2025-05-26,3013801,0,3013801
79472,inversion casa,2025-05-28,4039300,0,4039300
79693,inversion casa,2025-06-03,2360200,0,2360200
79804,inversion casa,2025-06-04,1282700,0,1282700
79975,inversion casa,2025-06-07,898800,0,898800
80062,inversion casa,2025-06-10,2298401,0,2298401
80111,inversion casa,2025-06-11,1110399,0,1110399
80216,inversion casa,2025-06-13,1534299,0,1534299
202962,inversion casa,2025-06-16,520000,0,520000
80360,inversion casa,2025-06-16,4514498,0,4514498
80486,inversion casa,2025-06-19,921099,0,921099
80649,inversion casa,2025-06-24,2133000,0,2133000
80731,inversion casa,2025-06-25,1069999,0,1069999
80831,inversion casa,2025-06-28,510399,0,510399
80833,inversion casa,2025-06-28,379499,0,379499
80888,inversion casa,2025-07-01,525598,0,525598
80980,inversion casa,2025-07-02,1248850,0,1248850
81057,inversion casa,2025-07-04,390699,0,390699
81164,inversion casa,2025-07-07,1580699,0,1580699
81297,inversion casa,2025-07-09,885851,0,885851
81371,inversion casa,2025-07-10,900000,0,900000
81487,inversion casa,2025-07-14,1253399,0,1253399
81653,inversion casa,2025-07-17,1000300,0,1000300
81682,inversion casa,2025-07-17,1767650,0,1767650
81816,inversion casa,2025-07-21,1965100,0,1965100
81893,inversion casa,2025-07-24,253998,0,253998
82108,inversion casa,2025-07-28,1871299,0,1871299
82154,inversion casa,2025-07-28,1654301,0,1654301
82229,inversion casa,2025-07-30,1099400,0,1099400
82360,inversion casa,2025-08-01,1389999,0,1389999
82519,inversion casa,2025-08-05,2024999,0,2024999
82561,inversion casa,2025-08-06,267700,0,267700
82609,inversion casa,2025-08-07,493498,0,493498
82667,inversion casa,2025-08-08,731700,0,731700
82797,inversion casa,2025-08-12,1363398,0,1363398
83060,inversion casa,2025-08-20,332899,0,332899
83144,inversion casa,2025-08-22,715699,0,715699
83292,inversion casa,2025-08-26,1044449,0,1044449
83347,inversion casa,2025-08-28,114799,0,114799
83413,inversion casa,2025-08-29,135697,0,135697
FE31,inversion casa,2025-01-02,756339,0,756339
FE155,inversion casa,2025-09-04,1038200,0,1038200
H&MFEP3787,inversion casa,2025-09-08,30499,0,30499
FE294,inversion casa,2025-09-09,886798,0,886798
2contado,inversion casa,2025-09-10,465000,0,465000
2balastro,inversion casa,2025-09-10,500000,0,500000
FE517,inversion casa,2025-09-13,957800,0,957800
FE591,inversion casa,2025-09-16,577400,0,577400
FE676,inversion casa,2025-09-17,589100,0,589100
FE699,inversion casa,2025-09-17,88099,0,88099
FE759,inversion casa,2025-09-19,1756000,0,1756000
FE845,inversion casa,2025-09-23,613000,0,613000
FE939,inversion casa,2025-09-25,1701400,0,1701400
FE982,inversion casa,2025-09-26,63300,0,63300
FE1060,inversion casa,2025-09-29,78999,0,78999
FE1117,inversion casa,2025-09-29,108000,0,108000
FE1277,inversion casa,2025-10-03,516600,0,516600
FE1418,inversion casa,2025-10-07,981000,0,981000
FE1465,inversion casa,2025-10-08,103999,0,103999
FE1562,inversion casa,2025-10-10,517299,0,517299
FE1696,inversion casa,2025-10-15,332399,0,332399
FE1821,inversion casa,2025-10-17,529000,0,529000
FE2276,inversion casa,2025-10-27,1190900,0,1190900
FE2464,inversion casa,2025-10-30,638200,0,638200
FE2562,inversion casa,2025-11-01,877100,0,877100
FE2680,inversion casa,2025-11-04,623400,0,623400
FE2733,inversion casa,2025-11-05,155600,0,155600
FEP6183,inversion casa,2025-11-08,29300,0,29300
FE2869,inversion casa,2025-11-08,468199,0,468199
FE3124,inversion casa,2025-11-12,621750,0,621750
FE3187,inversion casa,2025-11-14,398541,0,398541
FE3231,inversion casa,2025-11-14,48300,0,48300
FE3373,inversion casa,2025-11-18,648900,0,648900
FE3477,inversion casa,2025-11-20,620400,0,620400
FE3650,inversion casa,2025-11-24,199900,0,199900
FE3734,inversion casa,2025-11-25,1100900,0,1100900
FE3847,inversion casa,2025-11-26,748600,0,748600
FE3915,inversion casa,2025-11-28,190150,0,190150
FE4486,inversion casa,2025-12-11,234000,0,234000
FE5267,inversion casa,2026-01-05,1304399,0,1304399
`.trim();

function parseLocalDate(yyyyMmDd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(yyyyMmDd || '').trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseRows(raw) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, idx) => {
      const parts = line.split(',').map((x) => x.trim());
      if (parts.length !== 6) {
        throw new Error(`Linea ${idx + 1} invalida, se esperaban 6 columnas: ${line}`);
      }

      const [numeroFactura, tipoDeuda, fechaFacturaRaw, montoFacturaRaw, montoAbonadoRaw, saldoPendienteRaw] = parts;
      const fechaFactura = parseLocalDate(fechaFacturaRaw);
      if (!fechaFactura) {
        throw new Error(`Linea ${idx + 1} con fecha invalida: ${fechaFacturaRaw}`);
      }

      const montoFactura = Number(montoFacturaRaw);
      const montoAbonado = Number(montoAbonadoRaw);
      const saldoPendiente = Number(saldoPendienteRaw);

      if (!(montoFactura > 0) || montoAbonado < 0 || saldoPendiente < 0) {
        throw new Error(`Linea ${idx + 1} con montos invalidos: ${line}`);
      }

      return {
        numeroFactura,
        tipoDeuda: String(tipoDeuda || '').toLowerCase(),
        fechaFactura,
        montoFactura,
        montoAbonado,
        saldoPendiente,
        estado: montoAbonado <= 0 ? 'pendiente' : (montoAbonado >= montoFactura ? 'pagada' : 'parcial'),
        abonos: []
      };
    });
}

function recalcularTotales(proveedor) {
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

  const [cuentaDebe, cuentaHaber] = await Promise.all([
    CuentaMia.findOne({ idCuenta: CUENTA_DEBE_REF }),
    CuentaMia.findOne({ idCuenta: CUENTA_HABER_REF })
  ]);

  if (!cuentaDebe) {
    throw new Error(`No existe CuentaMia con idCuenta ${CUENTA_DEBE_REF}`);
  }
  if (!cuentaHaber) {
    throw new Error(`No existe CuentaMia con idCuenta ${CUENTA_HABER_REF}`);
  }

  const proveedor = await DeudaMia.findOne({
    _id: new mongoose.Types.ObjectId(PROVEEDOR_ID),
    nombreProveedor: PROVEEDOR_NOMBRE
  });

  if (!proveedor) {
    throw new Error('No se encontro el proveedor objetivo por _id y nombreProveedor');
  }

  const nuevasFacturas = parseRows(DATA);
  const existentes = new Set((proveedor.facturas || []).map((f) => String(f.numeroFactura || '').toLowerCase()));

  let agregadas = 0;
  let omitidas = 0;

  for (const factura of nuevasFacturas) {
    const key = String(factura.numeroFactura).toLowerCase();
    if (existentes.has(key)) {
      omitidas += 1;
      continue;
    }

    proveedor.facturas.push({
      ...factura,
      cuentaDebeId: cuentaDebe._id,
      cuentaHaberId: cuentaHaber._id
    });

    existentes.add(key);
    agregadas += 1;
  }

  recalcularTotales(proveedor);
  await proveedor.save();

  console.log('Proveedor actualizado:', proveedor.nombreProveedor);
  console.log('Facturas en payload:', nuevasFacturas.length);
  console.log('Facturas agregadas:', agregadas);
  console.log('Facturas omitidas por duplicado:', omitidas);
  console.log('Totales finales:', {
    totalFacturas: proveedor.totalFacturas,
    totalDeuda: proveedor.totalDeuda,
    totalAbonado: proveedor.totalAbonado,
    totalPendiente: proveedor.totalPendiente
  });
}

run()
  .catch((err) => {
    console.error('Error en importacion:', err.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch (_) {
      // no-op
    }
  });
