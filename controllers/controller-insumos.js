'use strict'

var mongoose = require('mongoose');
var Insumo = require('../modules/module-insumo');

function normalizarTextoUpper(texto) {
	return String(texto || '')
		.toUpperCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^A-Z0-9]/g, '');
}

async function generarCodigoInsumo(nombre) {
	const base = 'INS-' + normalizarTextoUpper(nombre).slice(0, 6);
	for (let intento = 0; intento < 12; intento++) {
		const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
		const codigo = base + '-' + rand;
		const existe = await Insumo.exists({ codigo: codigo });
		if (!existe) return codigo;
	}
	throw new Error('No se pudo generar un codigo unico para el insumo');
}

function armarDatosInsumo(body) {
	return {
		nombre: String(body.nombre || '').trim(),
		unidadMedida: String(body.unidadMedida || 'unidades').trim(),
		costoUnitario: Number(body.costoUnitario) || 0,
		cantidad: Number(body.cantidad) || 0,
		cantidadMinima: Number(body.cantidadMinima) || 0,
		descripcion: String(body.descripcion || '').trim(),
		activo: body.activo === undefined ? true : Boolean(body.activo)
	};
}

function validarInsumo(datos, esParcial) {
	if (!esParcial || datos.nombre !== undefined) {
		if (!datos.nombre) return 'El nombre del insumo es requerido';
	}
	if (!esParcial || datos.unidadMedida !== undefined) {
		if (!datos.unidadMedida) return 'La unidad de medida es requerida';
	}
	if (datos.costoUnitario !== undefined && datos.costoUnitario < 0) return 'Costo unitario no puede ser negativo';
	if (datos.cantidad !== undefined && datos.cantidad < 0) return 'Cantidad no puede ser negativa';
	if (datos.cantidadMinima !== undefined && datos.cantidadMinima < 0) return 'Cantidad minima no puede ser negativa';
	return null;
}

// ─── GET ALL ────────────────────────────────────────────────────────────────

exports.getInsumos = async function (req, res) {
	try {
		const filtro = {};
		if (req.query.activo !== undefined) filtro.activo = req.query.activo === 'true';
		if (req.query.nombre) filtro.nombre = new RegExp(String(req.query.nombre).trim(), 'i');

		const insumos = await Insumo.find(filtro).sort({ nombre: 1 });
		return res.status(200).json({ success: true, insumos: insumos || [] });
	} catch (err) {
		return res.status(500).json({ success: false, message: 'Error al obtener insumos', error: err.message });
	}
};

// ─── GET ONE ─────────────────────────────────────────────────────────────────

exports.getInsumo = async function (req, res) {
	const id = req.params.id;
	if (!mongoose.Types.ObjectId.isValid(id)) {
		return res.status(400).json({ success: false, message: 'ID de insumo invalido' });
	}
	try {
		const insumo = await Insumo.findById(id);
		if (!insumo) return res.status(404).json({ success: false, message: 'Insumo no encontrado' });
		return res.status(200).json({ success: true, insumo });
	} catch (err) {
		return res.status(500).json({ success: false, message: 'Error al obtener insumo', error: err.message });
	}
};

// ─── CREATE ───────────────────────────────────────────────────────────────────

exports.createInsumo = async function (req, res) {
	const datos = armarDatosInsumo(req.body || {});
	const error = validarInsumo(datos, false);
	if (error) return res.status(400).json({ success: false, message: error });

	try {
		const codigo = await generarCodigoInsumo(datos.nombre);
		const insumo = new Insumo({ ...datos, codigo: codigo });
		const guardado = await insumo.save();
		return res.status(201).json({ success: true, message: 'Insumo creado exitosamente', insumo: guardado });
	} catch (err) {
		if (err.code === 11000) {
			return res.status(400).json({ success: false, message: 'Ya existe un insumo con ese nombre/codigo' });
		}
		return res.status(500).json({ success: false, message: 'Error al crear insumo', error: err.message });
	}
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────

exports.updateInsumo = async function (req, res) {
	const id = req.params.id;
	if (!mongoose.Types.ObjectId.isValid(id)) {
		return res.status(400).json({ success: false, message: 'ID de insumo invalido' });
	}

	const datos = armarDatosInsumo(req.body || {});
	const actualizaciones = {};
	if (req.body.nombre !== undefined) actualizaciones.nombre = datos.nombre;
	if (req.body.unidadMedida !== undefined) actualizaciones.unidadMedida = datos.unidadMedida;
	if (req.body.costoUnitario !== undefined) actualizaciones.costoUnitario = datos.costoUnitario;
	if (req.body.cantidad !== undefined) actualizaciones.cantidad = datos.cantidad;
	if (req.body.cantidadMinima !== undefined) actualizaciones.cantidadMinima = datos.cantidadMinima;
	if (req.body.descripcion !== undefined) actualizaciones.descripcion = datos.descripcion;
	if (req.body.activo !== undefined) actualizaciones.activo = Boolean(req.body.activo);

	const error = validarInsumo(actualizaciones, true);
	if (error) return res.status(400).json({ success: false, message: error });

	try {
		const actualizado = await Insumo.findByIdAndUpdate(id, actualizaciones, { returnDocument: 'after' });
		if (!actualizado) return res.status(404).json({ success: false, message: 'Insumo no encontrado' });
		return res.status(200).json({ success: true, message: 'Insumo actualizado exitosamente', insumo: actualizado });
	} catch (err) {
		return res.status(500).json({ success: false, message: 'Error al actualizar insumo', error: err.message });
	}
};

// ─── DELETE ───────────────────────────────────────────────────────────────────

exports.deleteInsumo = async function (req, res) {
	const id = req.params.id;
	if (!mongoose.Types.ObjectId.isValid(id)) {
		return res.status(400).json({ success: false, message: 'ID de insumo invalido' });
	}
	const confirmacion = String(req.query.confirmacion || '').trim().toUpperCase();
	if (confirmacion !== 'ELIMINAR') {
		return res.status(400).json({ success: false, message: 'Confirmacion requerida. Envie ?confirmacion=ELIMINAR' });
	}

	try {
		const eliminado = await Insumo.findByIdAndDelete(id);
		if (!eliminado) return res.status(404).json({ success: false, message: 'Insumo no encontrado' });
		return res.status(200).json({ success: true, message: 'Insumo eliminado exitosamente', insumo: eliminado });
	} catch (err) {
		return res.status(500).json({ success: false, message: 'Error al eliminar insumo', error: err.message });
	}
};

// ─── STOCK INCREMENTAR ────────────────────────────────────────────────────────

exports.incrementarStockInsumo = async function (req, res) {
	const id = req.params.id;
	const incremento = Number(req.body.incremento) || 0;

	if (!mongoose.Types.ObjectId.isValid(id)) {
		return res.status(400).json({ success: false, message: 'ID de insumo invalido' });
	}
	if (incremento <= 0) {
		return res.status(400).json({ success: false, message: 'El incremento debe ser mayor que 0' });
	}

	try {
		const actualizado = await Insumo.findByIdAndUpdate(
			id,
			{ $inc: { cantidad: incremento } },
			{ returnDocument: 'after' }
		);
		if (!actualizado) return res.status(404).json({ success: false, message: 'Insumo no encontrado' });
		return res.status(200).json({ success: true, message: 'Stock incrementado exitosamente', insumo: actualizado });
	} catch (err) {
		return res.status(500).json({ success: false, message: 'Error al incrementar stock', error: err.message });
	}
};

// ─── STOCK DECREMENTAR ────────────────────────────────────────────────────────

exports.decrementarStockInsumo = async function (req, res) {
	const id = req.params.id;
	const decremento = Number(req.body.decremento) || 0;

	if (!mongoose.Types.ObjectId.isValid(id)) {
		return res.status(400).json({ success: false, message: 'ID de insumo invalido' });
	}
	if (decremento <= 0) {
		return res.status(400).json({ success: false, message: 'El decremento debe ser mayor que 0' });
	}

	try {
		const insumo = await Insumo.findById(id);
		if (!insumo) return res.status(404).json({ success: false, message: 'Insumo no encontrado' });
		if ((insumo.cantidad || 0) < decremento) {
			return res.status(400).json({
				success: false,
				message: 'Stock insuficiente para decrementar',
				cantidadActual: insumo.cantidad,
				intentoDe: decremento
			});
		}
		insumo.cantidad = (insumo.cantidad || 0) - decremento;
		const actualizado = await insumo.save();
		return res.status(200).json({ success: true, message: 'Stock decrementado exitosamente', insumo: actualizado });
	} catch (err) {
		return res.status(500).json({ success: false, message: 'Error al decrementar stock', error: err.message });
	}
};
