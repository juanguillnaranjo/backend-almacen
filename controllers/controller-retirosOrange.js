'use strict'

var mongoose = require('mongoose');
var RetiroOrange = require('../modules/module-retirosOrange');

function normalizarTexto(valor) {
	return String(valor || '').trim();
}

function normalizarCatalogo(valor) {
	return normalizarTexto(valor).toLowerCase();
}

function normalizarFecha(fecha) {
	const valor = String(fecha || '').trim();
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
	if (match) {
		const year = Number(match[1]);
		const month = Number(match[2]) - 1;
		const day = Number(match[3]);
		const date = new Date(year, month, day);
		if (isNaN(date.getTime())) return null;
		date.setHours(0, 0, 0, 0);
		return date;
	}

	const date = new Date(valor);
	if (isNaN(date.getTime())) return null;
	date.setHours(0, 0, 0, 0);
	return date;
}

function confirmarEliminacion(req) {
	const confirmacion = normalizarTexto(req && req.query && req.query.confirmacion).toUpperCase();
	return confirmacion === 'ELIMINAR';
}

function construirDescripcionRetiro(retiro) {
	return `Retiro Orange - ${normalizarTexto(retiro.descripcion)}`;
}

function serializarRetiro(retiro) {
	const item = retiro && typeof retiro.toObject === 'function' ? retiro.toObject() : retiro;
	return item;
}

function armarFiltros(query) {
	const filtros = {};

	const desde = normalizarFecha(query && query.desde);
	const hasta = normalizarFecha(query && query.hasta);
	if (desde || hasta) {
		filtros.fecha = {};
		if (desde) filtros.fecha.$gte = desde;
		if (hasta) {
			hasta.setHours(23, 59, 59, 999);
			filtros.fecha.$lte = hasta;
		}
	}

	const descripcion = normalizarTexto(query && query.descripcion).toLowerCase();
	if (descripcion) {
		filtros.descripcion = { $regex: descripcion, $options: 'i' };
	}

	return filtros;
}

var controller = {
	getRetirosOrange: async (req, res) => {
		try {
			const filtros = armarFiltros(req.query || {});
			const retiros = await RetiroOrange.find(filtros)
				.sort({ fecha: -1, createdAt: -1 });

			return res.status(200).send({
				success: true,
				retiros: retiros.map(serializarRetiro)
			});
		} catch (err) {
			return res.status(500).send({ message: 'Error al obtener retiros Orange', error: err.message || err });
		}
	},

	getRetiroOrangeById: async (req, res) => {
		try {
			const id = req.params.id;
			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id invalido' });
			}

			const retiro = await RetiroOrange.findById(id);

			if (!retiro) {
				return res.status(404).send({ message: 'Retiro Orange no encontrado' });
			}

			return res.status(200).send({ success: true, retiro: serializarRetiro(retiro) });
		} catch (err) {
			return res.status(500).send({ message: 'Error al obtener retiro Orange', error: err.message || err });
		}
	},

	getResumenRetirosOrange: async (req, res) => {
		try {
			const filtros = armarFiltros(req.query || {});
			const retiros = await RetiroOrange.find(filtros).select('monto');

			const resumen = {
				totalRetiros: retiros.length,
				montoTotal: 0
			};

			for (const retiro of retiros) {
				const monto = Number(retiro.monto || 0);
				resumen.montoTotal += monto;
			}

			return res.status(200).send({ success: true, resumen });
		} catch (err) {
			return res.status(500).send({ message: 'Error al obtener resumen de retiros Orange', error: err.message || err });
		}
	},

	createRetiroOrange: async (req, res) => {
		try {
			const fecha = normalizarFecha(req.body && req.body.fecha);
			const monto = Number(req.body && req.body.monto);
			const descripcion = normalizarTexto(req.body && req.body.descripcion);

			if (!fecha) return res.status(400).send({ message: 'Fecha invalida' });
			if (!(monto > 0)) return res.status(400).send({ message: 'El monto debe ser mayor a 0' });
			if (!descripcion) return res.status(400).send({ message: 'La descripcion es obligatoria' });

			const retiro = await RetiroOrange.create({
				fecha,
				monto,
				descripcion
			});

			return res.status(201).send({ success: true, retiro: serializarRetiro(retiro) });
		} catch (err) {
			return res.status(500).send({ message: 'Error al crear retiro Orange', error: err.message || err });
		}
	},

	updateRetiroOrange: async (req, res) => {
		try {
			const id = req.params.id;
			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id invalido' });
			}

			const retiroActual = await RetiroOrange.findById(id);
			if (!retiroActual) {
				return res.status(404).send({ message: 'Retiro Orange no encontrado' });
			}

			const fecha = normalizarFecha(req.body && req.body.fecha);
			const monto = Number(req.body && req.body.monto);
			const descripcion = normalizarTexto(req.body && req.body.descripcion);

			if (!fecha) return res.status(400).send({ message: 'Fecha invalida' });
			if (!(monto > 0)) return res.status(400).send({ message: 'El monto debe ser mayor a 0' });
			if (!descripcion) return res.status(400).send({ message: 'La descripcion es obligatoria' });

			retiroActual.fecha = fecha;
			retiroActual.monto = monto;
			retiroActual.descripcion = descripcion;

			await retiroActual.save();

			return res.status(200).send({ success: true, retiro: serializarRetiro(retiroActual) });
		} catch (err) {
			return res.status(500).send({ message: 'Error al actualizar retiro Orange', error: err.message || err });
		}
	},

	deleteRetiroOrange: async (req, res) => {
		try {
			if (!confirmarEliminacion(req)) {
				return res.status(400).send({ message: 'Confirmacion requerida para eliminar. Debe enviar confirmacion=ELIMINAR' });
			}

			const id = req.params.id;
			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id invalido' });
			}

			const retiro = await RetiroOrange.findById(id);
			if (!retiro) {
				return res.status(404).send({ message: 'Retiro Orange no encontrado' });
			}

			await RetiroOrange.findByIdAndDelete(id);

			return res.status(200).send({ success: true, message: 'Retiro Orange eliminado' });
		} catch (err) {
			return res.status(500).send({ message: 'Error al eliminar retiro Orange', error: err.message || err });
		}
	}
};

module.exports = controller;
