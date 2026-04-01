'use strict'

var CierreOrange = require('../modules/module-cierresOrange.js');
var CuentaOrange = require('../modules/module-cuentasOrange.js');
var MovimientoOrange = require('../modules/module-movimientosOrange.js');
var GastoOrange = require('../modules/module-gastosOrange.js');

// ─── Constants ────────────────────────────────────────────────────────────────
const ORIGEN_MODELO_CIERRES_ORANGE = 'cierre_orange';

// ─── Asientos CONFIG ──────────────────────────────────────────────────────────
const CONFIG_ASIENTOS_CIERRE_ORANGE = [
	// VentaTotalMesas: O4.1.001 (HABER) vs O1.1.001 CAJA (DEBE)
	{ idCuenta: 'O1.1.001', tipo: 'debe', monto: (c) => c.ventaTotalMesas, desc: 'Venta mesas' },
	{ idCuenta: 'O4.1.001', tipo: 'haber', monto: (c) => c.ventaTotalMesas, desc: 'Venta mesas' },
	// VentaTotalDomicilio: O4.1.002 (HABER) vs O1.1.001 CAJA (DEBE)
	{ idCuenta: 'O1.1.001', tipo: 'debe', monto: (c) => c.ventaTotalDomicilio, desc: 'Venta domicilios' },
	{ idCuenta: 'O4.1.002', tipo: 'haber', monto: (c) => c.ventaTotalDomicilio, desc: 'Venta domicilios' },
	// VentaTotalLlevar: O4.1.003 (HABER) vs O1.1.001 CAJA (DEBE)
	{ idCuenta: 'O1.1.001', tipo: 'debe', monto: (c) => c.ventaTotalLlevar, desc: 'Venta para llevar' },
	{ idCuenta: 'O4.1.003', tipo: 'haber', monto: (c) => c.ventaTotalLlevar, desc: 'Venta para llevar' },
	// RetiroTransferencias: O1.1.002 (DEBE) vs O1.1.001 CAJA (HABER)
	{ idCuenta: 'O1.1.002', tipo: 'debe', monto: (c) => c.retiroTransferencias, desc: 'Retiro transferencias' },
	{ idCuenta: 'O1.1.001', tipo: 'haber', monto: (c) => c.retiroTransferencias, desc: 'Retiro transferencias' },
	// RetiroEfectivo: O1.1.003 (DEBE) vs O1.1.001 CAJA (HABER)
	{ idCuenta: 'O1.1.003', tipo: 'debe', monto: (c) => c.retiroEfectivo, desc: 'Retiro efectivo' },
	{ idCuenta: 'O1.1.001', tipo: 'haber', monto: (c) => c.retiroEfectivo, desc: 'Retiro efectivo' }
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizarTexto(valor) {
	return String(valor || '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.trim()
		.toLowerCase()
		.replace(/\s+/g, ' ');
}

function obtenerRangoDia(fecha) {
	const desde = new Date(fecha);
	desde.setHours(0, 0, 0, 0);
	const hasta = new Date(desde);
	hasta.setDate(hasta.getDate() + 1);
	return { desde, hasta };
}

function resolverCuentaDebeParaGasto(gasto) {
	const clase = normalizarTexto(gasto && gasto.claseGasto);
	const subclase = normalizarTexto(gasto && gasto.subclaseGasto);

	const esMateriaPrima =
		(subclase === 'materia prima') &&
		(clase === 'costo de ventas' || clase === 'costos de ventas');
	if (esMateriaPrima) {
		return 'O1.1.004'; // COMPRAS / INVENTARIO
	}

	const esGastoNoOrangeHogar = clase === 'gastos no orange' && subclase === 'hogar';
	if (esGastoNoOrangeHogar) {
		return 'O3.0.001'; // GASTOS NO ORANGE
	}

	return 'O5.2.001'; // GASTOS ORANGE (regla general)
}

async function construirMovimientosGastosDesdeCierreOrange(cierre, cuentasMap) {
	const { desde, hasta } = obtenerRangoDia(cierre.fecha);
	const gastosDia = await GastoOrange.find({
		fecha: { $gte: desde, $lt: hasta }
	}).select('_id fecha monto claseGasto subclaseGasto tipoGasto descripcion');

	const movimientos = [];
	const cuentaCaja = cuentasMap.get('O1.1.001');
	if (!cuentaCaja) {
		console.warn('[CierreOrange] Cuenta no encontrada: O1.1.001, no se pueden generar asientos de gastos');
		return movimientos;
	}

	for (const gasto of gastosDia) {
		const monto = Number(gasto && gasto.monto || 0);
		if (!(monto > 0)) continue;

		const idCuentaDebe = resolverCuentaDebeParaGasto(gasto);
		const cuentaDebe = cuentasMap.get(idCuentaDebe);
		if (!cuentaDebe) {
			console.warn(`[CierreOrange] Cuenta no encontrada: ${idCuentaDebe}, saltando gasto ${gasto._id}`);
			continue;
		}

		const clase = normalizarTexto(gasto && gasto.claseGasto) || 'sin-clase';
		const subclase = normalizarTexto(gasto && gasto.subclaseGasto) || 'sin-subclase';
		const tipo = normalizarTexto(gasto && gasto.tipoGasto) || 'sin-tipo';
		const descripcionBase = String(gasto && gasto.descripcion || '').trim();
		const descripcion = descripcionBase
			? `Gasto ${clase}/${subclase}/${tipo}: ${descripcionBase}`
			: `Gasto ${clase}/${subclase}/${tipo}`;

		movimientos.push({
			cuentaId: cuentaDebe._id,
			origenModelo: ORIGEN_MODELO_CIERRES_ORANGE,
			_idOrigen: cierre._id,
			debe: monto,
			haber: 0,
			descripcion,
			fecha: cierre.fecha
		});

		movimientos.push({
			cuentaId: cuentaCaja._id,
			origenModelo: ORIGEN_MODELO_CIERRES_ORANGE,
			_idOrigen: cierre._id,
			debe: 0,
			haber: monto,
			descripcion,
			fecha: cierre.fecha
		});
	}

	return movimientos;
}

async function construirMovimientosDesdeCierreOrange(cierre) {
	const cuentas = await CuentaOrange.find({}).select('_id idCuenta');
	const cuentasMap = new Map();
	for (const c of cuentas) {
		cuentasMap.set(c.idCuenta, c);
	}

	const fecha = cierre.fecha;
	const idOrigen = cierre._id;
	const fechaEtiqueta = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
	const movimientos = [];

	for (const config of CONFIG_ASIENTOS_CIERRE_ORANGE) {
		const monto = typeof config.monto === 'function'
			? Number(config.monto(cierre) || 0)
			: Number(config.monto || 0);

		if (!(monto > 0)) continue;

		const cuenta = cuentasMap.get(config.idCuenta);
		if (!cuenta) {
			console.warn(`[CierreOrange] Cuenta no encontrada: ${config.idCuenta}, saltando asiento`);
			continue;
		}

		movimientos.push({
			cuentaId: cuenta._id,
			origenModelo: ORIGEN_MODELO_CIERRES_ORANGE,
			_idOrigen: idOrigen,
			debe: config.tipo === 'debe' ? monto : 0,
			haber: config.tipo === 'haber' ? monto : 0,
			descripcion: `${config.desc} - cierre ${fechaEtiqueta}`,
			fecha
		});
	}

	const movimientosGastos = await construirMovimientosGastosDesdeCierreOrange(cierre, cuentasMap);
	if (movimientosGastos.length > 0) {
		movimientos.push(...movimientosGastos);
	}

	return movimientos;
}

function normalizarFecha(fecha) {
	const valor = String(fecha || '').trim();
	if (!valor) return null;
	const partes = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (!partes) return null;
	const [ , y, m, d ] = partes;
	const date = new Date(Number(y), Number(m) - 1, Number(d));
	if (isNaN(date.getTime())) return null;
	return date;
}

function toNumber(val) {
	if (val === null || val === undefined || String(val).trim() === '') return null;
	const n = Number(val);
	return isNaN(n) ? null : n;
}

function construirDatosCierreDesdeParams(params) {
	const fechaNormalizada = normalizarFecha(params.fecha);
	if (!fechaNormalizada) {
		return { ok: false, status: 400, message: 'Fecha invalida. Usa formato YYYY-MM-DD' };
	}

	const baseInicial          = toNumber(params.baseInicial);
	const totalVentas          = toNumber(params.totalVentas);
	const totalGastos          = toNumber(params.totalGastos);
	const retiroEfectivo       = toNumber(params.retiroEfectivo);
	const retiroTransferencias = toNumber(params.retiroTransferencias);
	const efectivoReal         = toNumber(params.efectivoReal);
	const baseSigDia           = toNumber(params.baseSigDia);
	const efectivoTeorico      = toNumber(params.efectivoTeorico);
	const ventaTotalDomicilio  = toNumber(
		params.VentaTotalDomicilio !== undefined
			? params.VentaTotalDomicilio
			: params.ventaTotalDomicilio
	);
	const ventaTotalMesas      = toNumber(
		params.VentaTotalMesas !== undefined
			? params.VentaTotalMesas
			: params.ventaTotalMesas
	);
	const ventaTotalLlevar     = toNumber(
		params.VentaTotalLlevar !== undefined
			? params.VentaTotalLlevar
			: params.ventaTotalLlevar
	);

	const camposNumericos = [
		baseInicial, totalVentas, totalGastos,
		retiroEfectivo, retiroTransferencias,
		efectivoReal, baseSigDia, efectivoTeorico,
		ventaTotalDomicilio, ventaTotalMesas, ventaTotalLlevar
	];

	if (camposNumericos.some(v => v === null)) {
		return {
			ok: false,
			status: 400,
			message: 'Todos los campos numericos son obligatorios y deben ser validos'
		};
	}

	const diferencia = params.diferencia !== undefined && params.diferencia !== null
		? toNumber(params.diferencia)
		: (efectivoReal - efectivoTeorico);

	if (diferencia === null) {
		return { ok: false, status: 400, message: 'El campo diferencia debe ser numerico' };
	}

	return {
		ok: true,
		data: {
			fecha:                fechaNormalizada,
			baseInicial,
			totalVentas,
			totalGastos,
			retiroEfectivo,
			retiroTransferencias,
			efectivoReal,
			baseSigDia,
			efectivoTeorico,
			diferencia,
			ventaTotalDomicilio,
			ventaTotalMesas,
			ventaTotalLlevar,
			origen:         String(params.origen || 'externo'),
			fechaRecepcion: new Date()
		}
	};
}

// ─── Controller ──────────────────────────────────────────────────────────────

var controller = {

	getCierresOrange: async (req, res) => {
		try {
			const cierres = await CierreOrange.find({}).sort({ fecha: -1 });
			if (!cierres || cierres.length === 0) {
				return res.status(404).send({ message: 'No hay cierres Orange para mostrar' });
			}
			return res.status(200).send({ cierres });
		} catch (err) {
			return res.status(500).send({ message: 'Error al devolver los cierres Orange', error: err });
		}
	},

	getCierreOrangeByFecha: async (req, res) => {
		try {
			const fechaNormalizada = normalizarFecha(req.params.fecha);
			if (!fechaNormalizada) {
				return res.status(400).send({ message: 'Fecha invalida. Usa formato YYYY-MM-DD' });
			}
			const cierre = await CierreOrange.findOne({ fecha: fechaNormalizada });
			if (!cierre) {
				return res.status(404).send({ message: 'No existe cierre Orange para esa fecha' });
			}
			return res.status(200).send({ cierre });
		} catch (err) {
			return res.status(500).send({ message: 'Error al buscar cierre Orange por fecha', error: err });
		}
	},

	deleteCierreOrangeByFecha: async (req, res) => {
		try {
			const fechaNormalizada = normalizarFecha(req.params.fecha);
			if (!fechaNormalizada) {
				return res.status(400).send({ message: 'Fecha invalida. Usa formato YYYY-MM-DD' });
			}

			const cierre = await CierreOrange.findOne({ fecha: fechaNormalizada });
			if (!cierre) {
				return res.status(404).send({ message: 'No existe cierre Orange para esa fecha' });
			}

			const movimientosEliminados = await MovimientoOrange.deleteMany({
				origenModelo: ORIGEN_MODELO_CIERRES_ORANGE,
				_idOrigen: cierre._id
			});

			await CierreOrange.deleteOne({ _id: cierre._id });

			return res.status(200).send({
				message: 'Cierre Orange y movimientos contables eliminados correctamente',
				cierreEliminadoId: cierre._id,
				movimientosEliminados: movimientosEliminados.deletedCount || 0
			});
		} catch (err) {
			return res.status(500).send({ message: 'Error al eliminar cierre Orange', error: err });
		}
	},

	upsertCierreOrange: async (req, res) => {
		try {
			const validacion = construirDatosCierreDesdeParams(req.body || {});
			if (!validacion.ok) {
				return res.status(validacion.status).send({ message: validacion.message });
			}

			const updateData = validacion.data;

			const cierre = await CierreOrange.findOneAndUpdate(
				{ fecha: updateData.fecha },
				{ $set: updateData },
				{ upsert: true, returnDocument: 'after', runValidators: true }
			);

			// Generar movimientos contables del cierre
			const movimientos = await construirMovimientosDesdeCierreOrange(cierre);

			// Limpiar movimientos previos del mismo cierre
			await MovimientoOrange.deleteMany({
				origenModelo: ORIGEN_MODELO_CIERRES_ORANGE,
				_idOrigen: cierre._id
			});

			// Insertar nuevos movimientos
			if (movimientos.length > 0) {
				await MovimientoOrange.insertMany(movimientos);
			}

			return res.status(200).send({
				message: 'Cierre Orange guardado correctamente',
				cierre,
				movimientosGenerados: movimientos.length
			});

		} catch (err) {
			if (err.code === 11000) {
				return res.status(409).send({ message: 'Ya existe un cierre Orange para esa fecha' });
			}
			return res.status(500).send({ message: 'Error al guardar el cierre Orange', error: err });
		}
	},

	rehacerCierreOrange: async (req, res) => {
		try {
			const validacion = construirDatosCierreDesdeParams(req.body || {});
			if (!validacion.ok) {
				return res.status(validacion.status).send({ message: validacion.message });
			}

			const nuevoCierreData = validacion.data;
			const cierreAnterior = await CierreOrange.findOne({ fecha: nuevoCierreData.fecha });

			if (cierreAnterior) {
				await MovimientoOrange.deleteMany({
					origenModelo: ORIGEN_MODELO_CIERRES_ORANGE,
					_idOrigen: cierreAnterior._id
				});

				await CierreOrange.deleteOne({ _id: cierreAnterior._id });
			}

			const cierre = await CierreOrange.create(nuevoCierreData);
			const movimientos = await construirMovimientosDesdeCierreOrange(cierre);

			if (movimientos.length > 0) {
				await MovimientoOrange.insertMany(movimientos);
			}

			return res.status(200).send({
				message: cierreAnterior
					? 'Cierre Orange rehecho correctamente (se deshizo el cierre anterior y sus movimientos)'
					: 'Cierre Orange guardado correctamente',
				cierre,
				movimientosGenerados: movimientos.length
			});
		} catch (err) {
			if (err.code === 11000) {
				return res.status(409).send({ message: 'Ya existe un cierre Orange para esa fecha' });
			}
			return res.status(500).send({ message: 'Error al rehacer el cierre Orange', error: err });
		}
	}
};

module.exports = controller;
