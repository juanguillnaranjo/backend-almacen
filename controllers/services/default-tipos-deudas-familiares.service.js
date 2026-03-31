'use strict'

const TipoDeudaFamiliar = require('../../modules/module-tiposDeudasFamiliares');

const TIPOS_DEUDA_FAMILIARES_POR_DEFECTO = [
	{ nombre: 'hogar' },
	{ nombre: 'salud' },
	{ nombre: 'educacion' },
	{ nombre: 'transporte' },
	{ nombre: 'prestamo' },
	{ nombre: 'tarjeta' },
	{ nombre: 'otros' }
];

async function upsertTipoDeudaFamiliar(def) {
	const nombreNormalizado = String(def.nombre || '').trim().toLowerCase();
	
	let tipo = await TipoDeudaFamiliar.findOne({ nombre: nombreNormalizado });

	if (!tipo) {
		const tipoCreado = await TipoDeudaFamiliar.create({ nombre: nombreNormalizado });
		return { estado: 'creada', tipo: tipoCreado };
	}

	return { estado: 'sin-cambios', tipo };
}

async function inicializarTiposDeudaFamiliaresPorDefecto() {
	const resumen = {
		totalDefinidas: TIPOS_DEUDA_FAMILIARES_POR_DEFECTO.length,
		creadas: 0,
		sinCambios: 0,
		detalle: []
	};

	for (const tipoDef of TIPOS_DEUDA_FAMILIARES_POR_DEFECTO) {
		const resultado = await upsertTipoDeudaFamiliar(tipoDef);

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
	TIPOS_DEUDA_FAMILIARES_POR_DEFECTO,
	inicializarTiposDeudaFamiliaresPorDefecto
};
