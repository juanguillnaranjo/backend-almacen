'use strict'

const TipoGastoOrange = require('../../modules/module-tiposGastosOrange');

const TIPOS_GASTOS_ORANGE_POR_DEFECTO = [
	{ clase: 'costos de ventas', subclase: 'materia prima', nombre: 'carnes' },
	{ clase: 'costos de ventas', subclase: 'materia prima', nombre: 'verduras' },
	{ clase: 'costos de ventas', subclase: 'materia prima', nombre: 'granos' },
	{ clase: 'costos de ventas', subclase: 'materia prima', nombre: 'lacteos' },
	{ clase: 'costos de ventas', subclase: 'materia prima', nombre: 'condimentos' },
	{ clase: 'costos de ventas', subclase: 'insumos de cocina', nombre: 'aceites' },
	{ clase: 'costos de ventas', subclase: 'insumos de cocina', nombre: 'salsas base' },
	{ clase: 'costos de ventas', subclase: 'insumos de cocina', nombre: 'desechables cocina' },
	{ clase: 'costos de ventas', subclase: 'insumos de cocina', nombre: 'aseo cocina' },
	{ clase: 'costos de ventas', subclase: 'productos terminados', nombre: 'bebidas' },
	{ clase: 'costos de ventas', subclase: 'productos terminados', nombre: 'panaderia' },
	{ clase: 'costos de ventas', subclase: 'productos terminados', nombre: 'postres' },
	{ clase: 'costos de ventas', subclase: 'productos terminados', nombre: 'congelados' },
	{ clase: 'costos de ventas', subclase: 'empaques', nombre: 'envases' },
	{ clase: 'costos de ventas', subclase: 'empaques', nombre: 'bolsas' },
	{ clase: 'costos de ventas', subclase: 'empaques', nombre: 'cubiertos desechables' },
	{ clase: 'costos de ventas', subclase: 'empaques', nombre: 'servilletas' },
	{ clase: 'gastos operativos', subclase: 'personal operativo', nombre: 'salarios' },
	{ clase: 'gastos operativos', subclase: 'personal operativo', nombre: 'horas extra' },
	{ clase: 'gastos operativos', subclase: 'personal operativo', nombre: 'auxilio transporte' },
	{ clase: 'gastos operativos', subclase: 'personal operativo', nombre: 'seguridad social' },
	{ clase: 'gastos operativos', subclase: 'mantenimiento operativo', nombre: 'reparaciones' },
	{ clase: 'gastos operativos', subclase: 'mantenimiento operativo', nombre: 'repuestos' },
	{ clase: 'gastos operativos', subclase: 'mantenimiento operativo', nombre: 'servicio tecnico' },
	{ clase: 'gastos operativos', subclase: 'mantenimiento operativo', nombre: 'aseo locativo' },
	{ clase: 'gastos operativos', subclase: 'logistica operativa', nombre: 'combustible' },
	{ clase: 'gastos operativos', subclase: 'logistica operativa', nombre: 'fletes' },
	{ clase: 'gastos operativos', subclase: 'logistica operativa', nombre: 'domicilios' },
	{ clase: 'gastos operativos', subclase: 'logistica operativa', nombre: 'parqueaderos' },
	{ clase: 'gastos operativos', subclase: 'servicios operativos', nombre: 'gas' },
	{ clase: 'gastos operativos', subclase: 'servicios operativos', nombre: 'agua' },
	{ clase: 'gastos operativos', subclase: 'servicios operativos', nombre: 'energia' },
	{ clase: 'gastos operativos', subclase: 'servicios operativos', nombre: 'internet operativo' },
	{ clase: 'gastos administrativos', subclase: 'personal administrativo', nombre: 'salarios' },
	{ clase: 'gastos administrativos', subclase: 'personal administrativo', nombre: 'honorarios' },
	{ clase: 'gastos administrativos', subclase: 'personal administrativo', nombre: 'seguridad social' },
	{ clase: 'gastos administrativos', subclase: 'personal administrativo', nombre: 'capacitaciones' },
	{ clase: 'gastos administrativos', subclase: 'papeleria y oficina', nombre: 'papeleria' },
	{ clase: 'gastos administrativos', subclase: 'papeleria y oficina', nombre: 'utiles' },
	{ clase: 'gastos administrativos', subclase: 'papeleria y oficina', nombre: 'impresiones' },
	{ clase: 'gastos administrativos', subclase: 'papeleria y oficina', nombre: 'cafeteria oficina' },
	{ clase: 'gastos administrativos', subclase: 'tecnologia y sistemas', nombre: 'software' },
	{ clase: 'gastos administrativos', subclase: 'tecnologia y sistemas', nombre: 'licencias' },
	{ clase: 'gastos administrativos', subclase: 'tecnologia y sistemas', nombre: 'equipos' },
	{ clase: 'gastos administrativos', subclase: 'tecnologia y sistemas', nombre: 'soporte tecnico' },
	{ clase: 'gastos administrativos', subclase: 'legales y contables', nombre: 'contabilidad' },
	{ clase: 'gastos administrativos', subclase: 'legales y contables', nombre: 'asesoria legal' },
	{ clase: 'gastos administrativos', subclase: 'legales y contables', nombre: 'tramites' },
	{ clase: 'gastos administrativos', subclase: 'legales y contables', nombre: 'impuestos administrativos' },
	{ clase: 'gastos de ventas', subclase: 'publicidad y marketing', nombre: 'publicidad digital' },
	{ clase: 'gastos de ventas', subclase: 'publicidad y marketing', nombre: 'impresos' },
	{ clase: 'gastos de ventas', subclase: 'publicidad y marketing', nombre: 'campanas' },
	{ clase: 'gastos de ventas', subclase: 'publicidad y marketing', nombre: 'diseno' },
	{ clase: 'gastos de ventas', subclase: 'comisiones comerciales', nombre: 'comisiones ventas' },
	{ clase: 'gastos de ventas', subclase: 'comisiones comerciales', nombre: 'plataformas delivery' },
	{ clase: 'gastos de ventas', subclase: 'comisiones comerciales', nombre: 'afiliados' },
	{ clase: 'gastos de ventas', subclase: 'atencion al cliente', nombre: 'cortesias' },
	{ clase: 'gastos de ventas', subclase: 'atencion al cliente', nombre: 'fidelizacion' },
	{ clase: 'gastos de ventas', subclase: 'atencion al cliente', nombre: 'material promocional' },
	{ clase: 'gastos de ventas', subclase: 'ventas en punto', nombre: 'uniformes' },
	{ clase: 'gastos de ventas', subclase: 'ventas en punto', nombre: 'material pop' },
	{ clase: 'gastos de ventas', subclase: 'ventas en punto', nombre: 'incentivos' },
	{ clase: 'gastos financieros', subclase: 'bancarios', nombre: 'cuotas de manejo' },
	{ clase: 'gastos financieros', subclase: 'bancarios', nombre: 'transferencias' },
	{ clase: 'gastos financieros', subclase: 'bancarios', nombre: 'datafono' },
	{ clase: 'gastos financieros', subclase: 'bancarios', nombre: 'gmf' },
	{ clase: 'gastos financieros', subclase: 'intereses', nombre: 'creditos' },
	{ clase: 'gastos financieros', subclase: 'intereses', nombre: 'mora' },
	{ clase: 'gastos financieros', subclase: 'intereses', nombre: 'sobregiros' },
	{ clase: 'gastos financieros', subclase: 'obligaciones financieras', nombre: 'leasing' },
	{ clase: 'gastos financieros', subclase: 'obligaciones financieras', nombre: 'microcreditos' },
	{ clase: 'gastos financieros', subclase: 'obligaciones financieras', nombre: 'prestamos terceros' }
];

async function upsertTipoGastoOrange(def) {
	const clase = String(def.clase || '').trim().toLowerCase();
	const subclase = String(def.subclase || '').trim().toLowerCase();
	const nombre = String(def.nombre || '').trim().toLowerCase();
	
	let tipo = await TipoGastoOrange.findOne({ clase, subclase, nombre });

	if (!tipo) {
		const tipoCreado = await TipoGastoOrange.create({ clase, subclase, nombre });
		return { estado: 'creada', tipo: tipoCreado };
	}

	return { estado: 'sin-cambios', tipo };
}

async function inicializarTiposGastosOrangePorDefecto() {
	const resumen = {
		totalDefinidas: TIPOS_GASTOS_ORANGE_POR_DEFECTO.length,
		creadas: 0,
		sinCambios: 0,
		detalle: []
	};

	for (const tipoDef of TIPOS_GASTOS_ORANGE_POR_DEFECTO) {
		const resultado = await upsertTipoGastoOrange(tipoDef);

		if (resultado.estado === 'creada') resumen.creadas += 1;
		if (resultado.estado === 'sin-cambios') resumen.sinCambios += 1;

		resumen.detalle.push({
			estado: resultado.estado,
			clase: resultado.tipo.clase,
			subclase: resultado.tipo.subclase,
			nombre: resultado.tipo.nombre
		});
	}

	return resumen;
}

module.exports = {
	TIPOS_GASTOS_ORANGE_POR_DEFECTO,
	inicializarTiposGastosOrangePorDefecto
};
