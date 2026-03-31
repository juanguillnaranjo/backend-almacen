'use strict'

const TipoDeudaMio = require('../../modules/module-tiposDeudasMias');

const TIPOS_DEUDA_MIOS_POR_DEFECTO = [
	{ nombre: 'hogar' },
	{ nombre: 'salud' },
	{ nombre: 'educacion' },
	{ nombre: 'transporte' },
	{ nombre: 'prestamo' },
	{ nombre: 'tarjeta' },
	{ nombre: 'otros' }
];

async function upsertTipoDeudaMio(def) {
	const nombreNormalizado = String(def.nombre || '').trim().toLowerCase();
	
	let tipo = await TipoDeudaMio.findOne({ nombre: nombreNormalizado });

	if (!tipo) {
		const tipoCreado = await TipoDeudaMio.create({ nombre: nombreNormalizado });
		return { estado: 'creada', tipo: tipoCreado };
	}

	return { estado: 'sin-cambios', tipo };
}

async function inicializarTiposDeudaMiosPorDefecto() {
	const resumen = {
		totalDefinidas: TIPOS_DEUDA_MIOS_POR_DEFECTO.length,
		creadas: 0,
		sinCambios: 0,
		detalle: []
	};

	for (const tipoDef of TIPOS_DEUDA_MIOS_POR_DEFECTO) {
		const resultado = await upsertTipoDeudaMio(tipoDef);

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
	TIPOS_DEUDA_MIOS_POR_DEFECTO,
	inicializarTiposDeudaMiosPorDefecto
};
