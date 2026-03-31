'use strict'

var mongoose = require('mongoose');
var ProcesoSurtido = require('../modules/module-procesoSurtido');
var Movimiento = require('../modules/module-movimientos');
var Cuenta = require('../modules/cuenta');

const ORIGEN_MODELO_PROCESO_SURTIDO = 'procesossurtido';

const CUENTAS_SALIDA_VALIDAS = [
	'CAJA EFECTIVO ALMACEN',
	'CUENTA BANCARIA ALMACEN',
	'RETIROS EFECTIVO JUAN',
	'RETIROS EFECTIVO DONA YOLANDA'
];

const CONFIG_CUENTA_COMPRAS = {
	principal: 'INVENTARIOS/COMPRAS',
	alternas: ['INVENTARIOS COMPRAS', 'COMPRAS', 'INVENTARIOS']
};

const CONFIG_CUENTA_VIATICOS_SURTIDO = {
	principal: 'VIATICOS SURTIDO',
	alternas: ['VIATICOS DE SURTIDO', 'VIATICOS SURTIDOS', 'VIATICOS']
};

const ALTERNAS_CUENTAS_SALIDA = {
	'CAJA EFECTIVO ALMACEN': ['CAJA EFECTIVO'],
	'CUENTA BANCARIA ALMACEN': ['CUENTA BANCARIA'],
	'RETIROS EFECTIVO JUAN': ['RETIRO EFECTIVO JUAN', 'RETIROS JUAN'],
	'RETIROS EFECTIVO DONA YOLANDA': ['RETIROS YOLANDA', 'RETIRO EFECTIVO DONA YOLANDA']
};

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

function normalizarFacturasContado(facturas) {
	if (!Array.isArray(facturas)) return { ok: false, message: 'facturasContado debe ser un arreglo' };

	const resultado = [];
	for (let i = 0; i < facturas.length; i += 1) {
		const item = facturas[i] || {};
		const numeroFactura = normalizarTexto(item.numeroFactura);
		const monto = toNumber(item.monto);
		const cuentaSalidaCanonica = validarCuentaSalida(item.cuentaSalida);

		if (!numeroFactura) {
			return { ok: false, message: `numeroFactura es obligatorio en facturasContado[${i}]` };
		}

		if (monto === null || monto <= 0) {
			return { ok: false, message: `monto invalido en facturasContado[${i}]` };
		}

		if (!cuentaSalidaCanonica) {
			return {
				ok: false,
				message: `cuentaSalida invalida en facturasContado[${i}]. Opciones: ${CUENTAS_SALIDA_VALIDAS.join(', ')}`
			};
		}

		resultado.push({
			numeroFactura,
			proveedor: normalizarTexto(item.proveedor),
			descripcion: normalizarTexto(item.descripcion),
			monto,
			cuentaSalida: cuentaSalidaCanonica
		});
	}

	return { ok: true, data: resultado };
}

function normalizarViaticos(viaticos) {
	if (!Array.isArray(viaticos)) return { ok: false, message: 'viaticos debe ser un arreglo' };

	const resultado = [];
	for (let i = 0; i < viaticos.length; i += 1) {
		const item = viaticos[i] || {};
		const concepto = normalizarTexto(item.concepto);
		const monto = toNumber(item.monto);
		const cuentaSalidaCanonica = validarCuentaSalida(item.cuentaSalida);

		if (!concepto) {
			return { ok: false, message: `concepto es obligatorio en viaticos[${i}]` };
		}

		if (monto === null || monto <= 0) {
			return { ok: false, message: `monto invalido en viaticos[${i}]` };
		}

		if (!cuentaSalidaCanonica) {
			return {
				ok: false,
				message: `cuentaSalida invalida en viaticos[${i}]. Opciones: ${CUENTAS_SALIDA_VALIDAS.join(', ')}`
			};
		}

		resultado.push({
			concepto,
			descripcion: normalizarTexto(item.descripcion),
			monto,
			cuentaSalida: cuentaSalidaCanonica
		});
	}

	return { ok: true, data: resultado };
}

function normalizarTextoCuenta(valor) {
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
		cuentasPorNombre.set(normalizarTextoCuenta(cuenta.nombre), cuenta);
	}
	return cuentasPorNombre;
}

function resolverCuenta(cuentasPorNombre, principal, alternas) {
	const candidatos = [principal].concat(alternas || []);
	for (const nombre of candidatos) {
		const cuenta = cuentasPorNombre.get(normalizarTextoCuenta(nombre));
		if (cuenta) return cuenta;
	}
	return null;
}

function validarCuentaSalida(cuentaSalida) {
	const normalizada = normalizarTextoCuenta(cuentaSalida);
	for (const cuenta of CUENTAS_SALIDA_VALIDAS) {
		if (normalizarTextoCuenta(cuenta) === normalizada) {
			return cuenta;
		}
	}
	return null;
}

function construirMovimientosProcesoSurtido(proceso, cuentasPorNombre) {
	const movimientos = [];

	const cuentaCompras = resolverCuenta(
		cuentasPorNombre,
		CONFIG_CUENTA_COMPRAS.principal,
		CONFIG_CUENTA_COMPRAS.alternas
	);
	const cuentaViaticosSurtido = resolverCuenta(
		cuentasPorNombre,
		CONFIG_CUENTA_VIATICOS_SURTIDO.principal,
		CONFIG_CUENTA_VIATICOS_SURTIDO.alternas
	);

	const totalFacturas = Number(proceso.totalFacturas || 0);
	const totalViaticos = Number(proceso.totalViaticos || 0);
	if (totalFacturas <= 0 && totalViaticos <= 0) return movimientos;

	if (totalFacturas > 0 && !cuentaCompras) {
		throw new Error('No se encontro la cuenta INVENTARIOS/COMPRAS en contabilidad');
	}

	if (totalViaticos > 0 && !cuentaViaticosSurtido) {
		throw new Error('No se encontro la cuenta VIATICOS SURTIDO en contabilidad');
	}

	const fechaProceso = new Date(proceso.fecha);
	const fechaStr = `${fechaProceso.getFullYear()}-${String(fechaProceso.getMonth() + 1).padStart(2, '0')}-${String(fechaProceso.getDate()).padStart(2, '0')}`;

	for (const factura of (proceso.facturasContado || [])) {
		const montoFactura = Number(factura?.monto || 0);
		if (!(montoFactura > 0)) continue;

		const cuentaSalidaCanonica = validarCuentaSalida(factura?.cuentaSalida) || validarCuentaSalida(proceso.cuentaSalida);
		if (!cuentaSalidaCanonica) {
			throw new Error('Cada factura debe tener cuenta de salida valida');
		}

		const alternas = ALTERNAS_CUENTAS_SALIDA[cuentaSalidaCanonica] || [];
		const cuentaSalida = resolverCuenta(cuentasPorNombre, cuentaSalidaCanonica, alternas);
		if (!cuentaSalida) {
			throw new Error('No se encontro la cuenta contable de salida en factura: ' + cuentaSalidaCanonica);
		}

		const descripcionFacturas = `Proceso surtido factura ${factura?.numeroFactura || ''} ${fechaStr}`.trim();

		movimientos.push({
			cuentaId: cuentaCompras._id,
			origenModelo: ORIGEN_MODELO_PROCESO_SURTIDO,
			_idOrigen: proceso._id,
			debe: montoFactura,
			haber: 0,
			descripcion: descripcionFacturas,
			fecha: proceso.fecha
		});

		movimientos.push({
			cuentaId: cuentaSalida._id,
			origenModelo: ORIGEN_MODELO_PROCESO_SURTIDO,
			_idOrigen: proceso._id,
			debe: 0,
			haber: montoFactura,
			descripcion: descripcionFacturas,
			fecha: proceso.fecha
		});
	}

	for (const viatico of (proceso.viaticos || [])) {
		const montoViatico = Number(viatico?.monto || 0);
		if (!(montoViatico > 0)) continue;

		const cuentaSalidaCanonica = validarCuentaSalida(viatico?.cuentaSalida) || validarCuentaSalida(proceso.cuentaSalida);
		if (!cuentaSalidaCanonica) {
			throw new Error('Cada viatico debe tener cuenta de salida valida');
		}

		const alternas = ALTERNAS_CUENTAS_SALIDA[cuentaSalidaCanonica] || [];
		const cuentaSalida = resolverCuenta(cuentasPorNombre, cuentaSalidaCanonica, alternas);
		if (!cuentaSalida) {
			throw new Error('No se encontro la cuenta contable de salida en viatico: ' + cuentaSalidaCanonica);
		}

		const descripcionViaticos = `Proceso surtido viatico ${viatico?.concepto || ''} ${fechaStr}`.trim();

		movimientos.push({
			cuentaId: cuentaViaticosSurtido._id,
			origenModelo: ORIGEN_MODELO_PROCESO_SURTIDO,
			_idOrigen: proceso._id,
			debe: montoViatico,
			haber: 0,
			descripcion: descripcionViaticos,
			fecha: proceso.fecha
		});

		movimientos.push({
			cuentaId: cuentaSalida._id,
			origenModelo: ORIGEN_MODELO_PROCESO_SURTIDO,
			_idOrigen: proceso._id,
			debe: 0,
			haber: montoViatico,
			descripcion: descripcionViaticos,
			fecha: proceso.fecha
		});
	}

	return movimientos;
}

function calcularTotales(facturasContado, viaticos) {
	const totalFacturas = Number(
		facturasContado.reduce((acum, item) => acum + Number(item.monto || 0), 0).toFixed(2)
	);
	const totalViaticos = Number(
		viaticos.reduce((acum, item) => acum + Number(item.monto || 0), 0).toFixed(2)
	);
	const totalProceso = Number((totalFacturas + totalViaticos).toFixed(2));

	return { totalFacturas, totalViaticos, totalProceso };
}

async function limpiarMovimientosProceso(procesoId) {
	await Movimiento.deleteMany({
		origenModelo: ORIGEN_MODELO_PROCESO_SURTIDO,
		_idOrigen: procesoId
	});
}

async function recalcularYGuardarProceso(proceso) {
	const cuentaSalidaProcesoCanonica = validarCuentaSalida(proceso.cuentaSalida);

	for (const factura of (proceso.facturasContado || [])) {
		const cuentaSalidaLinea = validarCuentaSalida(factura?.cuentaSalida) || cuentaSalidaProcesoCanonica;
		if (cuentaSalidaLinea) {
			factura.cuentaSalida = cuentaSalidaLinea;
		}
	}

	for (const viatico of (proceso.viaticos || [])) {
		const cuentaSalidaLinea = validarCuentaSalida(viatico?.cuentaSalida) || cuentaSalidaProcesoCanonica;
		if (cuentaSalidaLinea) {
			viatico.cuentaSalida = cuentaSalidaLinea;
		}
	}

	const totales = calcularTotales(proceso.facturasContado || [], proceso.viaticos || []);
	proceso.totalFacturas = totales.totalFacturas;
	proceso.totalViaticos = totales.totalViaticos;
	proceso.totalProceso = totales.totalProceso;
	return await proceso.save();
}

function buildProcesoUpdateData(params, fecha, cuentaSalidaCanonica) {
	return {
		fecha,
		observaciones: normalizarTexto(params.observaciones),
		cuentaSalida: cuentaSalidaCanonica,
		origen: normalizarTexto(params.origen) || 'manual'
	};
}

function round2(value) {
	return Number(Number(value || 0).toFixed(2));
}

function almostEqual(a, b) {
	return Math.abs(Number(a || 0) - Number(b || 0)) <= 0.01;
}

function construirEstadoAsentamiento(proceso, stats) {
	const facturasConMonto = (proceso.facturasContado || []).filter(item => Number(item?.monto || 0) > 0).length;
	const viaticosConMonto = (proceso.viaticos || []).filter(item => Number(item?.monto || 0) > 0).length;
	const movimientosEsperados = (facturasConMonto + viaticosConMonto) * 2;
	const montoEsperado = round2(proceso.totalProceso || 0);

	const movimientosAsentados = Number(stats?.movimientosAsentados || 0);
	const debeAsentado = round2(stats?.debeAsentado || 0);
	const haberAsentado = round2(stats?.haberAsentado || 0);

	const conteoOk = movimientosAsentados === movimientosEsperados;
	const montosOk = almostEqual(debeAsentado, montoEsperado) && almostEqual(haberAsentado, montoEsperado);

	const facturasMovimientosEsperados = facturasConMonto * 2;
	const viaticosMovimientosEsperados = viaticosConMonto * 2;

	const facturasMovimientosAsentados = Number(stats?.facturasMovimientosAsentados || 0);
	const viaticosMovimientosAsentados = Number(stats?.viaticosMovimientosAsentados || 0);

	const facturasMontoEsperado = round2(proceso.totalFacturas || 0);
	const viaticosMontoEsperado = round2(proceso.totalViaticos || 0);

	const facturasDebeAsentado = round2(stats?.facturasDebeAsentado || 0);
	const facturasHaberAsentado = round2(stats?.facturasHaberAsentado || 0);
	const viaticosDebeAsentado = round2(stats?.viaticosDebeAsentado || 0);
	const viaticosHaberAsentado = round2(stats?.viaticosHaberAsentado || 0);

	let estado = 'pendiente';
	if (movimientosEsperados === 0) {
		estado = movimientosAsentados === 0 ? 'sin-movimientos' : 'descuadrado';
	} else if (conteoOk && montosOk) {
		estado = 'asentado';
	} else if (movimientosAsentados > 0) {
		estado = 'descuadrado';
	}

	return {
		estado,
		asentadoCompleto: estado === 'asentado' || estado === 'sin-movimientos',
		movimientosEsperados,
		movimientosAsentados,
		movimientosFaltantes: Math.max(movimientosEsperados - movimientosAsentados, 0),
		montoEsperado,
		debeAsentado,
		haberAsentado,
		porTipo: {
			facturas: {
				movimientosEsperados: facturasMovimientosEsperados,
				movimientosAsentados: facturasMovimientosAsentados,
				movimientosFaltantes: Math.max(facturasMovimientosEsperados - facturasMovimientosAsentados, 0),
				montoEsperado: facturasMontoEsperado,
				debeAsentado: facturasDebeAsentado,
				haberAsentado: facturasHaberAsentado,
				asentadoCompleto:
					facturasMovimientosEsperados === 0
						? facturasMovimientosAsentados === 0
						: facturasMovimientosAsentados === facturasMovimientosEsperados &&
						  almostEqual(facturasDebeAsentado, facturasMontoEsperado) &&
						  almostEqual(facturasHaberAsentado, facturasMontoEsperado)
			},
			viaticos: {
				movimientosEsperados: viaticosMovimientosEsperados,
				movimientosAsentados: viaticosMovimientosAsentados,
				movimientosFaltantes: Math.max(viaticosMovimientosEsperados - viaticosMovimientosAsentados, 0),
				montoEsperado: viaticosMontoEsperado,
				debeAsentado: viaticosDebeAsentado,
				haberAsentado: viaticosHaberAsentado,
				asentadoCompleto:
					viaticosMovimientosEsperados === 0
						? viaticosMovimientosAsentados === 0
						: viaticosMovimientosAsentados === viaticosMovimientosEsperados &&
						  almostEqual(viaticosDebeAsentado, viaticosMontoEsperado) &&
						  almostEqual(viaticosHaberAsentado, viaticosMontoEsperado)
			}
		}
	};
}

async function obtenerEstadisticasMovimientosPorProcesos(procesos) {
	if (!Array.isArray(procesos) || procesos.length === 0) return new Map();

	const ids = procesos
		.map(item => item?._id)
		.filter(id => mongoose.Types.ObjectId.isValid(id));

	if (ids.length === 0) return new Map();

	const agregados = await Movimiento.aggregate([
		{
			$match: {
				origenModelo: ORIGEN_MODELO_PROCESO_SURTIDO,
				_idOrigen: { $in: ids }
			}
		},
		{
			$group: {
				_id: '$_idOrigen',
				movimientosAsentados: { $sum: 1 },
				debeAsentado: { $sum: '$debe' },
				haberAsentado: { $sum: '$haber' },
				facturasMovimientosAsentados: {
					$sum: {
						$cond: [
							{ $regexMatch: { input: { $toLower: '$descripcion' }, regex: 'proceso surtido factura' } },
							1,
							0
						]
					}
				},
				facturasDebeAsentado: {
					$sum: {
						$cond: [
							{ $regexMatch: { input: { $toLower: '$descripcion' }, regex: 'proceso surtido factura' } },
							'$debe',
							0
						]
					}
				},
				facturasHaberAsentado: {
					$sum: {
						$cond: [
							{ $regexMatch: { input: { $toLower: '$descripcion' }, regex: 'proceso surtido factura' } },
							'$haber',
							0
						]
					}
				},
				viaticosMovimientosAsentados: {
					$sum: {
						$cond: [
							{ $regexMatch: { input: { $toLower: '$descripcion' }, regex: 'proceso surtido viatico' } },
							1,
							0
						]
					}
				},
				viaticosDebeAsentado: {
					$sum: {
						$cond: [
							{ $regexMatch: { input: { $toLower: '$descripcion' }, regex: 'proceso surtido viatico' } },
							'$debe',
							0
						]
					}
				},
				viaticosHaberAsentado: {
					$sum: {
						$cond: [
							{ $regexMatch: { input: { $toLower: '$descripcion' }, regex: 'proceso surtido viatico' } },
							'$haber',
							0
						]
					}
				}
			}
		}
	]);

	const map = new Map();
	for (const row of agregados) {
		map.set(String(row._id), {
			movimientosAsentados: Number(row.movimientosAsentados || 0),
			debeAsentado: round2(row.debeAsentado || 0),
			haberAsentado: round2(row.haberAsentado || 0),
			facturasMovimientosAsentados: Number(row.facturasMovimientosAsentados || 0),
			facturasDebeAsentado: round2(row.facturasDebeAsentado || 0),
			facturasHaberAsentado: round2(row.facturasHaberAsentado || 0),
			viaticosMovimientosAsentados: Number(row.viaticosMovimientosAsentados || 0),
			viaticosDebeAsentado: round2(row.viaticosDebeAsentado || 0),
			viaticosHaberAsentado: round2(row.viaticosHaberAsentado || 0)
		});
	}
	return map;
}

async function enriquecerProcesosConEstado(procesos) {
	if (!Array.isArray(procesos)) return [];

	const statsPorProceso = await obtenerEstadisticasMovimientosPorProcesos(procesos);

	return procesos.map(item => {
		const procesoPlano = typeof item?.toObject === 'function' ? item.toObject() : { ...item };
		const stats = statsPorProceso.get(String(item?._id)) || null;
		procesoPlano.estadoAsentamiento = construirEstadoAsentamiento(procesoPlano, stats);
		return procesoPlano;
	});
}

async function enriquecerProcesoConEstado(proceso) {
	if (!proceso) return null;
	const [procesoEnriquecido] = await enriquecerProcesosConEstado([proceso]);
	return procesoEnriquecido || null;
}

var controller = {
	getProcesosSurtido: async (req, res) => {
		try {
			const procesos = await ProcesoSurtido.find({}).sort({ fecha: -1 });
			if (!procesos || procesos.length === 0) {
				return res.status(404).send({ message: 'No hay procesos de surtido para mostrar' });
			}
			const procesosEnriquecidos = await enriquecerProcesosConEstado(procesos);
			return res.status(200).send({ procesos: procesosEnriquecidos });
		} catch (err) {
			return res.status(500).send({ message: 'Error al devolver procesos de surtido', error: err });
		}
	},

	getProcesoSurtidoByFecha: async (req, res) => {
		try {
			const fecha = normalizarFecha(req.params.fecha);
			if (!fecha) {
				return res.status(400).send({ message: 'Fecha invalida. Usa formato YYYY-MM-DD' });
			}

			const proceso = await ProcesoSurtido.findOne({ fecha });
			if (!proceso) {
				return res.status(404).send({ message: 'No existe proceso de surtido para esa fecha' });
			}

			const procesoEnriquecido = await enriquecerProcesoConEstado(proceso);
			return res.status(200).send({ proceso: procesoEnriquecido });
		} catch (err) {
			return res.status(500).send({ message: 'Error al buscar proceso de surtido por fecha', error: err });
		}
	},

	createProcesoSurtido: async (req, res) => {
		try {
			const params = req.body || {};
			const fecha = normalizarFecha(params.fecha);
			if (!fecha) {
				return res.status(400).send({ message: 'Fecha invalida. Usa formato YYYY-MM-DD' });
			}

			let cuentaSalidaCanonica = '';
			const cuentaSalidaRaw = normalizarTexto(params.cuentaSalida);
			if (cuentaSalidaRaw) {
				cuentaSalidaCanonica = validarCuentaSalida(params.cuentaSalida);
				if (!cuentaSalidaCanonica) {
					return res.status(400).send({ message: 'Cuenta de salida invalida. Opciones: ' + CUENTAS_SALIDA_VALIDAS.join(', ') });
				}
			}

			const existente = await ProcesoSurtido.findOne({ fecha });
			if (existente) {
				const existenteEnriquecido = await enriquecerProcesoConEstado(existente);
				return res.status(409).send({ message: 'Ya existe un proceso de surtido para esa fecha', proceso: existenteEnriquecido });
			}

			const proceso = await ProcesoSurtido.create({
				...buildProcesoUpdateData(params, fecha, cuentaSalidaCanonica),
				facturasContado: [],
				viaticos: [],
				totalFacturas: 0,
				totalViaticos: 0,
				totalProceso: 0
			});

			const procesoEnriquecido = await enriquecerProcesoConEstado(proceso);
			return res.status(201).send({ proceso: procesoEnriquecido });
		} catch (err) {
			return res.status(500).send({ message: 'Error al crear proceso de surtido', error: err });
		}
	},

	updateProcesoSurtido: async (req, res) => {
		try {
			const id = req.params.id;
			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id de proceso invalido' });
			}

			const params = req.body || {};
			const proceso = await ProcesoSurtido.findById(id);
			if (!proceso) {
				return res.status(404).send({ message: 'Proceso de surtido no encontrado' });
			}

			const fecha = params.fecha !== undefined ? normalizarFecha(params.fecha) : proceso.fecha;
			if (!fecha) {
				return res.status(400).send({ message: 'Fecha invalida. Usa formato YYYY-MM-DD' });
			}

			let cuentaSalidaCanonica = validarCuentaSalida(proceso.cuentaSalida) || '';
			if (params.cuentaSalida !== undefined) {
				const cuentaSalidaRaw = normalizarTexto(params.cuentaSalida);
				if (!cuentaSalidaRaw) {
					cuentaSalidaCanonica = '';
				} else {
					cuentaSalidaCanonica = validarCuentaSalida(params.cuentaSalida);
					if (!cuentaSalidaCanonica) {
						return res.status(400).send({ message: 'Cuenta de salida invalida. Opciones: ' + CUENTAS_SALIDA_VALIDAS.join(', ') });
					}
				}
			}

			const conflictoFecha = await ProcesoSurtido.findOne({ fecha, _id: { $ne: proceso._id } }).select('_id');
			if (conflictoFecha) {
				return res.status(409).send({ message: 'Ya existe un proceso de surtido para esa fecha' });
			}

			proceso.fecha = fecha;
			proceso.cuentaSalida = cuentaSalidaCanonica;
			if (params.observaciones !== undefined) {
				proceso.observaciones = normalizarTexto(params.observaciones);
			}
			if (params.origen !== undefined) {
				proceso.origen = normalizarTexto(params.origen) || 'manual';
			}

			const procesoStored = await recalcularYGuardarProceso(proceso);
			const procesoEnriquecido = await enriquecerProcesoConEstado(procesoStored);

			return res.status(200).send({ proceso: procesoEnriquecido });
		} catch (err) {
			return res.status(500).send({ message: 'Error al actualizar proceso de surtido', error: err });
		}
	},

	addFacturaProcesoSurtido: async (req, res) => {
		try {
			const id = req.params.id;
			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id de proceso invalido' });
			}

			const proceso = await ProcesoSurtido.findById(id);
			if (!proceso) {
				return res.status(404).send({ message: 'Proceso de surtido no encontrado' });
			}

			const factura = normalizarFacturasContado([req.body || {}]);
			if (!factura.ok) {
				return res.status(400).send({ message: factura.message });
			}

			proceso.facturasContado.push(factura.data[0]);
			const procesoStored = await recalcularYGuardarProceso(proceso);
			const procesoEnriquecido = await enriquecerProcesoConEstado(procesoStored);

			return res.status(200).send({ proceso: procesoEnriquecido });
		} catch (err) {
			return res.status(500).send({ message: 'Error al agregar factura al proceso de surtido', error: err });
		}
	},

	updateFacturaProcesoSurtido: async (req, res) => {
		try {
			const id = req.params.id;
			const idFactura = req.params.idFactura;
			if (!id || !mongoose.Types.ObjectId.isValid(id) || !idFactura || !mongoose.Types.ObjectId.isValid(idFactura)) {
				return res.status(400).send({ message: 'Id de proceso o factura invalido' });
			}

			const proceso = await ProcesoSurtido.findById(id);
			if (!proceso) {
				return res.status(404).send({ message: 'Proceso de surtido no encontrado' });
			}

			const factura = proceso.facturasContado.id(idFactura);
			if (!factura) {
				return res.status(404).send({ message: 'Factura no encontrada en el proceso' });
			}

			const facturaNormalizada = normalizarFacturasContado([req.body || {}]);
			if (!facturaNormalizada.ok) {
				return res.status(400).send({ message: facturaNormalizada.message });
			}

			factura.numeroFactura = facturaNormalizada.data[0].numeroFactura;
			factura.proveedor = facturaNormalizada.data[0].proveedor;
			factura.descripcion = facturaNormalizada.data[0].descripcion;
			factura.monto = facturaNormalizada.data[0].monto;
			factura.cuentaSalida = facturaNormalizada.data[0].cuentaSalida;

			const procesoStored = await recalcularYGuardarProceso(proceso);
			const procesoEnriquecido = await enriquecerProcesoConEstado(procesoStored);

			return res.status(200).send({ proceso: procesoEnriquecido });
		} catch (err) {
			return res.status(500).send({ message: 'Error al actualizar factura del proceso de surtido', error: err });
		}
	},

	deleteFacturaProcesoSurtido: async (req, res) => {
		try {
			const id = req.params.id;
			const idFactura = req.params.idFactura;
			if (!id || !mongoose.Types.ObjectId.isValid(id) || !idFactura || !mongoose.Types.ObjectId.isValid(idFactura)) {
				return res.status(400).send({ message: 'Id de proceso o factura invalido' });
			}

			const proceso = await ProcesoSurtido.findById(id);
			if (!proceso) {
				return res.status(404).send({ message: 'Proceso de surtido no encontrado' });
			}

			const factura = proceso.facturasContado.id(idFactura);
			if (!factura) {
				return res.status(404).send({ message: 'Factura no encontrada en el proceso' });
			}

			factura.deleteOne();
			const procesoStored = await recalcularYGuardarProceso(proceso);
			const procesoEnriquecido = await enriquecerProcesoConEstado(procesoStored);

			return res.status(200).send({ proceso: procesoEnriquecido });
		} catch (err) {
			return res.status(500).send({ message: 'Error al eliminar factura del proceso de surtido', error: err });
		}
	},

	addViaticoProcesoSurtido: async (req, res) => {
		try {
			const id = req.params.id;
			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id de proceso invalido' });
			}

			const proceso = await ProcesoSurtido.findById(id);
			if (!proceso) {
				return res.status(404).send({ message: 'Proceso de surtido no encontrado' });
			}

			const viatico = normalizarViaticos([req.body || {}]);
			if (!viatico.ok) {
				return res.status(400).send({ message: viatico.message });
			}

			proceso.viaticos.push(viatico.data[0]);
			const procesoStored = await recalcularYGuardarProceso(proceso);
			const procesoEnriquecido = await enriquecerProcesoConEstado(procesoStored);

			return res.status(200).send({ proceso: procesoEnriquecido });
		} catch (err) {
			return res.status(500).send({ message: 'Error al agregar viatico al proceso de surtido', error: err });
		}
	},

	updateViaticoProcesoSurtido: async (req, res) => {
		try {
			const id = req.params.id;
			const idViatico = req.params.idViatico;
			if (!id || !mongoose.Types.ObjectId.isValid(id) || !idViatico || !mongoose.Types.ObjectId.isValid(idViatico)) {
				return res.status(400).send({ message: 'Id de proceso o viatico invalido' });
			}

			const proceso = await ProcesoSurtido.findById(id);
			if (!proceso) {
				return res.status(404).send({ message: 'Proceso de surtido no encontrado' });
			}

			const viatico = proceso.viaticos.id(idViatico);
			if (!viatico) {
				return res.status(404).send({ message: 'Viatico no encontrado en el proceso' });
			}

			const viaticoNormalizado = normalizarViaticos([req.body || {}]);
			if (!viaticoNormalizado.ok) {
				return res.status(400).send({ message: viaticoNormalizado.message });
			}

			viatico.concepto = viaticoNormalizado.data[0].concepto;
			viatico.descripcion = viaticoNormalizado.data[0].descripcion;
			viatico.monto = viaticoNormalizado.data[0].monto;
			viatico.cuentaSalida = viaticoNormalizado.data[0].cuentaSalida;

			const procesoStored = await recalcularYGuardarProceso(proceso);
			const procesoEnriquecido = await enriquecerProcesoConEstado(procesoStored);

			return res.status(200).send({ proceso: procesoEnriquecido });
		} catch (err) {
			return res.status(500).send({ message: 'Error al actualizar viatico del proceso de surtido', error: err });
		}
	},

	deleteViaticoProcesoSurtido: async (req, res) => {
		try {
			const id = req.params.id;
			const idViatico = req.params.idViatico;
			if (!id || !mongoose.Types.ObjectId.isValid(id) || !idViatico || !mongoose.Types.ObjectId.isValid(idViatico)) {
				return res.status(400).send({ message: 'Id de proceso o viatico invalido' });
			}

			const proceso = await ProcesoSurtido.findById(id);
			if (!proceso) {
				return res.status(404).send({ message: 'Proceso de surtido no encontrado' });
			}

			const viatico = proceso.viaticos.id(idViatico);
			if (!viatico) {
				return res.status(404).send({ message: 'Viatico no encontrado en el proceso' });
			}

			viatico.deleteOne();
			const procesoStored = await recalcularYGuardarProceso(proceso);
			const procesoEnriquecido = await enriquecerProcesoConEstado(procesoStored);

			return res.status(200).send({ proceso: procesoEnriquecido });
		} catch (err) {
			return res.status(500).send({ message: 'Error al eliminar viatico del proceso de surtido', error: err });
		}
	},

	asentarMovimientosProcesoSurtido: async (req, res) => {
		try {
			const id = req.params.id;
			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id de proceso invalido' });
			}

			const proceso = await ProcesoSurtido.findById(id);
			if (!proceso) {
				return res.status(404).send({ message: 'Proceso de surtido no encontrado' });
			}

			const cuentas = await Cuenta.find({});
			const cuentasPorNombre = mapearCuentasPorNombre(cuentas);
			const movimientos = construirMovimientosProcesoSurtido(proceso, cuentasPorNombre);

			await limpiarMovimientosProceso(proceso._id);
			if (movimientos.length > 0) {
				await Movimiento.insertMany(movimientos);
			}

			const procesoEnriquecido = await enriquecerProcesoConEstado(proceso);

			return res.status(200).send({
				proceso: procesoEnriquecido,
				movimientosGenerados: movimientos.length,
				message: 'Movimientos contables asentados correctamente'
			});
		} catch (err) {
			return res.status(500).send({ message: 'Error al asentar movimientos del proceso de surtido', error: err });
		}
	},

	upsertProcesoSurtido: async (req, res) => {
		try {
			const params = req.body;
			const idProceso = normalizarTexto(params._id);
			const isEdicionPorId = Boolean(idProceso);
			if (isEdicionPorId && !mongoose.Types.ObjectId.isValid(idProceso)) {
				return res.status(400).send({ message: 'Id de proceso invalido para edicion' });
			}
			const fecha = normalizarFecha(params.fecha);
			if (!fecha) {
				return res.status(400).send({ message: 'Fecha invalida. Usa formato YYYY-MM-DD' });
			}

			let cuentaSalidaCanonica = '';
			const cuentaSalidaRaw = normalizarTexto(params.cuentaSalida);
			if (cuentaSalidaRaw) {
				cuentaSalidaCanonica = validarCuentaSalida(params.cuentaSalida);
				if (!cuentaSalidaCanonica) {
					return res.status(400).send({ message: 'Cuenta de salida invalida. Opciones: ' + CUENTAS_SALIDA_VALIDAS.join(', ') });
				}
			}

			const facturasNormalizadas = normalizarFacturasContado(params.facturasContado || []);
			if (!facturasNormalizadas.ok) {
				return res.status(400).send({ message: facturasNormalizadas.message });
			}

			const viaticosNormalizados = normalizarViaticos(params.viaticos || []);
			if (!viaticosNormalizados.ok) {
				return res.status(400).send({ message: viaticosNormalizados.message });
			}

			const totales = calcularTotales(facturasNormalizadas.data, viaticosNormalizados.data);

			// Si viene _id, se actualiza ese proceso. Si no viene, se usa fecha para crear/actualizar.
			const procesoExistente = isEdicionPorId
				? await ProcesoSurtido.findById(idProceso).select('_id')
				: await ProcesoSurtido.findOne({ fecha }).select('_id');

			if (isEdicionPorId && !procesoExistente) {
				return res.status(404).send({ message: 'Proceso de surtido no encontrado para edicion' });
			}

			const updateData = {
				...buildProcesoUpdateData(params, fecha, cuentaSalidaCanonica),
				facturasContado: facturasNormalizadas.data,
				viaticos: viaticosNormalizados.data,
				totalFacturas: totales.totalFacturas,
				totalViaticos: totales.totalViaticos,
				totalProceso: totales.totalProceso
			};

			const procesoStored = await ProcesoSurtido.findOneAndUpdate(
				isEdicionPorId ? { _id: idProceso } : { fecha },
				{ $set: updateData },
				{ returnDocument: 'after', upsert: !isEdicionPorId, setDefaultsOnInsert: true }
			);

			// En el nuevo flujo los movimientos se asientan solo cuando el usuario lo decide.
			// No se alteran movimientos en altas/ediciones automáticas del proceso.

			const procesoEnriquecido = await enriquecerProcesoConEstado(procesoStored);
			return res.status(200).send({ proceso: procesoEnriquecido });
		} catch (err) {
			return res.status(500).send({ message: 'Error al guardar proceso de surtido', error: err });
		}
	},

	deleteProcesoSurtido: async (req, res) => {
		try {
			const id = req.params.id;
			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id de proceso invalido' });
			}

			const procesoDeleted = await ProcesoSurtido.findByIdAndDelete(id);
			if (!procesoDeleted) {
				return res.status(404).send({ message: 'Proceso de surtido no encontrado' });
			}

			await Movimiento.deleteMany({ origenModelo: ORIGEN_MODELO_PROCESO_SURTIDO, _idOrigen: procesoDeleted._id });

			return res.status(200).send({ proceso: procesoDeleted });
		} catch (err) {
			return res.status(500).send({ message: 'Error al eliminar proceso de surtido', error: err });
		}
	}
};

module.exports = controller;
