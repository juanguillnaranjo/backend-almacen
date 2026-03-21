'use strict'

var mongoose = require('mongoose');
var Movimiento = require('../modules/module-movimientos');
var Cuenta = require('../modules/cuenta');

const ORIGENES_MODELO_VALIDOS = ['gastofamilias', 'pagos', 'salidascaja', 'adicionbase', 'cierresdiarios', 'deudasproveedores', 'procesossurtido', 'manual', 'cobraalmacen'];

function normalizarOrigenModelo(origenModelo) {
	if (origenModelo === undefined || origenModelo === null) return '';
	return String(origenModelo).trim().toLowerCase();
}

function esOrigenModeloValido(origenModelo) {
	return ORIGENES_MODELO_VALIDOS.includes(origenModelo);
}

function normalizarTexto(valor) {
	return String(valor || '').trim();
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

var controller = {
	getMovimientos: async (req, res) => {
		try {
			const movimientos = await Movimiento.find({})
				.populate('cuentaId', 'idCuenta nombre categoria')
				.sort({ fecha: -1 });

			if (!movimientos || movimientos.length === 0) {
				return res.status(404).send({ message: 'No hay movimientos para mostrar' });
			}

			return res.status(200).send({ movimientos });
		} catch (err) {
			return res.status(500).send({ message: 'Error al devolver los movimientos', error: err });
		}
	},

	getMovimientosByOrigen: async (req, res) => {
		try {
			const _idOrigen = req.params.idOrigen;
			const origenModelo = normalizarOrigenModelo(req.params.origenModelo || req.query.origenModelo);

			if (!origenModelo) {
				return res.status(400).send({ message: 'origenModelo es obligatorio para trazabilidad multicoleccion' });
			}

			if (!esOrigenModeloValido(origenModelo)) {
				return res.status(400).send({
					message: `origenModelo invalido. Valores permitidos: ${ORIGENES_MODELO_VALIDOS.join(', ')}`
				});
			}

			if (!_idOrigen || !mongoose.Types.ObjectId.isValid(_idOrigen)) {
				return res.status(400).send({ message: 'idOrigen invalido' });
			}

			const movimientos = await Movimiento.find({ _idOrigen, origenModelo })
				.populate('cuentaId', 'idCuenta nombre categoria')
				.sort({ fecha: -1 });

			if (!movimientos || movimientos.length === 0) {
				return res.status(404).send({ message: 'No hay movimientos para el idOrigen indicado' });
			}

			return res.status(200).send({ movimientos });
		} catch (err) {
			return res.status(500).send({ message: 'Error al devolver movimientos por idOrigen', error: err });
		}
	},

	getMovimientosByCuenta: async (req, res) => {
		try {
			const cuentaId = req.params.cuentaId;
			if (!cuentaId || !mongoose.Types.ObjectId.isValid(cuentaId)) {
				return res.status(400).send({ message: 'cuentaId invalido' });
			}

			const movimientos = await Movimiento.find({ cuentaId })
				.populate('cuentaId', 'idCuenta nombre categoria')
				.sort({ fecha: -1, _id: -1 });

			if (!movimientos || movimientos.length === 0) {
				return res.status(404).send({ message: 'No hay movimientos para la cuenta seleccionada' });
			}

			return res.status(200).send({ movimientos });
		} catch (err) {
			return res.status(500).send({ message: 'Error al devolver movimientos por cuenta', error: err });
		}
	},

	createMovimiento: async (req, res) => {
		try {
			const params = req.body;
			const origenModelo = normalizarOrigenModelo(params.origenModelo) || 'manual';

			if (!params.cuentaId || !params.descripcion || !params.fecha) {
				return res.status(400).send({ message: 'Los campos cuenta, descripcion y fecha son obligatorios' });
			}

			const fecha = normalizarFecha(params.fecha);
			if (!fecha) {
				return res.status(400).send({ message: 'fecha invalida. Usa formato YYYY-MM-DD' });
			}

			if (!esOrigenModeloValido(origenModelo)) {
				return res.status(400).send({
					message: `origenModelo invalido. Valores permitidos: ${ORIGENES_MODELO_VALIDOS.join(', ')}`
				});
			}

			const idOrigen = params._idOrigen || new mongoose.Types.ObjectId();
			if (!mongoose.Types.ObjectId.isValid(idOrigen)) {
				return res.status(400).send({ message: '_idOrigen invalido' });
			}

			const debe = Number(params.debe || 0);
			const haber = Number(params.haber || 0);

			if ((debe <= 0 && haber <= 0) || (debe > 0 && haber > 0)) {
				return res.status(400).send({ message: 'Debe registrar solo debe o solo haber, y debe ser mayor a 0' });
			}

			const cuentaExiste = await Cuenta.findById(params.cuentaId);
			if (!cuentaExiste) {
				return res.status(404).send({ message: 'La cuenta seleccionada no existe' });
			}

			const movimiento = new Movimiento({
				cuentaId: params.cuentaId,
				origenModelo,
				_idOrigen: idOrigen,
				debe,
				haber,
				descripcion: params.descripcion,
				fecha
			});

			const movimientoStored = await movimiento.save();
			const movimientoConCuenta = await Movimiento.findById(movimientoStored._id)
				.populate('cuentaId', 'idCuenta nombre categoria');

			return res.status(200).send({ movimiento: movimientoConCuenta });
		} catch (err) {
			return res.status(500).send({ message: 'Error al guardar el movimiento', error: err });
		}
	},

	createAsientoManual: async (req, res) => {
		try {
			const params = req.body;
			const origenModelo = normalizarOrigenModelo(params.origenModelo) || 'manual';

			const cuentaOrigenId = normalizarTexto(params.cuentaOrigenId);
			const cuentaDestinoId = normalizarTexto(params.cuentaDestinoId);
			const descripcion = normalizarTexto(params.descripcion);
			const fecha = normalizarFecha(params.fecha);
			const monto = Number(params.monto || 0);

			if (!cuentaOrigenId || !cuentaDestinoId || !descripcion || !params.fecha) {
				return res.status(400).send({ message: 'Los campos cuentaOrigenId, cuentaDestinoId, descripcion y fecha son obligatorios' });
			}

			if (!fecha) {
				return res.status(400).send({ message: 'fecha invalida. Usa formato YYYY-MM-DD' });
			}

			if (!esOrigenModeloValido(origenModelo)) {
				return res.status(400).send({
					message: `origenModelo invalido. Valores permitidos: ${ORIGENES_MODELO_VALIDOS.join(', ')}`
				});
			}

			if (!mongoose.Types.ObjectId.isValid(cuentaOrigenId) || !mongoose.Types.ObjectId.isValid(cuentaDestinoId)) {
				return res.status(400).send({ message: 'Cuenta origen o cuenta destino invalida' });
			}

			if (cuentaOrigenId === cuentaDestinoId) {
				return res.status(400).send({ message: 'La cuenta origen y la cuenta destino deben ser diferentes' });
			}

			if (!(monto > 0)) {
				return res.status(400).send({ message: 'El monto debe ser mayor a 0' });
			}

			const [cuentaOrigen, cuentaDestino] = await Promise.all([
				Cuenta.findById(cuentaOrigenId),
				Cuenta.findById(cuentaDestinoId)
			]);

			if (!cuentaOrigen || !cuentaDestino) {
				return res.status(404).send({ message: 'La cuenta origen o destino no existe' });
			}

			const idOrigen = new mongoose.Types.ObjectId();
			const descripcionOrigen = `${descripcion} (origen)`;
			const descripcionDestino = `${descripcion} (destino)`;

			const movimientosGuardados = await Movimiento.insertMany([
				{
					cuentaId: cuentaOrigenId,
					origenModelo,
					_idOrigen: idOrigen,
					debe: 0,
					haber: monto,
					descripcion: descripcionOrigen,
					fecha
				},
				{
					cuentaId: cuentaDestinoId,
					origenModelo,
					_idOrigen: idOrigen,
					debe: monto,
					haber: 0,
					descripcion: descripcionDestino,
					fecha
				}
			]);

			const ids = movimientosGuardados.map(item => item._id);
			const movimientos = await Movimiento.find({ _id: { $in: ids } })
				.populate('cuentaId', 'idCuenta nombre categoria')
				.sort({ debe: -1 });

			return res.status(200).send({ movimientos, _idOrigen: idOrigen });
		} catch (err) {
			return res.status(500).send({ message: 'Error al guardar el asiento manual', error: err });
		}
	},

	updateAsientoManual: async (req, res) => {
		try {
			const idOrigen = req.params.idOrigen;
			if (!idOrigen || !mongoose.Types.ObjectId.isValid(idOrigen)) {
				return res.status(400).send({ message: 'idOrigen invalido' });
			}

			const params = req.body;
			const cuentaOrigenId = normalizarTexto(params.cuentaOrigenId);
			const cuentaDestinoId = normalizarTexto(params.cuentaDestinoId);
			const descripcion = normalizarTexto(params.descripcion);
			const fecha = normalizarFecha(params.fecha);
			const monto = Number(params.monto || 0);

			if (!cuentaOrigenId || !cuentaDestinoId || !descripcion || !params.fecha) {
				return res.status(400).send({ message: 'Los campos cuentaOrigenId, cuentaDestinoId, descripcion y fecha son obligatorios' });
			}

			if (!fecha) {
				return res.status(400).send({ message: 'fecha invalida. Usa formato YYYY-MM-DD' });
			}

			if (!mongoose.Types.ObjectId.isValid(cuentaOrigenId) || !mongoose.Types.ObjectId.isValid(cuentaDestinoId)) {
				return res.status(400).send({ message: 'Cuenta origen o cuenta destino invalida' });
			}

			if (cuentaOrigenId === cuentaDestinoId) {
				return res.status(400).send({ message: 'La cuenta origen y la cuenta destino deben ser diferentes' });
			}

			if (!(monto > 0)) {
				return res.status(400).send({ message: 'El monto debe ser mayor a 0' });
			}

			const existentes = await Movimiento.find({ _idOrigen: idOrigen, origenModelo: 'manual' });
			if (!existentes || existentes.length === 0) {
				return res.status(404).send({ message: 'No existe asiento manual para el idOrigen indicado' });
			}

			const [cuentaOrigen, cuentaDestino] = await Promise.all([
				Cuenta.findById(cuentaOrigenId),
				Cuenta.findById(cuentaDestinoId)
			]);

			if (!cuentaOrigen || !cuentaDestino) {
				return res.status(404).send({ message: 'La cuenta origen o destino no existe' });
			}

			await Movimiento.deleteMany({ _idOrigen: idOrigen, origenModelo: 'manual' });

			const descripcionOrigen = `${descripcion} (origen)`;
			const descripcionDestino = `${descripcion} (destino)`;

			const movimientosGuardados = await Movimiento.insertMany([
				{
					cuentaId: cuentaOrigenId,
					origenModelo: 'manual',
					_idOrigen: idOrigen,
					debe: 0,
					haber: monto,
					descripcion: descripcionOrigen,
					fecha
				},
				{
					cuentaId: cuentaDestinoId,
					origenModelo: 'manual',
					_idOrigen: idOrigen,
					debe: monto,
					haber: 0,
					descripcion: descripcionDestino,
					fecha
				}
			]);

			const ids = movimientosGuardados.map(item => item._id);
			const movimientos = await Movimiento.find({ _id: { $in: ids } })
				.populate('cuentaId', 'idCuenta nombre categoria')
				.sort({ debe: -1 });

			return res.status(200).send({ movimientos, _idOrigen: idOrigen });
		} catch (err) {
			return res.status(500).send({ message: 'Error al actualizar el asiento manual', error: err });
		}
	},

	deleteAsientoManual: async (req, res) => {
		try {
			const idOrigen = req.params.idOrigen;
			if (!idOrigen || !mongoose.Types.ObjectId.isValid(idOrigen)) {
				return res.status(400).send({ message: 'idOrigen invalido' });
			}

			const result = await Movimiento.deleteMany({ _idOrigen: idOrigen, origenModelo: 'manual' });
			if (!result || result.deletedCount === 0) {
				return res.status(404).send({ message: 'No existe asiento manual para eliminar con el idOrigen indicado' });
			}

			return res.status(200).send({ deletedCount: result.deletedCount, _idOrigen: idOrigen });
		} catch (err) {
			return res.status(500).send({ message: 'Error al eliminar el asiento manual', error: err });
		}
	}
};

module.exports = controller;
