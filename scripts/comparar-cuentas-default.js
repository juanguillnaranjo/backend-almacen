require('dotenv').config();
const mongoose = require('mongoose');
const Cuenta = require('../modules/cuenta');
const CuentaMia = require('../modules/module-cuentasMias');
const { CUENTAS_POR_DEFECTO } = require('../controllers/services/default-cuentas.service');
const { CUENTAS_MIAS_POR_DEFECTO } = require('../controllers/services/default-cuentas-mias.service');

function comparar(defs, docs, titulo) {
  const porId = new Map(docs.map((doc) => [String(doc.idCuenta || ''), doc]));
  const faltantes = [];
  const distintos = [];

  for (const def of defs) {
    const actual = porId.get(def.idCuenta);
    if (!actual) {
      faltantes.push(def.idCuenta);
      continue;
    }

    const cambios = [];
    if (String(actual.nombre || '') !== String(def.nombre || '')) cambios.push(`nombre: BD="${actual.nombre}" DEF="${def.nombre}"`);
    if (String(actual.descripcion || '') !== String(def.descripcion || '')) cambios.push(`descripcion: BD="${actual.descripcion}" DEF="${def.descripcion}"`);
    if (String(actual.categoria || '') !== String(def.categoria || '')) cambios.push(`categoria: BD="${actual.categoria}" DEF="${def.categoria}"`);
    if (Boolean(actual.liquidez) !== Boolean(def.liquidez)) cambios.push(`liquidez: BD=${Boolean(actual.liquidez)} DEF=${Boolean(def.liquidez)}`);

    if (cambios.length) {
      distintos.push({ idCuenta: def.idCuenta, cambios });
    }
  }

  console.log(`\n=== ${titulo} ===`);
  console.log('Definidas:', defs.length);
  console.log('En BD:', docs.length);
  console.log('Faltantes:', faltantes.length);
  if (faltantes.length) console.log('  ', faltantes.join(', '));
  console.log('Distintas:', distintos.length);
  for (const item of distintos) {
    console.log(`  ${item.idCuenta}`);
    for (const cambio of item.cambios) console.log(`    - ${cambio}`);
  }
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const [cuentas, cuentasMias] = await Promise.all([
    Cuenta.find({}).sort({ idCuenta: 1 }).lean(),
    CuentaMia.find({}).sort({ idCuenta: 1 }).lean()
  ]);

  comparar(CUENTAS_POR_DEFECTO, cuentas, 'CUENTAS ALMACEN');
  comparar(CUENTAS_MIAS_POR_DEFECTO, cuentasMias, 'CUENTAS PERSONALES');

  await mongoose.connection.close();
}

main().catch(async (err) => {
  console.error(err);
  try { await mongoose.connection.close(); } catch (_) {}
  process.exit(1);
});
