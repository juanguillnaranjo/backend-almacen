'use strict'

var mongoose = require('mongoose');
var IngresoMio = require('../modules/module-ingresosMios');
var MovimientoMio = require('../modules/module-movimientoMios');
var CuentaMia = require('../modules/module-cuentasMias');

const ORIGEN_MODELO_INGRESOS_MIOS = 'ingresosmios';

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

function toNumber(value) {
	const number = Number(value);
	if (isNaN(number)) return null;
	return number;
}

function validarObjectId(valor) {
	return !!valor && mongoose.Types.ObjectId.isValid(String(valor));
}

function construirDescripcionIngreso(ingreso) {
	return `Ingreso ${ingreso.fuenteIngreso} - ${ingreso.descripcion}`;
}

async function resolverCuentasIngreso(cuentaDebeId, cuentaHaberId) {
	if (!validarObjectId(cuentaDebeId) || !validarObjectId(cuentaHaberId)) {
		return { ok: false, status: 400, message: 'Debes seleccionar cuentas validas para Debe y Haber' };
	}

	if (String(cuentaDebeId) === String(cuentaHaberId)) {
		return { ok: false, status: 400, message: 'Las cuentas Debe y Haber deben ser diferentes' };
	}

	const [cuentaDebe, cuentaHaber] = await Promise.all([
		CuentaMia.findById(cuentaDebeId),
		CuentaMia.findById(cuentaHaberId)
	]);

	if (!cuentaDebe || !cuentaHaber) {
		return { ok: false, status: 404, message: 'La cuenta Debe o Haber seleccionada no existe' };
	}

	return { ok: true, cuentaDebe, cuentaHaber };
}

async function sincronizarMovimientosIngreso(ingreso) {
	await MovimientoMio.deleteMany({
		origenModelo: ORIGEN_MODELO_INGRESOS_MIOS,
		_idOrigen: ingreso._id
	});

	const monto = Number(ingreso.monto || 0);
	if (!(monto > 0)) return 0;

	const descripcion = construirDescripcionIngreso(ingreso);

	await MovimientoMio.insertMany([
		{
			cuentaId: ingreso.cuentaDebeId,
			origenModelo: ORIGEN_MODELO_INGRESOS_MIOS,
			_idOrigen: ingreso._id,
			debe: monto,
			haber: 0,
			descripcion,
			fecha: ingreso.fecha
		},
		{
			cuentaId: ingreso.cuentaHaberId,
			origenModelo: ORIGEN_MODELO_INGRESOS_MIOS,
			_idOrigen: ingreso._id,
			debe: 0,
			haber: monto,
			descripcion,
			fecha: ingreso.fecha
		}
	]);

	return 2;
}

async function cargarIngresoConCuentas(id) {
	return IngresoMio.findById(id)
		.populate('cuentaDebeId', 'idCuenta nombre categoria')
		.populate('cuentaHaberId', 'idCuenta nombre categoria');
}

var controller = {
	getIngresosMios: async (req, res) => {
		try {
			const ingresos = await IngresoMio.find({})
				.populate('cuentaDebeId', 'idCuenta nombre categoria')
				.populate('cuentaHaberId', 'idCuenta nombre categoria')
				.sort({ fecha: -1, createdAt: -1 });

			if (!ingresos || ingresos.length === 0) {
				return res.status(404).send({ message: 'No hay ingresos personales para mostrar' });
			}

			return res.status(200).send({ ingresos });
		} catch (err) {
			return res.status(500).send({ message: 'Error al devolver ingresos personales', error: err });
		}
	},

	getIngresoMioById: async (req, res) => {
		try {
			const id = req.params.id;
			if (!validarObjectId(id)) {
				return res.status(400).send({ message: 'Id de ingreso invalido' });
			}

			const ingreso = await cargarIngresoConCuentas(id);
			if (!ingreso) {
				return res.status(404).send({ message: 'Ingreso no encontrado' });
			}

			return res.status(200).send({ ingreso });
		} catch (err) {
			return res.status(500).send({ message: 'Error al devolver ingreso personal', error: err });
		}
	},

	getResumenIngresosMios: async (req, res) => {
		try {
			const resumenGlobal = await IngresoMio.aggregate([
				{
					$group: {
						_id: null,
						totalIngresos: { $sum: 1 },
						montoTotal: { $sum: '$monto' }
					}
				}
			]);

			const porFuente = await IngresoMio.aggregate([
				{
					$group: {
						_id: '$fuenteIngreso',
						categoriaFuente: { $first: '$categoriaFuente' },
						cantidad: { $sum: 1 },
						total: { $sum: '$monto' }
					}
				},
				{ $sort: { total: -1, _id: 1 } }
			]);

			const resumen = resumenGlobal[0] || { totalIngresos: 0, montoTotal: 0 };

			return res.status(200).send({
				resumen: {
					totalIngresos: Number(resumen.totalIngresos || 0),
					montoTotal: Number(resumen.montoTotal || 0)
				},
				porFuente: porFuente.map(item => ({
					fuenteIngreso: item._id,
					categoriaFuente: item.categoriaFuente,
					cantidad: Number(item.cantidad || 0),
					total: Number(item.total || 0)
				}))
			});
		} catch (err) {
			return res.status(500).send({ message: 'Error al devolver resumen de ingresos personales', error: err });
		}
	},

	createIngresoMio: async (req, res) => {
		try {
			const params = req.body || {};

			const fecha = normalizarFecha(params.fecha);
			const monto = toNumber(params.monto);
			const descripcion = normalizarTexto(params.descripcion);
			const observaciones = normalizarTexto(params.observaciones);
			const cuentaDebeId = String(params.cuentaDebeId || '').trim();
			const cuentaHaberId = String(params.cuentaHaberId || '').trim();

			if (!fecha) {
				return res.status(400).send({ message: 'fecha invalida. Usa formato YYYY-MM-DD' });
			}
			if (monto === null || monto <= 0) {
				return res.status(400).send({ message: 'monto debe ser numerico y mayor a 0' });
			}
			if (!descripcion) {
				return res.status(400).send({ message: 'descripcion es obligatoria' });
			}

			const validacionCuentas = await resolverCuentasIngreso(cuentaDebeId, cuentaHaberId);
			if (!validacionCuentas.ok) {
				return res.status(validacionCuentas.status).send({ message: validacionCuentas.message });
			}

			const ingreso = new IngresoMio({
				fecha,
				monto,
				fuenteIngreso: normalizarTexto(validacionCuentas.cuentaHaber.nombre),
				categoriaFuente: normalizarTexto(validacionCuentas.cuentaHaber.categoria),
				descripcion,
				observaciones,
				cuentaDebeId,
				cuentaHaberId
			});

			const ingresoStored = await ingreso.save();
			const movimientosGenerados = await sincronizarMovimientosIngreso(ingresoStored);
			const ingresoConCuentas = await cargarIngresoConCuentas(ingresoStored._id);

			return res.status(200).send({ ingreso: ingresoConCuentas, movimientosGenerados });
		} catch (err) {
			return res.status(500).send({ message: 'Error al crear ingreso personal', error: err });
		}
	},

	updateIngresoMio: async (req, res) => {
		try {
			const id = req.params.id;
			if (!validarObjectId(id)) {
				return res.status(400).send({ message: 'Id de ingreso invalido' });
			}

			const ingreso = await IngresoMio.findById(id);
			if (!ingreso) {
				return res.status(404).send({ message: 'Ingreso no encontrado' });
			}

			const params = req.body || {};
			const fecha = normalizarFecha(params.fecha);
			const monto = toNumber(params.monto);
			const descripcion = normalizarTexto(params.descripcion);
			const observaciones = normalizarTexto(params.observaciones);
			const cuentaDebeId = String(params.cuentaDebeId || '').trim();
			const cuentaHaberId = String(params.cuentaHaberId || '').trim();

			if (!fecha) {
				return res.status(400).send({ message: 'fecha invalida. Usa formato YYYY-MM-DD' });
			}
			if (monto === null || monto <= 0) {
				return res.status(400).send({ message: 'monto debe ser numerico y mayor a 0' });
			}
			if (!descripcion) {
				return res.status(400).send({ message: 'descripcion es obligatoria' });
			}

			const validacionCuentas = await resolverCuentasIngreso(cuentaDebeId, cuentaHaberId);
			if (!validacionCuentas.ok) {
				return res.status(validacionCuentas.status).send({ message: validacionCuentas.message });
			}

			ingreso.fecha = fecha;
			ingreso.monto = monto;
			ingreso.fuenteIngreso = normalizarTexto(validacionCuentas.cuentaHaber.nombre);
			ingreso.categoriaFuente = normalizarTexto(validacionCuentas.cuentaHaber.categoria);
			ingreso.descripcion = descripcion;
			ingreso.observaciones = observaciones;
			ingreso.cuentaDebeId = cuentaDebeId;
			ingreso.cuentaHaberId = cuentaHaberId;

			const ingresoStored = await ingreso.save();
			const movimientosGenerados = await sincronizarMovimientosIngreso(ingresoStored);
			const ingresoConCuentas = await cargarIngresoConCuentas(ingresoStored._id);

			return res.status(200).send({ ingreso: ingresoConCuentas, movimientosGenerados });
		} catch (err) {
			return res.status(500).send({ message: 'Error al actualizar ingreso personal', error: err });
		}
	},

	deleteIngresoMio: async (req, res) => {
		try {
			const id = req.params.id;
			if (!validarObjectId(id)) {
				return res.status(400).send({ message: 'Id de ingreso invalido' });
			}

			const ingreso = await IngresoMio.findByIdAndDelete(id);
			if (!ingreso) {
				return res.status(404).send({ message: 'Ingreso no encontrado' });
			}

			const result = await MovimientoMio.deleteMany({
				origenModelo: ORIGEN_MODELO_INGRESOS_MIOS,
				_idOrigen: ingreso._id
			});

			return res.status(200).send({ message: 'Ingreso eliminado correctamente', movimientosEliminados: result.deletedCount || 0 });
		} catch (err) {
			return res.status(500).send({ message: 'Error al eliminar ingreso personal', error: err });
		}
	}
};

module.exports = controller;
