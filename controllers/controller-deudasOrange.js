'use strict'

var mongoose = require('mongoose');
var DeudaProveedorOrange = require('../modules/module-deudasOrange');
var MovimientoOrange = require('../modules/module-movimientosOrange');
var CuentaOrange = require('../modules/module-cuentasOrange');

const ORIGEN_MODELO_DEUDAS_ORANGE = 'deudasorange';

const CONFIG_CUENTA_COMPRAS_ORANGE = {
	principalId: 'O1.1.004',
	alternasId: [],
	principalNombre: 'COMPRAS / INVENTARIO',
	alternasNombre: ['COMPRAS/INVENTARIO', 'INVENTARIOS/COMPRAS', 'INVENTARIOS COMPRAS', 'COMPRAS', 'INVENTARIOS']
};

const CONFIG_CUENTA_DEUDAS_ORANGE = {
	principalId: 'O2.1.001',
	alternasId: [],
	principalNombre: 'DEUDAS ORANGE',
	alternasNombre: ['DEUDAS PROVEEDORES ORANGE', 'DEUDAS PROVEEDORES', 'CUENTAS POR PAGAR PROVEEDORES', 'PROVEEDORES POR PAGAR']
};

function normalizarTexto(valor) {
	return String(valor || '').trim();
}

function normalizarTextoCuenta(valor) {
	return String(valor || '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toUpperCase()
		.replace(/\s+/g, ' ')
		.trim();
}

function toNumber(value) {
	const number = Number(value);
	if (isNaN(number)) return null;
	return number;
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

function calcularEstadoFactura(montoFactura, montoAbonado) {
	if (montoAbonado <= 0) return 'pendiente';
	if (montoAbonado >= montoFactura) return 'pagada';
	return 'parcial';
}

function recalcularTotalesProveedor(proveedor) {
	let totalDeuda = 0;
	let totalAbonado = 0;
	let totalPendiente = 0;

	for (const factura of proveedor.facturas) {
		totalDeuda += Number(factura.montoFactura || 0);
		totalAbonado += Number(factura.montoAbonado || 0);
		totalPendiente += Number(factura.saldoPendiente || 0);
	}

	proveedor.totalFacturas = proveedor.facturas.length;
	proveedor.totalDeuda = Number(totalDeuda.toFixed(2));
	proveedor.totalAbonado = Number(totalAbonado.toFixed(2));
	proveedor.totalPendiente = Number(totalPendiente.toFixed(2));
}

function construirDescripcionFactura(proveedor, factura) {
	return `Factura ${factura.numeroFactura} - ${proveedor.nombreProveedor}`;
}

function construirDescripcionAbono(proveedor, factura) {
	return `Abono factura ${factura.numeroFactura} - ${proveedor.nombreProveedor}`;
}

function mapearCuentasOrange(cuentas) {
	const porIdCuenta = new Map();
	const porNombre = new Map();
	for (const cuenta of cuentas) {
		porIdCuenta.set(String(cuenta.idCuenta || ''), cuenta);
		porNombre.set(normalizarTextoCuenta(cuenta.nombre), cuenta);
	}
	return { porIdCuenta, porNombre };
}

function resolverCuentaOrange(cuentasMap, config) {
	for (const idCuenta of [config.principalId].concat(config.alternasId || [])) {
		const cuenta = cuentasMap.porIdCuenta.get(String(idCuenta || ''));
		if (cuenta) return cuenta;
	}

	for (const nombre of [config.principalNombre].concat(config.alternasNombre || [])) {
		const cuenta = cuentasMap.porNombre.get(normalizarTextoCuenta(nombre));
		if (cuenta) return cuenta;
	}

	return null;
}

function construirMovimientosFacturaProveedorOrange(proveedor, factura, cuentasMap) {
	const movimientos = [];
	const cuentaCompras = resolverCuentaOrange(cuentasMap, CONFIG_CUENTA_COMPRAS_ORANGE);
	const cuentaDeudas = resolverCuentaOrange(cuentasMap, CONFIG_CUENTA_DEUDAS_ORANGE);

	if (!cuentaCompras || !cuentaDeudas) {
		throw new Error('No se encontraron las cuentas requeridas para registrar facturas de deudas Orange');
	}

	const montoFactura = Number(factura.montoFactura || 0);
	if (montoFactura > 0) {
		movimientos.push({
			cuentaId: cuentaCompras._id,
			origenModelo: ORIGEN_MODELO_DEUDAS_ORANGE,
			_idOrigen: factura._id,
			debe: montoFactura,
			haber: 0,
			descripcion: construirDescripcionFactura(proveedor, factura),
			fecha: factura.fechaFactura
		});

		movimientos.push({
			cuentaId: cuentaDeudas._id,
			origenModelo: ORIGEN_MODELO_DEUDAS_ORANGE,
			_idOrigen: factura._id,
			debe: 0,
			haber: montoFactura,
			descripcion: construirDescripcionFactura(proveedor, factura),
			fecha: factura.fechaFactura
		});
	}

	for (const abono of (factura.abonos || [])) {
		const montoAbono = Number(abono.monto || 0);
		if (!(montoAbono > 0)) continue;

		const cuentaSalida = cuentasMap.porIdCuenta.get(String(abono.cuentaSalidaIdCuenta || ''));
		if (!cuentaSalida) {
			throw new Error(`No existe la cuenta de salida ${abono.cuentaSalidaIdCuenta} en Orange`);
		}

		movimientos.push({
			cuentaId: cuentaDeudas._id,
			origenModelo: ORIGEN_MODELO_DEUDAS_ORANGE,
			_idOrigen: factura._id,
			debe: montoAbono,
			haber: 0,
			descripcion: construirDescripcionAbono(proveedor, factura),
			fecha: abono.fecha || new Date()
		});

		movimientos.push({
			cuentaId: cuentaSalida._id,
			origenModelo: ORIGEN_MODELO_DEUDAS_ORANGE,
			_idOrigen: factura._id,
			debe: 0,
			haber: montoAbono,
			descripcion: construirDescripcionAbono(proveedor, factura),
			fecha: abono.fecha || new Date()
		});
	}

	return movimientos;
}

async function regenerarMovimientosFacturaOrange(proveedorStored, facturaId) {
	const factura = proveedorStored.facturas.id(facturaId);
	if (!factura) return 0;

	const cuentas = await CuentaOrange.find({}).select('_id nombre idCuenta categoria liquidez');
	const cuentasMap = mapearCuentasOrange(cuentas);
	const movimientos = construirMovimientosFacturaProveedorOrange(proveedorStored, factura, cuentasMap);

	await MovimientoOrange.deleteMany({
		origenModelo: ORIGEN_MODELO_DEUDAS_ORANGE,
		_idOrigen: factura._id
	});

	if (movimientos.length > 0) {
		await MovimientoOrange.insertMany(movimientos);
	}

	return movimientos.length;
}

var controller = {
	getProveedoresDeudaOrange: async (req, res) => {
		try {
			const proveedores = await DeudaProveedorOrange.find({}).sort({ nombreProveedor: 1 });
			return res.status(200).send({ proveedores: proveedores || [] });
		} catch (err) {
			return res.status(500).send({ message: 'Error al devolver proveedores de deuda Orange', error: err.message || err });
		}
	},

	getResumenProveedoresDeudaOrange: async (req, res) => {
		try {
			const resumen = await DeudaProveedorOrange.aggregate([
				{
					$group: {
						_id: null,
						totalProveedores: { $sum: 1 },
						totalFacturas: { $sum: '$totalFacturas' },
						totalDeuda: { $sum: '$totalDeuda' },
						totalAbonado: { $sum: '$totalAbonado' },
						totalPendiente: { $sum: '$totalPendiente' }
					}
				}
			]);

			const data = resumen[0] || {
				totalProveedores: 0,
				totalFacturas: 0,
				totalDeuda: 0,
				totalAbonado: 0,
				totalPendiente: 0
			};

			return res.status(200).send({ resumen: data });
		} catch (err) {
			return res.status(500).send({ message: 'Error al devolver resumen de deudas Orange', error: err.message || err });
		}
	},

	getProveedorDeudaOrangeById: async (req, res) => {
		try {
			const id = req.params.id;
			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id de proveedor invalido' });
			}

			const proveedor = await DeudaProveedorOrange.findById(id);
			if (!proveedor) {
				return res.status(404).send({ message: 'Proveedor no encontrado' });
			}

			return res.status(200).send({ proveedor });
		} catch (err) {
			return res.status(500).send({ message: 'Error al devolver proveedor Orange', error: err.message || err });
		}
	},

	createProveedorDeudaOrange: async (req, res) => {
		try {
			const params = req.body;
			const nombreProveedor = normalizarTexto(params.nombreProveedor);
			if (!nombreProveedor) {
				return res.status(400).send({ message: 'nombreProveedor es obligatorio' });
			}

			const existe = await DeudaProveedorOrange.findOne({ nombreProveedor });
			if (existe) {
				return res.status(409).send({ message: 'Ya existe un proveedor con ese nombre' });
			}

			const proveedor = new DeudaProveedorOrange({
				nombreProveedor,
				nit: normalizarTexto(params.nit),
				telefono: normalizarTexto(params.telefono),
				correo: normalizarTexto(params.correo),
				direccion: normalizarTexto(params.direccion),
				observaciones: normalizarTexto(params.observaciones),
				totalFacturas: 0,
				totalDeuda: 0,
				totalAbonado: 0,
				totalPendiente: 0,
				facturas: []
			});

			const proveedorStored = await proveedor.save();
			return res.status(200).send({ proveedor: proveedorStored });
		} catch (err) {
			return res.status(500).send({ message: 'Error al crear proveedor de deuda Orange', error: err.message || err });
		}
	},

	updateProveedorDeudaOrange: async (req, res) => {
		try {
			const id = req.params.id;
			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id de proveedor invalido' });
			}

			const proveedor = await DeudaProveedorOrange.findById(id);
			if (!proveedor) {
				return res.status(404).send({ message: 'Proveedor no encontrado' });
			}

			const params = req.body;
			if (params.nombreProveedor !== undefined) {
				const nombreProveedor = normalizarTexto(params.nombreProveedor);
				if (!nombreProveedor) {
					return res.status(400).send({ message: 'nombreProveedor no puede estar vacio' });
				}
				const repetido = await DeudaProveedorOrange.findOne({ nombreProveedor, _id: { $ne: proveedor._id } });
				if (repetido) {
					return res.status(409).send({ message: 'Ya existe otro proveedor con ese nombre' });
				}
				proveedor.nombreProveedor = nombreProveedor;
			}

			if (params.nit !== undefined) proveedor.nit = normalizarTexto(params.nit);
			if (params.telefono !== undefined) proveedor.telefono = normalizarTexto(params.telefono);
			if (params.correo !== undefined) proveedor.correo = normalizarTexto(params.correo);
			if (params.direccion !== undefined) proveedor.direccion = normalizarTexto(params.direccion);
			if (params.observaciones !== undefined) proveedor.observaciones = normalizarTexto(params.observaciones);

			const proveedorStored = await proveedor.save();
			return res.status(200).send({ proveedor: proveedorStored });
		} catch (err) {
			return res.status(500).send({ message: 'Error al actualizar proveedor de deuda Orange', error: err.message || err });
		}
	},

	addFacturaProveedorOrange: async (req, res) => {
		try {
			const idProveedor = req.params.idProveedor;
			if (!idProveedor || !mongoose.Types.ObjectId.isValid(idProveedor)) {
				return res.status(400).send({ message: 'Id de proveedor invalido' });
			}

			const proveedor = await DeudaProveedorOrange.findById(idProveedor);
			if (!proveedor) {
				return res.status(404).send({ message: 'Proveedor no encontrado' });
			}

			const params = req.body;
			const numeroFactura = normalizarTexto(params.numeroFactura);
			const fechaFactura = normalizarFecha(params.fechaFactura);
			const montoFactura = toNumber(params.montoFactura);

			if (!numeroFactura) {
				return res.status(400).send({ message: 'numeroFactura es obligatorio' });
			}

			if (!fechaFactura) {
				return res.status(400).send({ message: 'fechaFactura invalida. Usa formato YYYY-MM-DD' });
			}

			if (montoFactura === null || montoFactura <= 0) {
				return res.status(400).send({ message: 'montoFactura debe ser numerico y mayor a 0' });
			}

			const repetida = proveedor.facturas.find(f =>
				String(f.numeroFactura).toLowerCase() === numeroFactura.toLowerCase()
			);

			if (repetida) {
				return res.status(409).send({ message: 'Ya existe una factura con ese numero para este proveedor' });
			}

			proveedor.facturas.push({
				numeroFactura,
				fechaFactura,
				montoFactura,
				montoAbonado: 0,
				saldoPendiente: montoFactura,
				estado: 'pendiente',
				abonos: []
			});

			const facturaCreada = proveedor.facturas[proveedor.facturas.length - 1];
			recalcularTotalesProveedor(proveedor);
			const proveedorStored = await proveedor.save();

			let movimientosGenerados = 0;
			let movimientosError = null;
			try {
				movimientosGenerados = await regenerarMovimientosFacturaOrange(proveedorStored, facturaCreada._id);
			} catch (movErr) {
				movimientosError = movErr?.message || 'No se pudieron regenerar los movimientos contables de la factura';
			}

			return res.status(200).send({ proveedor: proveedorStored, movimientosGenerados, movimientosError });
		} catch (err) {
			return res.status(500).send({ message: 'Error al agregar factura al proveedor Orange', error: err.message || err });
		}
	},

	abonarFacturaProveedorOrange: async (req, res) => {
		try {
			const idProveedor = req.params.idProveedor;
			const idFactura = req.params.idFactura;

			if (!idProveedor || !mongoose.Types.ObjectId.isValid(idProveedor)) {
				return res.status(400).send({ message: 'Id de proveedor invalido' });
			}

			if (!idFactura || !mongoose.Types.ObjectId.isValid(idFactura)) {
				return res.status(400).send({ message: 'Id de factura invalido' });
			}

			const proveedor = await DeudaProveedorOrange.findById(idProveedor);
			if (!proveedor) {
				return res.status(404).send({ message: 'Proveedor no encontrado' });
			}

			const factura = proveedor.facturas.id(idFactura);
			if (!factura) {
				return res.status(404).send({ message: 'Factura no encontrada para este proveedor' });
			}

			const monto = toNumber(req.body.monto);
			const fecha = req.body.fecha ? normalizarFecha(req.body.fecha) : new Date();
			const cuentaSalidaIdCuenta = normalizarTexto(req.body.cuentaSalidaIdCuenta);

			if (monto === null || monto <= 0) {
				return res.status(400).send({ message: 'El monto del abono debe ser mayor a 0' });
			}

			if (!fecha) {
				return res.status(400).send({ message: 'Fecha de abono invalida. Usa formato YYYY-MM-DD' });
			}

			if (monto > factura.saldoPendiente) {
				return res.status(400).send({ message: 'El abono no puede superar el saldo pendiente de la factura' });
			}

			if (!cuentaSalidaIdCuenta) {
				return res.status(400).send({ message: 'Debes seleccionar cuentaSalidaIdCuenta para el abono' });
			}

			const cuentaSalida = await CuentaOrange.findOne({ idCuenta: cuentaSalidaIdCuenta }).select('_id idCuenta nombre categoria liquidez');
			if (!cuentaSalida) {
				return res.status(400).send({ message: 'La cuenta de salida seleccionada no existe en Orange' });
			}

			if (cuentaSalida.liquidez !== true) {
				return res.status(400).send({ message: 'La cuenta de salida para abono debe ser liquida' });
			}

			const categoriaSalida = normalizarTextoCuenta(cuentaSalida.categoria);
			if (!categoriaSalida.startsWith('ACTIVO')) {
				return res.status(400).send({ message: 'La cuenta de salida del abono debe ser un activo liquido' });
			}

			factura.abonos.push({
				fecha,
				monto,
				descripcion: normalizarTexto(req.body.descripcion) || 'Abono de factura',
				cuentaSalidaIdCuenta,
				cuentaSalidaNombre: String(cuentaSalida.nombre || '')
			});

			factura.montoAbonado = Number((Number(factura.montoAbonado || 0) + monto).toFixed(2));
			factura.saldoPendiente = Number((Number(factura.montoFactura) - Number(factura.montoAbonado)).toFixed(2));
			factura.estado = calcularEstadoFactura(factura.montoFactura, factura.montoAbonado);

			recalcularTotalesProveedor(proveedor);
			const proveedorStored = await proveedor.save();

			let movimientosGenerados = 0;
			let movimientosError = null;
			try {
				movimientosGenerados = await regenerarMovimientosFacturaOrange(proveedorStored, factura._id);
			} catch (movErr) {
				movimientosError = movErr?.message || 'No se pudieron regenerar los movimientos contables del abono';
			}

			return res.status(200).send({ proveedor: proveedorStored, movimientosGenerados, movimientosError });
		} catch (err) {
			return res.status(500).send({ message: 'Error al registrar abono de factura Orange', error: err.message || err });
		}
	},

	deleteAbonoFacturaProveedorOrange: async (req, res) => {
		try {
			const idProveedor = req.params.idProveedor;
			const idFactura = req.params.idFactura;
			const indexAbono = Number(req.params.indexAbono);

			if (!idProveedor || !mongoose.Types.ObjectId.isValid(idProveedor)) {
				return res.status(400).send({ message: 'Id de proveedor invalido' });
			}

			if (!idFactura || !mongoose.Types.ObjectId.isValid(idFactura)) {
				return res.status(400).send({ message: 'Id de factura invalido' });
			}

			if (!Number.isInteger(indexAbono) || indexAbono < 0) {
				return res.status(400).send({ message: 'Indice de abono invalido' });
			}

			const proveedor = await DeudaProveedorOrange.findById(idProveedor);
			if (!proveedor) {
				return res.status(404).send({ message: 'Proveedor no encontrado' });
			}

			const factura = proveedor.facturas.id(idFactura);
			if (!factura) {
				return res.status(404).send({ message: 'Factura no encontrada para este proveedor' });
			}

			if (!Array.isArray(factura.abonos) || indexAbono >= factura.abonos.length) {
				return res.status(404).send({ message: 'Abono no encontrado para esta factura' });
			}

			factura.abonos.splice(indexAbono, 1);

			let totalAbonosFactura = 0;
			for (const abono of factura.abonos) {
				totalAbonosFactura += Number(abono.monto || 0);
			}

			factura.montoAbonado = Number(totalAbonosFactura.toFixed(2));
			factura.saldoPendiente = Number((Number(factura.montoFactura) - Number(factura.montoAbonado)).toFixed(2));
			factura.estado = calcularEstadoFactura(factura.montoFactura, factura.montoAbonado);

			recalcularTotalesProveedor(proveedor);
			const proveedorStored = await proveedor.save();

			let movimientosGenerados = 0;
			let movimientosError = null;
			try {
				movimientosGenerados = await regenerarMovimientosFacturaOrange(proveedorStored, factura._id);
			} catch (movErr) {
				movimientosError = movErr?.message || 'No se pudieron regenerar los movimientos contables tras eliminar el abono';
			}

			return res.status(200).send({ proveedor: proveedorStored, movimientosGenerados, movimientosError });
		} catch (err) {
			return res.status(500).send({ message: 'Error al eliminar abono de factura Orange', error: err.message || err });
		}
	},

	deleteFacturaProveedorOrange: async (req, res) => {
		try {
			const idProveedor = req.params.idProveedor;
			const idFactura = req.params.idFactura;

			if (!idProveedor || !mongoose.Types.ObjectId.isValid(idProveedor)) {
				return res.status(400).send({ message: 'Id de proveedor invalido' });
			}

			if (!idFactura || !mongoose.Types.ObjectId.isValid(idFactura)) {
				return res.status(400).send({ message: 'Id de factura invalido' });
			}

			const proveedor = await DeudaProveedorOrange.findById(idProveedor);
			if (!proveedor) {
				return res.status(404).send({ message: 'Proveedor no encontrado' });
			}

			const factura = proveedor.facturas.id(idFactura);
			if (!factura) {
				return res.status(404).send({ message: 'Factura no encontrada para este proveedor' });
			}

			const idOrigenFactura = factura._id;
			factura.deleteOne();
			recalcularTotalesProveedor(proveedor);
			const proveedorStored = await proveedor.save();

			await MovimientoOrange.deleteMany({
				origenModelo: ORIGEN_MODELO_DEUDAS_ORANGE,
				_idOrigen: idOrigenFactura
			});

			return res.status(200).send({ proveedor: proveedorStored });
		} catch (err) {
			return res.status(500).send({ message: 'Error al eliminar factura del proveedor Orange', error: err.message || err });
		}
	},

	getCuentasSalidaAbonoOrange: async (req, res) => {
		try {
			const cuentas = await CuentaOrange.find({
				liquidez: true,
				categoria: { $regex: /^Activo/i }
			}).select('_id idCuenta nombre categoria liquidez').sort({ idCuenta: 1 });
			return res.status(200).send({ cuentas });
		} catch (err) {
			return res.status(500).send({ message: 'Error al obtener cuentas de salida para abonos Orange', error: err.message || err });
		}
	},

	getDeudasOrangePendientesIntegracion: async (req, res) => {
		try {
			const incluirSinPendiente = String(req.query?.incluirSinPendiente || '').toLowerCase() === 'true';

			const proveedores = await DeudaProveedorOrange.find({})
				.select('nombreProveedor nit telefono correo totalPendiente facturas')
				.sort({ nombreProveedor: 1 });

			const data = [];
			let totalFacturasPendientes = 0;
			let totalSaldoPendiente = 0;

			for (const proveedor of proveedores) {
				const facturasPendientes = (proveedor.facturas || [])
					.filter((factura) => Number(factura.saldoPendiente || 0) > 0)
					.map((factura) => {
						const montoFactura = Number(factura.montoFactura || 0);
						const montoAbonado = Number(factura.montoAbonado || 0);
						const saldoPendiente = Number(factura.saldoPendiente || 0);

						totalFacturasPendientes += 1;
						totalSaldoPendiente += saldoPendiente;

						return {
							idFactura: factura._id,
							numeroFactura: factura.numeroFactura,
							fechaFactura: factura.fechaFactura,
							estado: factura.estado,
							montoFactura: Number(montoFactura.toFixed(2)),
							montoAbonado: Number(montoAbonado.toFixed(2)),
							saldoPendiente: Number(saldoPendiente.toFixed(2))
						};
					});

				if (!incluirSinPendiente && facturasPendientes.length === 0) {
					continue;
				}

				data.push({
					idProveedor: proveedor._id,
					nombreProveedor: proveedor.nombreProveedor,
					nit: proveedor.nit,
					telefono: proveedor.telefono,
					correo: proveedor.correo,
					totalPendienteProveedor: Number(Number(proveedor.totalPendiente || 0).toFixed(2)),
					facturasPendientes
				});
			}

			return res.status(200).send({
				generatedAt: new Date().toISOString(),
				totalProveedores: data.length,
				totalFacturasPendientes,
				totalSaldoPendiente: Number(totalSaldoPendiente.toFixed(2)),
				proveedores: data
			});
		} catch (err) {
			return res.status(500).send({ message: 'Error al obtener deudas Orange para integracion', error: err.message || err });
		}
	},

	getCuentasSalidaAbonoOrangeIntegracion: async (req, res) => {
		return controller.getCuentasSalidaAbonoOrange(req, res);
	},

	abonarFacturaProveedorOrangeIntegracion: async (req, res) => {
		return controller.abonarFacturaProveedorOrange(req, res);
	}
};

module.exports = controller;
