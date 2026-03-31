'use strict'

var mongoose = require('mongoose');
var DeudaFamiliar = require('../modules/module-deudasFamiliares');
var TipoDeudaFamiliar = require('../modules/module-tiposDeudasFamiliares');
var MovimientoOrange = require('../modules/module-movimientosOrange');
var CuentaOrange = require('../modules/module-cuentasOrange');

const TIPOS_DEUDA_BASE = ['hogar', 'salud', 'educacion', 'transporte', 'prestamo', 'tarjeta', 'otros'];
const ORIGEN_MODELO_DEUDAS_FAMILIARES = 'deudasfamiliares';
const CONFIG_CUENTA_HABER_DEUDAS_HOGAR = {
	principalId: 'O2.2.001',
	alternasId: [],
	principalNombre: 'DEUDAS HOGAR',
	alternasNombre: ['DEUDAS DEL HOGAR', 'DEUDAS FAMILIARES HOGAR', 'DEUDAS FAMILIARES']
};

function normalizarTexto(valor) {
	return String(valor || '').trim();
}

function normalizarTipoDeuda(valor) {
	return String(valor || '').trim().toLowerCase();
}

function normalizarTiposRelacionados(valores) {
	if (!Array.isArray(valores)) return [];
	const set = new Set();
	for (const valor of valores) {
		const tipo = normalizarTipoDeuda(valor);
		if (tipo) set.add(tipo);
	}
	return Array.from(set);
}

function obtenerTiposRelacionadosProveedor(proveedor) {
	const set = new Set();
	const directos = normalizarTiposRelacionados(proveedor?.tiposRelacionados || []);
	for (const tipo of directos) set.add(tipo);

	const tipoLegacy = normalizarTipoDeuda(proveedor?.tipoDeuda);
	if (tipoLegacy) set.add(tipoLegacy);

	for (const factura of proveedor?.facturas || []) {
		const tipoFactura = normalizarTipoDeuda(factura?.tipoDeuda);
		if (tipoFactura) set.add(tipoFactura);
	}

	return Array.from(set);
}

function serializarProveedor(proveedorDoc) {
	if (!proveedorDoc) return null;
	const proveedor = typeof proveedorDoc.toObject === 'function' ? proveedorDoc.toObject() : { ...proveedorDoc };
	proveedor.tiposRelacionados = obtenerTiposRelacionadosProveedor(proveedorDoc);
	return proveedor;
}

async function asegurarTiposBaseDeudaFamiliar() {
	const total = await TipoDeudaFamiliar.countDocuments();
	if (total > 0) return;

	const tiposIniciales = TIPOS_DEUDA_BASE.map(nombre => ({ nombre }));
	try {
		await TipoDeudaFamiliar.insertMany(tiposIniciales, { ordered: false });
	} catch (err) {
		// En concurrencia puede aparecer duplicate key; no bloquea el flujo.
	}
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
	return `Factura familiar ${factura.numeroFactura} - ${proveedor.nombreProveedor}`;
}

function construirDescripcionAbono(proveedor, factura) {
	return `Abono deuda familiar ${factura.numeroFactura} - ${proveedor.nombreProveedor}`;
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

function construirMovimientosFacturaProveedorFamiliar(proveedor, factura, cuentasMap, cuentaDebe, cuentaHaber) {
	const movimientos = [];
	const montoFactura = Number(factura.montoFactura || 0);

	if (montoFactura > 0) {
		movimientos.push({
			cuentaId: cuentaDebe._id,
			origenModelo: ORIGEN_MODELO_DEUDAS_FAMILIARES,
			_idOrigen: factura._id,
			debe: montoFactura,
			haber: 0,
			descripcion: construirDescripcionFactura(proveedor, factura),
			fecha: factura.fechaFactura
		});

		movimientos.push({
			cuentaId: cuentaHaber._id,
			origenModelo: ORIGEN_MODELO_DEUDAS_FAMILIARES,
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
			cuentaId: cuentaHaber._id,
			origenModelo: ORIGEN_MODELO_DEUDAS_FAMILIARES,
			_idOrigen: factura._id,
			debe: montoAbono,
			haber: 0,
			descripcion: construirDescripcionAbono(proveedor, factura),
			fecha: abono.fecha || new Date()
		});

		movimientos.push({
			cuentaId: cuentaSalida._id,
			origenModelo: ORIGEN_MODELO_DEUDAS_FAMILIARES,
			_idOrigen: factura._id,
			debe: 0,
			haber: montoAbono,
			descripcion: construirDescripcionAbono(proveedor, factura),
			fecha: abono.fecha || new Date()
		});
	}

	return movimientos;
}

async function regenerarMovimientosFacturaFamiliar(proveedorStored, facturaId) {
	const factura = proveedorStored.facturas.id(facturaId);
	if (!factura) return 0;

	if (!factura.cuentaDebeId) {
		throw new Error('La factura no tiene configurada una cuenta Debe valida');
	}

	const cuentas = await CuentaOrange.find({}).select('_id nombre idCuenta categoria liquidez');
	const cuentasMap = mapearCuentasOrange(cuentas);
	const cuentaDebe = cuentas.find(cuenta => String(cuenta._id) === String(factura.cuentaDebeId));
	if (!cuentaDebe) {
		throw new Error('La cuenta Debe configurada para la factura ya no existe en Orange');
	}

	const cuentaHaber = resolverCuentaOrange(cuentasMap, CONFIG_CUENTA_HABER_DEUDAS_HOGAR);
	if (!cuentaHaber) {
		throw new Error('No se encontro la cuenta fija O2.2.001 DEUDAS HOGAR en Orange');
	}

	const movimientos = construirMovimientosFacturaProveedorFamiliar(proveedorStored, factura, cuentasMap, cuentaDebe, cuentaHaber);

	await MovimientoOrange.deleteMany({
		origenModelo: ORIGEN_MODELO_DEUDAS_FAMILIARES,
		_idOrigen: factura._id
	});

	if (movimientos.length > 0) {
		await MovimientoOrange.insertMany(movimientos);
	}

	return movimientos.length;
}

var controller = {
	getTiposDeudaFamiliar: async (req, res) => {
		try {
			await asegurarTiposBaseDeudaFamiliar();
			const tipos = await TipoDeudaFamiliar.find().sort({ nombre: 1 });
			return res.status(200).send({ tipos });
		} catch (err) {
			return res.status(500).send({ message: 'Error al devolver tipos de deuda familiares', error: err.message || err });
		}
	},

	createTipoDeudaFamiliar: async (req, res) => {
		try {
			const nombre = normalizarTipoDeuda(req.body?.nombre);
			if (!nombre) {
				return res.status(400).send({ message: 'El nombre del tipo de deuda es obligatorio' });
			}

			const existente = await TipoDeudaFamiliar.findOne({ nombre });
			if (existente) {
				return res.status(409).send({ message: 'El tipo de deuda ya existe' });
			}

			const tipo = await TipoDeudaFamiliar.create({ nombre });
			return res.status(201).send({ tipo });
		} catch (err) {
			return res.status(500).send({ message: 'Error al crear tipo de deuda familiar', error: err.message || err });
		}
	},

	updateTipoDeudaFamiliar: async (req, res) => {
		try {
			const id = String(req.params.id || '').trim();
			const nombre = normalizarTipoDeuda(req.body?.nombre);

			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id de tipo de deuda invalido' });
			}

			if (!nombre) {
				return res.status(400).send({ message: 'El nombre del tipo de deuda es obligatorio' });
			}

			const tipo = await TipoDeudaFamiliar.findById(id);
			if (!tipo) {
				return res.status(404).send({ message: 'Tipo de deuda no encontrado' });
			}

			const nombreActual = normalizarTipoDeuda(tipo.nombre);
			const repetido = await TipoDeudaFamiliar.findOne({ nombre, _id: { $ne: tipo._id } });
			if (repetido) {
				return res.status(409).send({ message: 'Ya existe otro tipo de deuda con ese nombre' });
			}

			tipo.nombre = nombre;
			const tipoStored = await tipo.save();

			if (nombreActual !== nombre) {
				await DeudaFamiliar.updateMany(
					{ tipoDeuda: nombreActual },
					{ $set: { tipoDeuda: nombre } }
				);

				await DeudaFamiliar.updateMany(
					{ tiposRelacionados: nombreActual },
					{ $set: { 'tiposRelacionados.$[t]': nombre } },
					{ arrayFilters: [{ t: nombreActual }] }
				);

				await DeudaFamiliar.updateMany(
					{ 'facturas.tipoDeuda': nombreActual },
					{ $set: { 'facturas.$[f].tipoDeuda': nombre } },
					{ arrayFilters: [{ 'f.tipoDeuda': nombreActual }] }
				);
			}

			return res.status(200).send({ tipo: tipoStored });
		} catch (err) {
			return res.status(500).send({ message: 'Error al actualizar tipo de deuda familiar', error: err.message || err });
		}
	},

	deleteTipoDeudaFamiliar: async (req, res) => {
		try {
			await asegurarTiposBaseDeudaFamiliar();
			const id = String(req.params.id || '').trim();
			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id de tipo de deuda invalido' });
			}

			const tipo = await TipoDeudaFamiliar.findById(id);
			if (!tipo) {
				return res.status(404).send({ message: 'Tipo de deuda no encontrado' });
			}

			const tipoNombre = normalizarTipoDeuda(tipo.nombre);
			const confirmacion = String(req.body?.confirmacion || '').trim().toUpperCase();
			const confirmacionEsperada = `ELIMINAR ${String(tipo.nombre || '').toUpperCase()}`;
			if (confirmacion !== confirmacionEsperada) {
				return res.status(400).send({
					message: `Confirmacion invalida. Debes escribir exactamente: ${confirmacionEsperada}`
				});
			}

			const enUsoProveedor = await DeudaFamiliar.exists({
				$or: [
					{ tipoDeuda: tipoNombre },
					{ tiposRelacionados: tipoNombre }
				]
			});
			if (enUsoProveedor) {
				return res.status(409).send({ message: 'No se puede eliminar un tipo de deuda relacionado a proveedores' });
			}

			const enUsoFactura = await DeudaFamiliar.exists({ 'facturas.tipoDeuda': tipoNombre });
			if (enUsoFactura) {
				return res.status(409).send({ message: 'No se puede eliminar un tipo de deuda que ya esta en uso' });
			}

			const totalTipos = await TipoDeudaFamiliar.countDocuments();
			if (totalTipos <= 1) {
				return res.status(400).send({ message: 'Debes mantener al menos un tipo de deuda' });
			}

			await TipoDeudaFamiliar.findByIdAndDelete(id);
			return res.status(200).send({ message: 'Tipo de deuda eliminado' });
		} catch (err) {
			return res.status(500).send({ message: 'Error al eliminar tipo de deuda familiar', error: err.message || err });
		}
	},

	getProveedoresDeudaFamiliar: async (req, res) => {
		try {
			const proveedoresDoc = await DeudaFamiliar.find({}).sort({ nombreProveedor: 1 });
			const proveedores = proveedoresDoc.map(serializarProveedor);
			if (!proveedores || proveedores.length === 0) {
				return res.status(404).send({ message: 'No hay proveedores de deuda familiar para mostrar' });
			}
			return res.status(200).send({ proveedores });
		} catch (err) {
			return res.status(500).send({ message: 'Error al devolver acreedores de deuda familiar', error: err.message || err });
		}
	},

	getResumenProveedoresDeudaFamiliar: async (req, res) => {
		try {
			const resumen = await DeudaFamiliar.aggregate([
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
			return res.status(500).send({ message: 'Error al devolver resumen de deudas familiares', error: err.message || err });
		}
	},

	getProveedorDeudaFamiliarById: async (req, res) => {
		try {
			const id = req.params.id;
			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id de acreedor invalido' });
			}

			const proveedor = await DeudaFamiliar.findById(id);
			if (!proveedor) {
				return res.status(404).send({ message: 'Acreedor no encontrado' });
			}

			return res.status(200).send({ proveedor: serializarProveedor(proveedor) });
		} catch (err) {
			return res.status(500).send({ message: 'Error al devolver acreedor familiar', error: err.message || err });
		}
	},

	createProveedorDeudaFamiliar: async (req, res) => {
		try {
			const params = req.body;
			const nombreProveedor = normalizarTexto(params.nombreProveedor);
			if (!nombreProveedor) {
				return res.status(400).send({ message: 'nombreProveedor es obligatorio' });
			}

			const existe = await DeudaFamiliar.findOne({ nombreProveedor });
			if (existe) {
				return res.status(409).send({ message: 'Ya existe un acreedor con ese nombre' });
			}

			await asegurarTiposBaseDeudaFamiliar();
			const tipoDeuda = normalizarTipoDeuda(params.tipoDeuda);
			if (tipoDeuda) {
				const tipoExiste = await TipoDeudaFamiliar.exists({ nombre: tipoDeuda });
				if (!tipoExiste) {
					return res.status(400).send({ message: 'El tipo de deuda seleccionado no existe en el catalogo' });
				}
			}

			const datoContacto = normalizarTexto(params.datoContacto || params.telefono || params.correo);

			const proveedor = new DeudaFamiliar({
				nombreProveedor,
				tipoDeuda,
				tiposRelacionados: tipoDeuda ? [tipoDeuda] : [],
				datoContacto,
				nit: normalizarTexto(params.nit),
				telefono: datoContacto,
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
			return res.status(200).send({ proveedor: serializarProveedor(proveedorStored) });
		} catch (err) {
			return res.status(500).send({ message: 'Error al crear acreedor de deuda familiar', error: err.message || err });
		}
	},

	updateProveedorDeudaFamiliar: async (req, res) => {
		try {
			const id = req.params.id;
			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id de acreedor invalido' });
			}

			const proveedor = await DeudaFamiliar.findById(id);
			if (!proveedor) {
				return res.status(404).send({ message: 'Acreedor no encontrado' });
			}

			const params = req.body;
			if (params.nombreProveedor !== undefined) {
				const nombreProveedor = normalizarTexto(params.nombreProveedor);
				if (!nombreProveedor) {
					return res.status(400).send({ message: 'nombreProveedor no puede estar vacio' });
				}
				const repetido = await DeudaFamiliar.findOne({ nombreProveedor, _id: { $ne: proveedor._id } });
				if (repetido) {
					return res.status(409).send({ message: 'Ya existe otro acreedor con ese nombre' });
				}
				proveedor.nombreProveedor = nombreProveedor;
			}

			if (params.datoContacto !== undefined) {
				const datoContacto = normalizarTexto(params.datoContacto);
				proveedor.datoContacto = datoContacto;
				proveedor.telefono = datoContacto;
			}

			if (params.tipoDeuda !== undefined) {
				const tipoDeuda = normalizarTipoDeuda(params.tipoDeuda);
				if (tipoDeuda) {
					await asegurarTiposBaseDeudaFamiliar();
					const tipoExiste = await TipoDeudaFamiliar.exists({ nombre: tipoDeuda });
					if (!tipoExiste) {
						return res.status(400).send({ message: 'El tipo de deuda seleccionado no existe en el catalogo' });
					}
					const tiposRelacionados = new Set(obtenerTiposRelacionadosProveedor(proveedor));
					tiposRelacionados.add(tipoDeuda);
					proveedor.tiposRelacionados = Array.from(tiposRelacionados);
				}
			}

			if (params.nit !== undefined) proveedor.nit = normalizarTexto(params.nit);
			if (params.telefono !== undefined) proveedor.telefono = normalizarTexto(params.telefono);
			if (params.correo !== undefined) proveedor.correo = normalizarTexto(params.correo);
			if (params.direccion !== undefined) proveedor.direccion = normalizarTexto(params.direccion);
			if (params.observaciones !== undefined) proveedor.observaciones = normalizarTexto(params.observaciones);

			if (params.telefono !== undefined && params.datoContacto === undefined) {
				proveedor.datoContacto = normalizarTexto(params.telefono);
			}

			const proveedorStored = await proveedor.save();
			return res.status(200).send({ proveedor: serializarProveedor(proveedorStored) });
		} catch (err) {
			return res.status(500).send({ message: 'Error al actualizar acreedor de deuda familiar', error: err.message || err });
		}
	},

	relacionarProveedorTipoDeudaFamiliar: async (req, res) => {
		try {
			const id = String(req.params.id || '').trim();
			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id de acreedor invalido' });
			}

			const tipoDeuda = normalizarTipoDeuda(req.body?.tipoDeuda);
			if (!tipoDeuda) {
				return res.status(400).send({ message: 'tipoDeuda es obligatorio' });
			}

			await asegurarTiposBaseDeudaFamiliar();
			const tipoExiste = await TipoDeudaFamiliar.exists({ nombre: tipoDeuda });
			if (!tipoExiste) {
				return res.status(400).send({ message: 'El tipo de deuda seleccionado no existe en el catalogo' });
			}

			const proveedor = await DeudaFamiliar.findById(id);
			if (!proveedor) {
				return res.status(404).send({ message: 'Acreedor no encontrado' });
			}

			const tiposRelacionados = new Set(obtenerTiposRelacionadosProveedor(proveedor));
			tiposRelacionados.add(tipoDeuda);
			proveedor.tiposRelacionados = Array.from(tiposRelacionados);

			const proveedorStored = await proveedor.save();
			return res.status(200).send({ proveedor: serializarProveedor(proveedorStored) });
		} catch (err) {
			return res.status(500).send({ message: 'Error al relacionar proveedor con tipo de deuda', error: err.message || err });
		}
	},

	deleteProveedorDeudaFamiliar: async (req, res) => {
		try {
			const id = String(req.params.id || '').trim();
			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id de acreedor invalido' });
			}

			const proveedor = await DeudaFamiliar.findById(id);
			if (!proveedor) {
				return res.status(404).send({ message: 'Acreedor no encontrado' });
			}

			const confirmacion = String(req.body?.confirmacion || '').trim().toUpperCase();
			const confirmacionEsperada = `ELIMINAR ${String(proveedor.nombreProveedor || '').toUpperCase()}`;
			if (confirmacion !== confirmacionEsperada) {
				return res.status(400).send({
					message: `Confirmacion invalida. Debes escribir exactamente: ${confirmacionEsperada}`
				});
			}

			if ((proveedor.facturas || []).length > 0) {
				return res.status(409).send({ message: 'No se puede eliminar un proveedor con facturas registradas. Elimina primero sus facturas.' });
			}

			await DeudaFamiliar.findByIdAndDelete(id);
			return res.status(200).send({ message: 'Proveedor eliminado correctamente' });
		} catch (err) {
			return res.status(500).send({ message: 'Error al eliminar acreedor de deuda familiar', error: err.message || err });
		}
	},

	addFacturaProveedorFamiliar: async (req, res) => {
		try {
			const idProveedor = req.params.idProveedor;
			if (!idProveedor || !mongoose.Types.ObjectId.isValid(idProveedor)) {
				return res.status(400).send({ message: 'Id de acreedor invalido' });
			}

			const proveedor = await DeudaFamiliar.findById(idProveedor);
			if (!proveedor) {
				return res.status(404).send({ message: 'Acreedor no encontrado' });
			}

			const params = req.body;
			const numeroFactura = normalizarTexto(params.numeroFactura);
			const tipoDeuda = normalizarTipoDeuda(params.tipoDeuda);
			const fechaFactura = normalizarFecha(params.fechaFactura);
			const montoFactura = toNumber(params.montoFactura);
			const cuentaDebeId = String(params.cuentaDebeId || '').trim();

			if (!numeroFactura) {
				return res.status(400).send({ message: 'numeroFactura es obligatorio' });
			}

			if (!tipoDeuda) {
				return res.status(400).send({ message: 'tipoDeuda es obligatorio' });
			}

			if (!fechaFactura) {
				return res.status(400).send({ message: 'fechaFactura invalida. Usa formato YYYY-MM-DD' });
			}

			if (montoFactura === null || montoFactura <= 0) {
				return res.status(400).send({ message: 'montoFactura debe ser numerico y mayor a 0' });
			}

			if (!cuentaDebeId || !mongoose.Types.ObjectId.isValid(cuentaDebeId)) {
				return res.status(400).send({ message: 'Debes seleccionar una cuentaDebeId valida para la factura' });
			}

			const repetida = proveedor.facturas.find(f =>
				String(f.numeroFactura).toLowerCase() === numeroFactura.toLowerCase()
			);

			if (repetida) {
				return res.status(409).send({ message: 'Ya existe una factura con ese numero para este acreedor' });
			}

			await asegurarTiposBaseDeudaFamiliar();
			const tipoExiste = await TipoDeudaFamiliar.exists({ nombre: tipoDeuda });
			if (!tipoExiste) {
				return res.status(400).send({ message: 'El tipo de deuda no existe en el catalogo' });
			}

			const cuentaDebe = await CuentaOrange.findById(cuentaDebeId).select('_id idCuenta nombre categoria liquidez');
			if (!cuentaDebe) {
				return res.status(400).send({ message: 'La cuentaDebeId seleccionada no existe en Orange' });
			}

			const categoriaDebe = normalizarTextoCuenta(cuentaDebe.categoria);
			if (!categoriaDebe.startsWith('ACTIVO') && !categoriaDebe.startsWith('PATRIMONIO')) {
				return res.status(400).send({ message: 'La cuentaDebeId debe ser una cuenta de ACTIVO o PATRIMONIO' });
			}

			const cuentasMap = mapearCuentasOrange([cuentaDebe].concat(await CuentaOrange.find({ idCuenta: CONFIG_CUENTA_HABER_DEUDAS_HOGAR.principalId }).select('_id idCuenta nombre categoria liquidez')));
			let cuentaHaber = resolverCuentaOrange(cuentasMap, CONFIG_CUENTA_HABER_DEUDAS_HOGAR);
			if (!cuentaHaber) {
				const todasLasCuentas = await CuentaOrange.find({}).select('_id idCuenta nombre categoria liquidez');
				cuentaHaber = resolverCuentaOrange(mapearCuentasOrange(todasLasCuentas), CONFIG_CUENTA_HABER_DEUDAS_HOGAR);
			}
			if (!cuentaHaber) {
				return res.status(400).send({ message: 'No se encontro la cuenta fija O2.2.001 DEUDAS HOGAR en Orange' });
			}

			proveedor.facturas.push({
				numeroFactura,
				tipoDeuda,
				cuentaDebeId: cuentaDebe._id,
				cuentaDebeIdCuenta: String(cuentaDebe.idCuenta || ''),
				cuentaDebeNombre: String(cuentaDebe.nombre || ''),
				cuentaHaberId: cuentaHaber._id,
				cuentaHaberIdCuenta: String(cuentaHaber.idCuenta || ''),
				cuentaHaberNombre: String(cuentaHaber.nombre || ''),
				fechaFactura,
				montoFactura,
				montoAbonado: 0,
				saldoPendiente: montoFactura,
				estado: 'pendiente',
				abonos: []
			});

			const facturaCreada = proveedor.facturas[proveedor.facturas.length - 1];

			const tiposRelacionados = new Set(obtenerTiposRelacionadosProveedor(proveedor));
			tiposRelacionados.add(tipoDeuda);
			proveedor.tiposRelacionados = Array.from(tiposRelacionados);

			recalcularTotalesProveedor(proveedor);
			const proveedorStored = await proveedor.save();

			let movimientosGenerados = 0;
			let movimientosError = null;
			try {
				movimientosGenerados = await regenerarMovimientosFacturaFamiliar(proveedorStored, facturaCreada._id);
			} catch (movErr) {
				movimientosError = movErr?.message || 'No se pudieron regenerar los movimientos contables de la factura familiar';
			}

			return res.status(200).send({ proveedor: serializarProveedor(proveedorStored), movimientosGenerados, movimientosError });
		} catch (err) {
			return res.status(500).send({ message: 'Error al agregar factura al acreedor familiar', error: err.message || err });
		}
	},

	abonarFacturaProveedorFamiliar: async (req, res) => {
		try {
			const idProveedor = req.params.idProveedor;
			const idFactura = req.params.idFactura;

			if (!idProveedor || !mongoose.Types.ObjectId.isValid(idProveedor)) {
				return res.status(400).send({ message: 'Id de acreedor invalido' });
			}

			if (!idFactura || !mongoose.Types.ObjectId.isValid(idFactura)) {
				return res.status(400).send({ message: 'Id de factura invalido' });
			}

			const proveedor = await DeudaFamiliar.findById(idProveedor);
			if (!proveedor) {
				return res.status(404).send({ message: 'Acreedor no encontrado' });
			}

			const factura = proveedor.facturas.id(idFactura);
			if (!factura) {
				return res.status(404).send({ message: 'Factura no encontrada para este acreedor' });
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
				movimientosGenerados = await regenerarMovimientosFacturaFamiliar(proveedorStored, factura._id);
			} catch (movErr) {
				movimientosError = movErr?.message || 'No se pudieron regenerar los movimientos contables del abono';
			}

			return res.status(200).send({ proveedor: serializarProveedor(proveedorStored), movimientosGenerados, movimientosError });
		} catch (err) {
			return res.status(500).send({ message: 'Error al registrar abono de factura familiar', error: err.message || err });
		}
	},

	deleteAbonoFacturaProveedorFamiliar: async (req, res) => {
		try {
			const idProveedor = req.params.idProveedor;
			const idFactura = req.params.idFactura;
			const indexAbono = Number(req.params.indexAbono);

			if (!idProveedor || !mongoose.Types.ObjectId.isValid(idProveedor)) {
				return res.status(400).send({ message: 'Id de acreedor invalido' });
			}

			if (!idFactura || !mongoose.Types.ObjectId.isValid(idFactura)) {
				return res.status(400).send({ message: 'Id de factura invalido' });
			}

			if (!Number.isInteger(indexAbono) || indexAbono < 0) {
				return res.status(400).send({ message: 'Indice de abono invalido' });
			}

			const proveedor = await DeudaFamiliar.findById(idProveedor);
			if (!proveedor) {
				return res.status(404).send({ message: 'Acreedor no encontrado' });
			}

			const factura = proveedor.facturas.id(idFactura);
			if (!factura) {
				return res.status(404).send({ message: 'Factura no encontrada para este acreedor' });
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
				movimientosGenerados = await regenerarMovimientosFacturaFamiliar(proveedorStored, factura._id);
			} catch (movErr) {
				movimientosError = movErr?.message || 'No se pudieron regenerar los movimientos contables tras eliminar el abono';
			}

			return res.status(200).send({ proveedor: serializarProveedor(proveedorStored), movimientosGenerados, movimientosError });
		} catch (err) {
			return res.status(500).send({ message: 'Error al eliminar abono de factura familiar', error: err.message || err });
		}
	},

	deleteFacturaProveedorFamiliar: async (req, res) => {
		try {
			const idProveedor = req.params.idProveedor;
			const idFactura = req.params.idFactura;

			if (!idProveedor || !mongoose.Types.ObjectId.isValid(idProveedor)) {
				return res.status(400).send({ message: 'Id de acreedor invalido' });
			}

			if (!idFactura || !mongoose.Types.ObjectId.isValid(idFactura)) {
				return res.status(400).send({ message: 'Id de factura invalido' });
			}

			const proveedor = await DeudaFamiliar.findById(idProveedor);
			if (!proveedor) {
				return res.status(404).send({ message: 'Acreedor no encontrado' });
			}

			const factura = proveedor.facturas.id(idFactura);
			if (!factura) {
				return res.status(404).send({ message: 'Factura no encontrada para este acreedor' });
			}

			const idOrigenFactura = factura._id;
			factura.deleteOne();
			recalcularTotalesProveedor(proveedor);
			const proveedorStored = await proveedor.save();

			await MovimientoOrange.deleteMany({
				origenModelo: ORIGEN_MODELO_DEUDAS_FAMILIARES,
				_idOrigen: idOrigenFactura
			});

			return res.status(200).send({ proveedor: serializarProveedor(proveedorStored) });
		} catch (err) {
			return res.status(500).send({ message: 'Error al eliminar factura del acreedor familiar', error: err.message || err });
		}
	},

	getCuentasSalidaAbonoFamiliar: async (req, res) => {
		try {
			const cuentas = await CuentaOrange.find({
				liquidez: true,
				categoria: { $regex: /^Activo/i }
			}).select('_id idCuenta nombre categoria liquidez').sort({ idCuenta: 1 });
			return res.status(200).send({ cuentas });
		} catch (err) {
			return res.status(500).send({ message: 'Error al obtener cuentas de salida para abonos familiares', error: err.message || err });
		}
	}
};

module.exports = controller;
