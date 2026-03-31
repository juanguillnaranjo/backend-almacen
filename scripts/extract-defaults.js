'use strict';

require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/CuentasAlmacen';

// Importar todos los modelos
const CuentaOrange = require('../modules/module-cuentasOrange');
const TipoGastoMio = require('../modules/module-tiposGastosMios');
const TipoGastoOrange = require('../modules/module-tiposGastosOrange');
const TipoGastoFamiliar = require('../modules/module-tiposGastosFamiliares');
const TipoDeudaMio = require('../modules/module-tiposDeudasMias');
const TipoDeudaFamiliar = require('../modules/module-tiposDeudasFamiliares');
const TipoCobroMio = require('../modules/module-tiposCobrosMios');

async function extraerDatos() {
	try {
		console.log('\n=== EXTRAYENDO DATOS POR DEFECTO ===\n');

		// Cuentas Orange
		const cuentasOrange = await CuentaOrange.find({}).sort({ idCuenta: 1 }).lean();
		console.log('CUENTAS ORANGE:');
		console.log(JSON.stringify(cuentasOrange, null, 2));

		// Tipos de Gastos
		const tiposGastosMios = await TipoGastoMio.find({}).sort({ nombre: 1 }).lean();
		console.log('\n\nTIPOS GASTOS MIOS:');
		console.log(JSON.stringify(tiposGastosMios, null, 2));

		const tiposGastosOrange = await TipoGastoOrange.find({}).sort({ nombre: 1 }).lean();
		console.log('\n\nTIPOS GASTOS ORANGE:');
		console.log(JSON.stringify(tiposGastosOrange, null, 2));

		const tiposGastosFamiliares = await TipoGastoFamiliar.find({}).sort({ nombre: 1 }).lean();
		console.log('\n\nTIPOS GASTOS FAMILIARES:');
		console.log(JSON.stringify(tiposGastosFamiliares, null, 2));

		// Tipos de Deudas
		const tiposDeudasMias = await TipoDeudaMio.find({}).sort({ nombre: 1 }).lean();
		console.log('\n\nTIPOS DEUDAS MIAS:');
		console.log(JSON.stringify(tiposDeudasMias, null, 2));

		const tiposDeudasFamiliares = await TipoDeudaFamiliar.find({}).sort({ nombre: 1 }).lean();
		console.log('\n\nTIPOS DEUDAS FAMILIARES:');
		console.log(JSON.stringify(tiposDeudasFamiliares, null, 2));

		// Tipos de Cobros
		const tiposCobrosMios = await TipoCobroMio.find({}).sort({ nombre: 1 }).lean();
		console.log('\n\nTIPOS COBROS MIOS:');
		console.log(JSON.stringify(tiposCobrosMios, null, 2));

		console.log('\n=== EXTRACCION COMPLETADA ===\n');

	} catch (err) {
		console.error('Error:', err.message);
		process.exit(1);
	} finally {
		mongoose.disconnect();
	}
}

mongoose.connect(uri)
	.then(() => {
		console.log('✓ Conectado a MongoDB');
		extraerDatos();
	})
	.catch(err => {
		console.error('Error de conexión:', err.message);
		process.exit(1);
	});
