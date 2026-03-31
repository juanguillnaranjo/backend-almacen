'use strict';

const mongoose = require('mongoose');
require('dotenv').config();
const TipoGastoOrange = require('../modules/module-tiposGastosOrange');

const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DB_URI || 'mongodb://localhost:27017/almacen';

const CATALOGO = [
	{ clase: 'costos de ventas', subclases: [
		{ nombre: 'materia prima', tipos: ['carnes','verduras','granos','lacteos','condimentos'] },
		{ nombre: 'insumos de cocina', tipos: ['aceites','salsas base','desechables cocina','aseo cocina'] },
		{ nombre: 'productos terminados', tipos: ['bebidas','panaderia','postres','congelados'] },
		{ nombre: 'empaques', tipos: ['envases','bolsas','cubiertos desechables','servilletas'] }
	]},
	{ clase: 'gastos operativos', subclases: [
		{ nombre: 'personal operativo', tipos: ['salarios','horas extra','auxilio transporte','seguridad social'] },
		{ nombre: 'mantenimiento operativo', tipos: ['reparaciones','repuestos','servicio tecnico','aseo locativo'] },
		{ nombre: 'logistica operativa', tipos: ['combustible','fletes','domicilios','parqueaderos'] },
		{ nombre: 'servicios operativos', tipos: ['gas','agua','energia','internet operativo'] }
	]},
	{ clase: 'gastos administrativos', subclases: [
		{ nombre: 'personal administrativo', tipos: ['salarios','honorarios','seguridad social','capacitaciones'] },
		{ nombre: 'papeleria y oficina', tipos: ['papeleria','utiles','impresiones','cafeteria oficina'] },
		{ nombre: 'tecnologia y sistemas', tipos: ['software','licencias','equipos','soporte tecnico'] },
		{ nombre: 'legales y contables', tipos: ['contabilidad','asesoria legal','tramites','impuestos administrativos'] }
	]},
	{ clase: 'gastos de ventas', subclases: [
		{ nombre: 'publicidad y marketing', tipos: ['publicidad digital','impresos','campanas','diseno'] },
		{ nombre: 'comisiones comerciales', tipos: ['comisiones ventas','plataformas delivery','afiliados'] },
		{ nombre: 'atencion al cliente', tipos: ['cortesias','fidelizacion','material promocional'] },
		{ nombre: 'ventas en punto', tipos: ['uniformes','material pop','incentivos'] }
	]},
	{ clase: 'gastos financieros', subclases: [
		{ nombre: 'bancarios', tipos: ['cuotas de manejo','transferencias','datafono','gmf'] },
		{ nombre: 'intereses', tipos: ['creditos','mora','sobregiros'] },
		{ nombre: 'obligaciones financieras', tipos: ['leasing','microcreditos','prestamos terceros'] }
	]}
];

mongoose.connect(uri).then(async () => {
	let insertados = 0;
	for (const claseItem of CATALOGO) {
		const clase = claseItem.clase.toLowerCase().trim();
		for (const subclaseItem of claseItem.subclases) {
			const subclase = subclaseItem.nombre.toLowerCase().trim();
			for (const tipoNombre of subclaseItem.tipos) {
				const nombre = tipoNombre.toLowerCase().trim();
				const r = await TipoGastoOrange.updateOne(
					{ clase, subclase, nombre },
					{ $setOnInsert: { clase, subclase, nombre } },
					{ upsert: true }
				);
				if (r.upsertedCount) insertados++;
			}
		}
	}
	const total = await TipoGastoOrange.countDocuments();
	console.log('Tipos insertados (nuevos):', insertados);
	console.log('Total en coleccion:', total);
	mongoose.disconnect();
	console.log('Seed completado.');
}).catch(e => {
	console.error('Error:', e.message);
	process.exit(1);
});
