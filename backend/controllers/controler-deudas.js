'use strict'

var mongoose = require('mongoose');
var DeudaProveedor = require('../modules/module-deudas');
var Movimiento = require('../modules/module-movimientos');
var Cuenta = require('../modules/cuenta');

const ORIGEN_MODELO_DEUDAS = 'deudasproveedores';

const CUENTAS_SALIDA_ABONO_VALIDAS = [
	'CAJA EFECTIVO ALMACEN',
	'CUENTA BANCARIA ALMACEN',
	'RETIROS EFECTIVO JUAN',
	'RETIROS EFECTIVO DONA YOLANDA'
];

const CONFIG_CUENTA_COMPRAS = {
	principal: 'INVENTARIOS/COMPRAS',
	alternas: ['INVENTARIOS COMPRAS', 'COMPRAS', 'INVENTARIOS']
};

const CONFIG_CUENTA_DEUDAS = {
	principal: 'DEUDAS PROVEEDORES',
	alternas: ['CUENTAS POR PAGAR PROVEEDORES', 'PROVEEDORES POR PAGAR']
};

const ALTERNAS_CUENTAS_SALIDA = {
	'CAJA EFECTIVO ALMACEN': ['CAJA EFECTIVO'],
	'CUENTA BANCARIA ALMACEN': ['CUENTA BANCARIA'],
	'RETIROS EFECTIVO JUAN': ['RETIRO EFECTIVO JUAN', 'RETIROS JUAN'],
	'RETIROS EFECTIVO DONA YOLANDA': ['RETIROS EFECTIVO DONA YOLANDA', 'RETIROS YOLANDA']
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

function validarCuentaSalidaAbono(cuentaSalida) {
	const normalizada = normalizarTextoCuenta(cuentaSalida);
	for (const cuenta of CUENTAS_SALIDA_ABONO_VALIDAS) {
		if (normalizarTextoCuenta(cuenta) === normalizada) {
			return cuenta;
		}
	}
	return null;
}

function construirDescripcionFactura(proveedor, factura) {
	return `Factura ${factura.numeroFactura} - ${proveedor.nombreProveedor}`;
}

function construirDescripcionAbono(proveedor, factura) {
	return `Abono factura ${factura.numeroFactura} - ${proveedor.nombreProveedor}`;
}

function construirMovimientosFacturaProveedor(proveedor, factura, cuentasPorNombre) {
	const movimientos = [];
	const cuentaCompras = resolverCuenta(
		cuentasPorNombre,
		CONFIG_CUENTA_COMPRAS.principal,
		CONFIG_CUENTA_COMPRAS.alternas
	);
	const cuentaDeudas = resolverCuenta(
		cuentasPorNombre,
		CONFIG_CUENTA_DEUDAS.principal,
		CONFIG_CUENTA_DEUDAS.alternas
	);

	if (!cuentaCompras || !cuentaDeudas) {
		throw new Error('No se encontraron las cuentas requeridas para registrar la factura en contabilidad');
	}

	const montoFactura = Number(factura.montoFactura || 0);
	if (montoFactura > 0) {
		movimientos.push({
			cuentaId: cuentaCompras._id,
			origenModelo: ORIGEN_MODELO_DEUDAS,
			_idOrigen: factura._id,
			debe: montoFactura,
			haber: 0,
			descripcion: construirDescripcionFactura(proveedor, factura),
			fecha: factura.fechaFactura
		});

		movimientos.push({
			cuentaId: cuentaDeudas._id,
			origenModelo: ORIGEN_MODELO_DEUDAS,
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

		const cuentaSalidaCanonica = validarCuentaSalidaAbono(abono.cuentaSalida);
		if (!cuentaSalidaCanonica) {
			throw new Error(`Cuenta de salida invalida en abono de factura ${factura.numeroFactura}`);
		}

		const alternas = ALTERNAS_CUENTAS_SALIDA[cuentaSalidaCanonica] || [];
		const cuentaSalida = resolverCuenta(cuentasPorNombre, cuentaSalidaCanonica, alternas);
		if (!cuentaSalida) {
			throw new Error(`No existe la cuenta contable de salida para abonos: ${cuentaSalidaCanonica}`);
		}

		movimientos.push({
			cuentaId: cuentaDeudas._id,
			origenModelo: ORIGEN_MODELO_DEUDAS,
			_idOrigen: factura._id,
			debe: montoAbono,
			haber: 0,
			descripcion: construirDescripcionAbono(proveedor, factura),
			fecha: abono.fecha || new Date()
		});

		movimientos.push({
			cuentaId: cuentaSalida._id,
			origenModelo: ORIGEN_MODELO_DEUDAS,
			_idOrigen: factura._id,
			debe: 0,
			haber: montoAbono,
			descripcion: construirDescripcionAbono(proveedor, factura),
			fecha: abono.fecha || new Date()
		});
	}

	return movimientos;
}

var controller = {
	getProveedoresDeuda: async (req, res) => {
		try {
			const proveedores = await DeudaProveedor.find({}).sort({ nombreProveedor: 1 });
			if (!proveedores || proveedores.length === 0) {
				return res.status(404).send({ message: 'No hay proveedores de deuda para mostrar' });
			}
			return res.status(200).send({ proveedores });
		} catch (err) {
			return res.status(500).send({ message: 'Error al devolver proveedores de deuda', error: err });
		}
	},

	getResumenProveedoresDeuda: async (req, res) => {
		try {
			const resumen = await DeudaProveedor.aggregate([
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
			return res.status(500).send({ message: 'Error al devolver resumen de proveedores', error: err });
		}
	},

	getProveedorDeudaById: async (req, res) => {
		try {
			const id = req.params.id;
			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id de proveedor invalido' });
			}

			const proveedor = await DeudaProveedor.findById(id);
			if (!proveedor) {
				return res.status(404).send({ message: 'Proveedor no encontrado' });
			}

			return res.status(200).send({ proveedor });
		} catch (err) {
			return res.status(500).send({ message: 'Error al devolver proveedor', error: err });
		}
	},

	createProveedorDeuda: async (req, res) => {
		try {
			const params = req.body;
			const nombreProveedor = normalizarTexto(params.nombreProveedor);
			if (!nombreProveedor) {
				return res.status(400).send({ message: 'nombreProveedor es obligatorio' });
			}

			const existe = await DeudaProveedor.findOne({ nombreProveedor });
			if (existe) {
				return res.status(409).send({ message: 'Ya existe un proveedor con ese nombre' });
			}

			const proveedor = new DeudaProveedor({
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
			return res.status(500).send({ message: 'Error al crear proveedor de deuda', error: err });
		}
	},

	updateProveedorDeuda: async (req, res) => {
		try {
			const id = req.params.id;
			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id de proveedor invalido' });
			}

			const proveedor = await DeudaProveedor.findById(id);
			if (!proveedor) {
				return res.status(404).send({ message: 'Proveedor no encontrado' });
			}

			const params = req.body;
			if (params.nombreProveedor !== undefined) {
				const nombreProveedor = normalizarTexto(params.nombreProveedor);
				if (!nombreProveedor) {
					return res.status(400).send({ message: 'nombreProveedor no puede estar vacio' });
				}
				const repetido = await DeudaProveedor.findOne({ nombreProveedor, _id: { $ne: proveedor._id } });
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

			if (params.totalFacturas !== undefined) {
				const v = toNumber(params.totalFacturas);
				if (v === null || v < 0) return res.status(400).send({ message: 'totalFacturas invalido' });
				proveedor.totalFacturas = v;
			}

			if (params.totalDeuda !== undefined) {
				const v = toNumber(params.totalDeuda);
				if (v === null || v < 0) return res.status(400).send({ message: 'totalDeuda invalido' });
				proveedor.totalDeuda = v;
			}

			if (params.totalAbonado !== undefined) {
				const v = toNumber(params.totalAbonado);
				if (v === null || v < 0) return res.status(400).send({ message: 'totalAbonado invalido' });
				proveedor.totalAbonado = v;
			}

			if (params.totalPendiente !== undefined) {
				const v = toNumber(params.totalPendiente);
				if (v === null || v < 0) return res.status(400).send({ message: 'totalPendiente invalido' });
				proveedor.totalPendiente = v;
			}

			const proveedorStored = await proveedor.save();
			return res.status(200).send({ proveedor: proveedorStored });
		} catch (err) {
			return res.status(500).send({ message: 'Error al actualizar proveedor de deuda', error: err });
		}
	},

	addFacturaProveedor: async (req, res) => {
		try {
			const idProveedor = req.params.idProveedor;
			if (!idProveedor || !mongoose.Types.ObjectId.isValid(idProveedor)) {
				return res.status(400).send({ message: 'Id de proveedor invalido' });
			}

			const proveedor = await DeudaProveedor.findById(idProveedor);
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

			const cuentas = await Cuenta.find({}).select('_id nombre');
			const cuentasPorNombre = mapearCuentasPorNombre(cuentas);
			const movimientos = construirMovimientosFacturaProveedor(proveedorStored, facturaCreada, cuentasPorNombre);

			await Movimiento.deleteMany({
				origenModelo: ORIGEN_MODELO_DEUDAS,
				_idOrigen: facturaCreada._id
			});

			if (movimientos.length > 0) {
				await Movimiento.insertMany(movimientos);
			}

			return res.status(200).send({ proveedor: proveedorStored, movimientosGenerados: movimientos.length });
		} catch (err) {
			return res.status(500).send({ message: 'Error al agregar factura al proveedor', error: err });
		}
	},

	abonarFacturaProveedor: async (req, res) => {
		try {
			const idProveedor = req.params.idProveedor;
			const idFactura = req.params.idFactura;

			if (!idProveedor || !mongoose.Types.ObjectId.isValid(idProveedor)) {
				return res.status(400).send({ message: 'Id de proveedor invalido' });
			}

			if (!idFactura || !mongoose.Types.ObjectId.isValid(idFactura)) {
				return res.status(400).send({ message: 'Id de factura invalido' });
			}

			const proveedor = await DeudaProveedor.findById(idProveedor);
			if (!proveedor) {
				return res.status(404).send({ message: 'Proveedor no encontrado' });
			}

			const factura = proveedor.facturas.id(idFactura);
			if (!factura) {
				return res.status(404).send({ message: 'Factura no encontrada para este proveedor' });
			}

			const monto = toNumber(req.body.monto);
			const fecha = req.body.fecha ? normalizarFecha(req.body.fecha) : new Date();

			if (monto === null || monto <= 0) {
				return res.status(400).send({ message: 'El monto del abono debe ser mayor a 0' });
			}

			if (!fecha) {
				return res.status(400).send({ message: 'Fecha de abono invalida. Usa formato YYYY-MM-DD' });
			}

			if (monto > factura.saldoPendiente) {
				return res.status(400).send({ message: 'El abono no puede superar el saldo pendiente de la factura' });
			}

			const cuentaSalida = validarCuentaSalidaAbono(req.body.cuentaSalida);
			if (!cuentaSalida) {
				return res.status(400).send({
					message: 'Debes seleccionar una cuenta de salida valida para el abono'
				});
			}

			factura.abonos.push({
				fecha,
				monto,
				descripcion: normalizarTexto(req.body.descripcion) || 'Abono de factura',
				cuentaSalida
			});

			factura.montoAbonado = Number((Number(factura.montoAbonado || 0) + monto).toFixed(2));
			factura.saldoPendiente = Number((Number(factura.montoFactura) - Number(factura.montoAbonado)).toFixed(2));
			factura.estado = calcularEstadoFactura(factura.montoFactura, factura.montoAbonado);

			recalcularTotalesProveedor(proveedor);
			const proveedorStored = await proveedor.save();
			const facturaGuardada = proveedorStored.facturas.id(idFactura);

			const cuentas = await Cuenta.find({}).select('_id nombre');
			const cuentasPorNombre = mapearCuentasPorNombre(cuentas);
			const movimientos = construirMovimientosFacturaProveedor(proveedorStored, facturaGuardada, cuentasPorNombre);

			await Movimiento.deleteMany({
				origenModelo: ORIGEN_MODELO_DEUDAS,
				_idOrigen: factura._id
			});

			if (movimientos.length > 0) {
				await Movimiento.insertMany(movimientos);
			}

			return res.status(200).send({ proveedor: proveedorStored, movimientosGenerados: movimientos.length });
		} catch (err) {
			return res.status(500).send({ message: 'Error al registrar abono de factura', error: err });
		}
	},

	deleteAbonoFacturaProveedor: async (req, res) => {
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

			const proveedor = await DeudaProveedor.findById(idProveedor);
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
			const facturaGuardada = proveedorStored.facturas.id(idFactura);

			const cuentas = await Cuenta.find({}).select('_id nombre');
			const cuentasPorNombre = mapearCuentasPorNombre(cuentas);
			const movimientos = construirMovimientosFacturaProveedor(proveedorStored, facturaGuardada, cuentasPorNombre);

			await Movimiento.deleteMany({
				origenModelo: ORIGEN_MODELO_DEUDAS,
				_idOrigen: factura._id
			});

			if (movimientos.length > 0) {
				await Movimiento.insertMany(movimientos);
			}

			return res.status(200).send({ proveedor: proveedorStored, movimientosGenerados: movimientos.length });
		} catch (err) {
			return res.status(500).send({ message: 'Error al eliminar abono de factura', error: err });
		}
	},

	deleteFacturaProveedor: async (req, res) => {
		try {
			const idProveedor = req.params.idProveedor;
			const idFactura = req.params.idFactura;

			if (!idProveedor || !mongoose.Types.ObjectId.isValid(idProveedor)) {
				return res.status(400).send({ message: 'Id de proveedor invalido' });
			}

			if (!idFactura || !mongoose.Types.ObjectId.isValid(idFactura)) {
				return res.status(400).send({ message: 'Id de factura invalido' });
			}

			const proveedor = await DeudaProveedor.findById(idProveedor);
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

			await Movimiento.deleteMany({
				origenModelo: ORIGEN_MODELO_DEUDAS,
				_idOrigen: idOrigenFactura
			});

			return res.status(200).send({ proveedor: proveedorStored });
		} catch (err) {
			return res.status(500).send({ message: 'Error al eliminar factura del proveedor', error: err });
		}
	}
};

module.exports = controller;
