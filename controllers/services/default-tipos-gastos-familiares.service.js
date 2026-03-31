'use strict'

const TipoGastoFamiliar = require('../../modules/module-tiposGastosFamiliares');

const TIPOS_GASTO_FAMILIARES_POR_DEFECTO = [
	{ nombre: 'vivienda' },
	{ nombre: 'alimentacion' },
	{ nombre: 'transporte' },
	{ nombre: 'salud' },
	{ nombre: 'educacion' },
	{ nombre: 'entretenimiento' },
	{ nombre: 'utilidades' },
	{ nombre: 'otros' }
];

async function upsertTipoGastoFamiliar(def) {
	const nombreNormalizado = String(def.nombre || '').trim().toLowerCase();
	
	let tipo = await TipoGastoFamiliar.findOne({ nombre: nombreNormalizado });

	if (!tipo) {
		const tipoCreado = await TipoGastoFamiliar.create({ nombre: nombreNormalizado });
		return { estado: 'creada', tipo: tipoCreado };
	}

	return { estado: 'sin-cambios', tipo };
}

async function inicializarTiposGastosFamiliaresPorDefecto() {
	const resumen = {
		totalDefinidas: TIPOS_GASTO_FAMILIARES_POR_DEFECTO.length,
		creadas: 0,
		sinCambios: 0,
		detalle: []
	};

	for (const tipoDef of TIPOS_GASTO_FAMILIARES_POR_DEFECTO) {
		const resultado = await upsertTipoGastoFamiliar(tipoDef);

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
	TIPOS_GASTO_FAMILIARES_POR_DEFECTO,
	inicializarTiposGastosFamiliaresPorDefecto
};
