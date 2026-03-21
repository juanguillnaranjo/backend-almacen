'use strict'

var CierreDiario = require('../modules/module-cierresDiarios.js');
var Movimiento = require('../modules/module-movimientos.js');
var Cuenta = require('../modules/cuenta.js');

const ORIGEN_MODELO_CIERRES = 'cierresdiarios';

const CONFIG_ASIENTOS_CIERRE = [
	{
		campoMonto: 'totalVentas',
		descripcion: 'Ventas diarias',
		cuentaDebe: 'CAJA EFECTIVO ALMACEN',
		cuentaDebeAlternas: ['CAJA EFECTIVO'],
		cuentaHaber: 'VENTAS ALMACEN',
		cuentaHaberAlternas: ['VENTAS']
	},
	{
		campoMonto: 'totalAbonos',
		descripcion: 'Abonos del dia',
		cuentaDebe: 'CAJA EFECTIVO ALMACEN',
		cuentaDebeAlternas: ['CAJA EFECTIVO'],
		cuentaHaber: 'ABONOS ALMACEN',
		cuentaHaberAlternas: ['ABONOS']
	},
	{
		campoMonto: 'totalGastos',
		descripcion: 'Gastos del almacen',
		cuentaDebe: 'GASTOS ALMACEN',
		cuentaDebeAlternas: ['GASTOS ALMACEN'],
		cuentaHaber: 'CAJA EFECTIVO ALMACEN',
		cuentaHaberAlternas: ['CAJA EFECTIVO']
	},
	{
		campoMonto: 'retiroTransferencias',
		descripcion: 'Transferencias del dia',
		cuentaDebe: 'CUENTA BANCARIA ALMACEN',
		cuentaDebeAlternas: ['CUENTA BANCARIA'],
		cuentaHaber: 'CAJA EFECTIVO ALMACEN',
		cuentaHaberAlternas: ['CAJA EFECTIVO']
	},
	{
		campoMonto: 'gastosArgemiro',
		descripcion: 'Gastos Argemiro',
		cuentaDebe: 'GASTOS ARGEMIRO',
		cuentaDebeAlternas: ['GASTOS DE ARGEMIRO'],
		cuentaHaber: 'CAJA EFECTIVO ALMACEN',
		cuentaHaberAlternas: ['CAJA EFECTIVO']
	},
	{
		campoMonto: 'retiroJuan',
		descripcion: 'Retiro de efectivo de Juan Guillermo',
		cuentaDebe: 'RETIROS EFECTIVO JUAN',
		cuentaDebeAlternas: ['RETIRO EFECTIVO JUAN', 'RETIROS JUAN'],
		cuentaHaber: 'CAJA EFECTIVO ALMACEN',
		cuentaHaberAlternas: ['CAJA EFECTIVO']
	},
	{
		campoMonto: 'retiroYolanda',
		descripcion: 'Retiro de efectivo de Doña Yolanda',
		cuentaDebe: 'RETIROS EFECTIVO DOÑA YOLANDA',
		cuentaDebeAlternas: ['RETIROS EFECTIVO DONA YOLANDA', 'RETIROS YOLANDA'],
		cuentaHaber: 'CAJA EFECTIVO ALMACEN',
		cuentaHaberAlternas: ['CAJA EFECTIVO']
	}
];

function normalizarFecha(fecha) {
	const date = new Date(fecha);
	if (isNaN(date.getTime())) return null;
	date.setHours(0, 0, 0, 0);
	return date;
}

function toNumber(value) {
	const number = Number(value);
	if (isNaN(number)) return null;
	return number;
}

function normalizarTexto(valor) {
	return String(valor || '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toUpperCase()
		.replace(/\s+/g, ' ')
		.trim();
}

function mapearCuentasPorNombre(cuentas) {
	const cuentasPorNombre = new Map();
	for (const cuenta of cuentas) {
		cuentasPorNombre.set(normalizarTexto(cuenta.nombre), cuenta);
	}
	return cuentasPorNombre;
}

function resolverCuenta(cuentasPorNombre, principal, alternas) {
	const candidatos = [principal].concat(alternas || []);
	for (const nombre of candidatos) {
		const cuenta = cuentasPorNombre.get(normalizarTexto(nombre));
		if (cuenta) return cuenta;
	}
	return null;
}

function construirMovimientosDesdeCierre(cierre, cuentasPorNombre) {
	const fecha = cierre.fecha;
	const idOrigen = cierre._id;
	const fechaEtiqueta = new Date(fecha).toISOString().slice(0, 10);
	const movimientos = [];

	for (const config of CONFIG_ASIENTOS_CIERRE) {
		const monto = Number(cierre[config.campoMonto] || 0);
		if (!(monto > 0)) continue;

		const cuentaDebe = resolverCuenta(cuentasPorNombre, config.cuentaDebe, config.cuentaDebeAlternas);
		const cuentaHaber = resolverCuenta(cuentasPorNombre, config.cuentaHaber, config.cuentaHaberAlternas);

		if (!cuentaDebe || !cuentaHaber) {
			throw new Error(
				`No se encontraron las cuentas requeridas para "${config.descripcion}": ${config.cuentaDebe} / ${config.cuentaHaber}`
			);
		}

		movimientos.push({
			cuentaId: cuentaDebe._id,
			origenModelo: ORIGEN_MODELO_CIERRES,
			_idOrigen: idOrigen,
			debe: monto,
			haber: 0,
			descripcion: `${config.descripcion} - cierre ${fechaEtiqueta}`,
			fecha
		});

		movimientos.push({
			cuentaId: cuentaHaber._id,
			origenModelo: ORIGEN_MODELO_CIERRES,
			_idOrigen: idOrigen,
			debe: 0,
			haber: monto,
			descripcion: `${config.descripcion} - cierre ${fechaEtiqueta}`,
			fecha
		});
	}

	return movimientos;
}

var controller = {
	getCierresDiarios: async (req, res) => {
		try {
			const cierres = await CierreDiario.find({}).sort({ fecha: -1 });
			if (!cierres || cierres.length === 0) {
				return res.status(404).send({ message: 'No hay cierres diarios para mostrar' });
			}
			return res.status(200).send({ cierres });
		} catch (err) {
			return res.status(500).send({ message: 'Error al devolver los cierres diarios', error: err });
		}
	},

	getCierreByFecha: async (req, res) => {
		try {
			const fechaNormalizada = normalizarFecha(req.params.fecha);
			if (!fechaNormalizada) {
				return res.status(400).send({ message: 'Fecha invalida. Usa formato YYYY-MM-DD' });
			}

			const cierre = await CierreDiario.findOne({ fecha: fechaNormalizada });
			if (!cierre) {
				return res.status(404).send({ message: 'No existe cierre diario para esa fecha' });
			}

			return res.status(200).send({ cierre });
		} catch (err) {
			return res.status(500).send({ message: 'Error al buscar cierre diario por fecha', error: err });
		}
	},

	upsertCierreDiario: async (req, res) => {
		try {
			const params = req.body;

			const fechaNormalizada = normalizarFecha(params.fecha);
			if (!fechaNormalizada) {
				return res.status(400).send({ message: 'Fecha invalida. Usa formato YYYY-MM-DD' });
			}

			const baseInicial = toNumber(params.baseInicial);
			const totalVentas = toNumber(params.totalVentas);
			const totalAbonos = toNumber(params.totalAbonos);
			const totalGastos = toNumber(params.totalGastos);
			const gastosArgemiro = toNumber(params.gastosArgemiro);
			const retiroTransferencias = toNumber(params.retiroTransferencias);
			const retiroJuan = toNumber(params.retiroJuan);
			const retiroYolanda = toNumber(params.retiroYolanda);
			const efectivoTeorico = toNumber(params.efectivoTeorico);
			const efectivoReal = toNumber(params.efectivoReal);

			const valores = [
				baseInicial,
				totalVentas,
				totalAbonos,
				totalGastos,
				gastosArgemiro,
				retiroTransferencias,
				retiroJuan,
				retiroYolanda,
				efectivoTeorico,
				efectivoReal
			];

			if (valores.some(v => v === null)) {
				return res.status(400).send({
					message: 'Todos los campos numericos son obligatorios y deben ser validos'
				});
			}

			const diferencia = params.diferencia !== undefined && params.diferencia !== null
				? toNumber(params.diferencia)
				: (efectivoReal - efectivoTeorico);

			if (diferencia === null) {
				return res.status(400).send({ message: 'El campo diferencia debe ser numerico' });
			}

			const updateData = {
				fecha: fechaNormalizada,
				baseInicial,
				totalVentas,
				totalAbonos,
				totalGastos,
				gastosArgemiro,
				retiroTransferencias,
				retiroJuan,
				retiroYolanda,
				efectivoTeorico,
				efectivoReal,
				diferencia,
				origen: params.origen || 'externo',
				fechaRecepcion: new Date()
			};

			const cierreStored = await CierreDiario.findOneAndUpdate(
				{ fecha: fechaNormalizada },
				updateData,
				{ returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
			);

			const cuentas = await Cuenta.find({}).select('_id nombre');
			const cuentasPorNombre = mapearCuentasPorNombre(cuentas);
			const movimientos = construirMovimientosDesdeCierre(cierreStored, cuentasPorNombre);

			await Movimiento.deleteMany({
				origenModelo: ORIGEN_MODELO_CIERRES,
				_idOrigen: cierreStored._id
			});

			if (movimientos.length > 0) {
				await Movimiento.insertMany(movimientos);
			}

			return res.status(200).send({
				cierre: cierreStored,
				movimientosGenerados: movimientos.length
			});
		} catch (err) {
			return res.status(500).send({ message: 'Error al guardar cierre diario', error: err });
		}
	}
};

module.exports = controller;
