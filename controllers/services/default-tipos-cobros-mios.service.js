'use strict'

const TipoCobroMio = require('../../modules/module-tiposCobrosMios');

const TIPOS_COBRO_MIOS_POR_DEFECTO = [
	{ nombre: 'hogar' },
	{ nombre: 'salud' },
	{ nombre: 'educacion' },
	{ nombre: 'transporte' },
	{ nombre: 'prestamo' },
	{ nombre: 'tarjeta' },
	{ nombre: 'otros' }
];

async function upsertTipoCobroMio(def) {
	const nombreNormalizado = String(def.nombre || '').trim().toLowerCase();
	
	let tipo = await TipoCobroMio.findOne({ nombre: nombreNormalizado });

	if (!tipo) {
		const tipoCreado = await TipoCobroMio.create({ nombre: nombreNormalizado });
		return { estado: 'creada', tipo: tipoCreado };
	}

	return { estado: 'sin-cambios', tipo };
}

async function inicializarTiposCobrosMiosPorDefecto() {
	const resumen = {
		totalDefinidas: TIPOS_COBRO_MIOS_POR_DEFECTO.length,
		creadas: 0,
		sinCambios: 0,
		detalle: []
	};

	for (const tipoDef of TIPOS_COBRO_MIOS_POR_DEFECTO) {
		const resultado = await upsertTipoCobroMio(tipoDef);

		if (resultado.estado === 'creada') resumen.creadas += 1;
		if (resultado.estado === 'sin-cambios') resumen.sinCambios += 1;

		resumen.detalle.push({
			estado: resultado.estado,
			nombre: resultado.tipo.nombre
		});
	}

	return resumen;
}

module.exports = {
	TIPOS_COBRO_MIOS_POR_DEFECTO,
	inicializarTiposCobrosMiosPorDefecto
};
