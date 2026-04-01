'use strict'

var mongoose = require('mongoose');
var DeudaMia = require('../modules/module-deudasMias');
var TipoDeudaMia = require('../modules/module-tiposDeudasMias');
var MovimientoMio = require('../modules/module-movimientoMios');
var CuentaMia = require('../modules/module-cuentasMias');

const ORIGEN_MODELO_DEUDAS_MIAS = 'deudasmias';
const TIPOS_DEUDA_BASE = ['hogar', 'salud', 'educacion', 'transporte', 'prestamo', 'tarjeta', 'otros'];

function normalizarTexto(valor) {
	return String(valor || '').trim();
}

function normalizarTipoDeuda(valor) {
	return String(valor || '').trim().toLowerCase();
}

async function asegurarTiposBaseDeuda() {
	const total = await TipoDeudaMia.countDocuments();
	if (total > 0) return;

	const tiposIniciales = TIPOS_DEUDA_BASE.map(nombre => ({ nombre }));
	try {
		await TipoDeudaMia.insertMany(tiposIniciales, { ordered: false });
	} catch (err) {
		// En concurrencia puede aparecer duplicate key; no bloquea el flujo.
	}
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

function validarObjectId(valor) {
	return !!valor && mongoose.Types.ObjectId.isValid(String(valor));
}

function construirDescripcionFactura(proveedor, factura) {
	return `Factura ${factura.numeroFactura} - ${proveedor.nombreProveedor}`;
}

function construirDescripcionAbono(proveedor, factura) {
	return `Abono factura ${factura.numeroFactura} - ${proveedor.nombreProveedor}`;
}

function construirMovimientosFacturaMia(proveedor, factura) {
	const movimientos = [];
	const montoFactura = Number(factura.montoFactura || 0);

	if (!validarObjectId(factura.cuentaDebeId) || !validarObjectId(factura.cuentaHaberId)) {
		throw new Error(`La factura ${factura.numeroFactura} no tiene cuentas validas`);
	}

	if (String(factura.cuentaDebeId) === String(factura.cuentaHaberId)) {
		throw new Error(`La factura ${factura.numeroFactura} tiene cuentas iguales en debe y haber`);
	}

	if (montoFactura > 0) {
		movimientos.push({
			cuentaId: factura.cuentaDebeId,
			origenModelo: ORIGEN_MODELO_DEUDAS_MIAS,
			_idOrigen: factura._id,
			debe: montoFactura,
			haber: 0,
			descripcion: construirDescripcionFactura(proveedor, factura),
			fecha: factura.fechaFactura
		});

		movimientos.push({
			cuentaId: factura.cuentaHaberId,
			origenModelo: ORIGEN_MODELO_DEUDAS_MIAS,
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

		if (!validarObjectId(abono.cuentaDebeId) || !validarObjectId(abono.cuentaHaberId)) {
			throw new Error(`Abono invalido en factura ${factura.numeroFactura}: cuentas no validas`);
		}

		if (String(abono.cuentaDebeId) === String(abono.cuentaHaberId)) {
			throw new Error(`Abono invalido en factura ${factura.numeroFactura}: cuentas iguales en debe y haber`);
		}

		movimientos.push({
			cuentaId: abono.cuentaDebeId,
			origenModelo: ORIGEN_MODELO_DEUDAS_MIAS,
			_idOrigen: factura._id,
			debe: montoAbono,
			haber: 0,
			descripcion: construirDescripcionAbono(proveedor, factura),
			fecha: abono.fecha || new Date()
		});

		movimientos.push({
			cuentaId: abono.cuentaHaberId,
			origenModelo: ORIGEN_MODELO_DEUDAS_MIAS,
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
	getTiposDeudaMia: async (req, res) => {
		try {
			await asegurarTiposBaseDeuda();
			const tipos = await TipoDeudaMia.find().sort({ nombre: 1 });
			return res.status(200).send({ tipos });
		} catch (err) {
			return res.status(500).send({ message: 'Error al devolver tipos de deuda personal', error: err });
		}
	},

	createTipoDeudaMia: async (req, res) => {
		try {
			const nombre = normalizarTipoDeuda(req.body?.nombre);
			if (!nombre) {
				return res.status(400).send({ message: 'El nombre del tipo de deuda es obligatorio' });
			}

			const existente = await TipoDeudaMia.findOne({ nombre });
			if (existente) {
				return res.status(409).send({ message: 'El tipo de deuda ya existe' });
			}

			const tipo = await TipoDeudaMia.create({ nombre });
			return res.status(201).send({ tipo });
		} catch (err) {
			return res.status(500).send({ message: 'Error al crear tipo de deuda personal', error: err });
		}
	},

	updateTipoDeudaMia: async (req, res) => {
		try {
			const id = String(req.params.id || '').trim();
			const nombre = normalizarTipoDeuda(req.body?.nombre);

			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id de tipo de deuda invalido' });
			}

			if (!nombre) {
				return res.status(400).send({ message: 'El nombre del tipo de deuda es obligatorio' });
			}

			const tipo = await TipoDeudaMia.findById(id);
			if (!tipo) {
				return res.status(404).send({ message: 'Tipo de deuda no encontrado' });
			}

			const nombreActual = normalizarTipoDeuda(tipo.nombre);
			const repetido = await TipoDeudaMia.findOne({ nombre, _id: { $ne: tipo._id } });
			if (repetido) {
				return res.status(409).send({ message: 'Ya existe otro tipo de deuda con ese nombre' });
			}

			tipo.nombre = nombre;
			const tipoStored = await tipo.save();

			if (nombreActual !== nombre) {
				await DeudaMia.updateMany(
					{ tipoDeuda: nombreActual },
					{ $set: { tipoDeuda: nombre } }
				);

				await DeudaMia.updateMany(
					{ 'facturas.tipoDeuda': nombreActual },
					{ $set: { 'facturas.$[f].tipoDeuda': nombre } },
					{ arrayFilters: [{ 'f.tipoDeuda': nombreActual }] }
				);
			}

			return res.status(200).send({ tipo: tipoStored });
		} catch (err) {
			return res.status(500).send({ message: 'Error al actualizar tipo de deuda personal', error: err });
		}
	},

	deleteTipoDeudaMia: async (req, res) => {
		try {
			await asegurarTiposBaseDeuda();
			const id = String(req.params.id || '').trim();
			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id de tipo de deuda invalido' });
			}

			const tipo = await TipoDeudaMia.findById(id);
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

			const enUsoProveedor = await DeudaMia.exists({ tipoDeuda: tipoNombre });
			if (enUsoProveedor) {
				return res.status(409).send({ message: 'No se puede eliminar un tipo de deuda asignado a proveedores' });
			}

			const enUso = await DeudaMia.exists({ 'facturas.tipoDeuda': tipoNombre });
			if (enUso) {
				return res.status(409).send({ message: 'No se puede eliminar un tipo de deuda que ya esta en uso' });
			}

			const totalTipos = await TipoDeudaMia.countDocuments();
			if (totalTipos <= 1) {
				return res.status(400).send({ message: 'Debes mantener al menos un tipo de deuda' });
			}

			await TipoDeudaMia.findByIdAndDelete(id);
			return res.status(200).send({ message: 'Tipo de deuda eliminado' });
		} catch (err) {
			return res.status(500).send({ message: 'Error al eliminar tipo de deuda personal', error: err });
		}
	},

	getProveedoresDeudaMia: async (req, res) => {
		try {
			const proveedores = await DeudaMia.find({}).sort({ nombreProveedor: 1 });
			if (!proveedores || proveedores.length === 0) {
				return res.status(404).send({ message: 'No hay proveedores de deuda personal para mostrar' });
			}
			return res.status(200).send({ proveedores });
		} catch (err) {
			return res.status(500).send({ message: 'Error al devolver proveedores de deuda personal', error: err });
		}
	},

	getResumenProveedoresDeudaMia: async (req, res) => {
		try {
			const resumen = await DeudaMia.aggregate([
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
			return res.status(500).send({ message: 'Error al devolver resumen de proveedores personales', error: err });
		}
	},

	getProveedorDeudaMiaById: async (req, res) => {
		try {
			const id = req.params.id;
			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id de proveedor invalido' });
			}

			const proveedor = await DeudaMia.findById(id);
			if (!proveedor) {
				return res.status(404).send({ message: 'Proveedor no encontrado' });
			}

			return res.status(200).send({ proveedor });
		} catch (err) {
			return res.status(500).send({ message: 'Error al devolver proveedor personal', error: err });
		}
	},

	createProveedorDeudaMia: async (req, res) => {
		try {
			const params = req.body;
			const nombreProveedor = normalizarTexto(params.nombreProveedor);
			if (!nombreProveedor) {
				return res.status(400).send({ message: 'nombreProveedor es obligatorio' });
			}

			const existe = await DeudaMia.findOne({ nombreProveedor });
			if (existe) {
				return res.status(409).send({ message: 'Ya existe un proveedor con ese nombre' });
			}

			const tipoDeuda = normalizarTipoDeuda(params.tipoDeuda) || 'otros';
			const proveedor = new DeudaMia({
				nombreProveedor,
				tipoDeuda,
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
			return res.status(500).send({ message: 'Error al crear proveedor de deuda personal', error: err });
		}
	},

	updateProveedorDeudaMia: async (req, res) => {
		try {
			const id = req.params.id;
			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id de proveedor invalido' });
			}

			const proveedor = await DeudaMia.findById(id);
			if (!proveedor) {
				return res.status(404).send({ message: 'Proveedor no encontrado' });
			}

			const params = req.body;
			if (params.nombreProveedor !== undefined) {
				const nombreProveedor = normalizarTexto(params.nombreProveedor);
				if (!nombreProveedor) {
					return res.status(400).send({ message: 'nombreProveedor no puede estar vacio' });
				}
				const repetido = await DeudaMia.findOne({ nombreProveedor, _id: { $ne: proveedor._id } });
				if (repetido) {
					return res.status(409).send({ message: 'Ya existe otro proveedor con ese nombre' });
				}
				proveedor.nombreProveedor = nombreProveedor;
			}

			if (params.tipoDeuda !== undefined) {
				const tipoDeuda = normalizarTipoDeuda(params.tipoDeuda);
				if (!tipoDeuda) {
					return res.status(400).send({ message: 'tipoDeuda no puede estar vacio' });
				}
				const tipoExiste = await TipoDeudaMia.exists({ nombre: tipoDeuda });
				if (!tipoExiste) {
					return res.status(400).send({ message: 'El tipo de deuda seleccionado no existe en el catalogo' });
				}
				proveedor.tipoDeuda = tipoDeuda;
			}

			if (params.nit !== undefined) proveedor.nit = normalizarTexto(params.nit);
			if (params.telefono !== undefined) proveedor.telefono = normalizarTexto(params.telefono);
			if (params.correo !== undefined) proveedor.correo = normalizarTexto(params.correo);
			if (params.direccion !== undefined) proveedor.direccion = normalizarTexto(params.direccion);
			if (params.observaciones !== undefined) proveedor.observaciones = normalizarTexto(params.observaciones);

			const proveedorStored = await proveedor.save();
			return res.status(200).send({ proveedor: proveedorStored });
		} catch (err) {
			return res.status(500).send({ message: 'Error al actualizar proveedor de deuda personal', error: err });
		}
	},

	deleteProveedorDeudaMia: async (req, res) => {
		try {
			const id = String(req.params.id || '').trim();
			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id de proveedor invalido' });
			}

			const proveedor = await DeudaMia.findById(id);
			if (!proveedor) {
				return res.status(404).send({ message: 'Proveedor no encontrado' });
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

			await DeudaMia.findByIdAndDelete(id);
			return res.status(200).send({ message: 'Proveedor eliminado correctamente' });
		} catch (err) {
			return res.status(500).send({ message: 'Error al eliminar proveedor de deuda personal', error: err });
		}
	},

	addFacturaProveedorMia: async (req, res) => {
		try {
			const idProveedor = req.params.idProveedor;
			if (!idProveedor || !mongoose.Types.ObjectId.isValid(idProveedor)) {
				return res.status(400).send({ message: 'Id de proveedor invalido' });
			}

			const proveedor = await DeudaMia.findById(idProveedor);
			if (!proveedor) {
				return res.status(404).send({ message: 'Proveedor no encontrado' });
			}

			const params = req.body;
			const numeroFactura = normalizarTexto(params.numeroFactura);
			const tipoDeuda = normalizarTipoDeuda(params.tipoDeuda);
			const fechaFactura = normalizarFecha(params.fechaFactura);
			const montoFactura = toNumber(params.montoFactura);
			const cuentaDebeId = String(params.cuentaDebeId || '').trim();
			const cuentaHaberId = String(params.cuentaHaberId || '').trim();

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

			if (!validarObjectId(cuentaDebeId) || !validarObjectId(cuentaHaberId)) {
				return res.status(400).send({ message: 'Debes seleccionar cuenta debe y cuenta haber validas para la factura' });
			}

			if (cuentaDebeId === cuentaHaberId) {
				return res.status(400).send({ message: 'Las cuentas de debe y haber en la factura deben ser diferentes' });
			}

			await asegurarTiposBaseDeuda();
			const tipoExiste = await TipoDeudaMia.exists({ nombre: tipoDeuda });
			if (!tipoExiste) {
				return res.status(400).send({ message: 'El tipo de deuda no existe en el catalogo' });
			}

			const [cuentaDebe, cuentaHaber] = await Promise.all([
				CuentaMia.findById(cuentaDebeId),
				CuentaMia.findById(cuentaHaberId)
			]);

			if (!cuentaDebe || !cuentaHaber) {
				return res.status(404).send({ message: 'La cuenta debe o haber seleccionada no existe' });
			}

			const repetida = proveedor.facturas.find(f =>
				String(f.numeroFactura).toLowerCase() === numeroFactura.toLowerCase()
			);

			if (repetida) {
				return res.status(409).send({ message: 'Ya existe una factura con ese numero para este proveedor' });
			}

			proveedor.facturas.push({
				numeroFactura,
				tipoDeuda,
				fechaFactura,
				montoFactura,
				montoAbonado: 0,
				saldoPendiente: montoFactura,
				estado: 'pendiente',
				cuentaDebeId,
				cuentaHaberId,
				abonos: []
			});

			const facturaCreada = proveedor.facturas[proveedor.facturas.length - 1];
			recalcularTotalesProveedor(proveedor);
			const proveedorStored = await proveedor.save();

			try {
				const movimientos = construirMovimientosFacturaMia(proveedorStored, facturaCreada);

				await MovimientoMio.deleteMany({
					origenModelo: ORIGEN_MODELO_DEUDAS_MIAS,
					_idOrigen: facturaCreada._id
				});

				if (movimientos.length > 0) {
					await MovimientoMio.insertMany(movimientos);
				}

				return res.status(200).send({ proveedor: proveedorStored, movimientosGenerados: movimientos.length });
			} catch (movErr) {
				// Si falla la contabilidad, revertimos la factura para evitar inconsistencias y falsos duplicados en reintentos.
				const proveedorRollback = await DeudaMia.findById(idProveedor);
				if (proveedorRollback) {
					const facturaRollback = proveedorRollback.facturas.id(facturaCreada._id);
					if (facturaRollback) {
						facturaRollback.deleteOne();
						recalcularTotalesProveedor(proveedorRollback);
						await proveedorRollback.save();
					}
				}

				return res.status(500).send({
					message: 'No se pudo generar la contabilidad automatica de la factura. Operacion revertida.',
					error: movErr
				});
			}
		} catch (err) {
			return res.status(500).send({ message: 'Error al agregar factura al proveedor personal', error: err });
		}
	},

	updateFacturaProveedorMia: async (req, res) => {
		try {
			const idProveedor = req.params.idProveedor;
			const idFactura = req.params.idFactura;

			if (!idProveedor || !mongoose.Types.ObjectId.isValid(idProveedor)) {
				return res.status(400).send({ message: 'Id de proveedor invalido' });
			}

			if (!idFactura || !mongoose.Types.ObjectId.isValid(idFactura)) {
				return res.status(400).send({ message: 'Id de factura invalido' });
			}

			const proveedor = await DeudaMia.findById(idProveedor);
			if (!proveedor) {
				return res.status(404).send({ message: 'Proveedor no encontrado' });
			}

			const factura = proveedor.facturas.id(idFactura);
			if (!factura) {
				return res.status(404).send({ message: 'Factura no encontrada para este proveedor' });
			}

			const params = req.body || {};
			const numeroFactura = normalizarTexto(params.numeroFactura);
			const tipoDeuda = normalizarTipoDeuda(params.tipoDeuda);
			const fechaFactura = normalizarFecha(params.fechaFactura);
			const montoFactura = toNumber(params.montoFactura);
			const cuentaDebeId = String(params.cuentaDebeId || '').trim();
			const cuentaHaberId = String(params.cuentaHaberId || '').trim();

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

			if (!validarObjectId(cuentaDebeId) || !validarObjectId(cuentaHaberId)) {
				return res.status(400).send({ message: 'Debes seleccionar cuenta debe y cuenta haber validas para la factura' });
			}

			if (cuentaDebeId === cuentaHaberId) {
				return res.status(400).send({ message: 'Las cuentas de debe y haber en la factura deben ser diferentes' });
			}

			if (Number(factura.montoAbonado || 0) > montoFactura) {
				return res.status(400).send({ message: 'El nuevo monto de la factura no puede ser menor al total ya abonado' });
			}

			await asegurarTiposBaseDeuda();
			const tipoExiste = await TipoDeudaMia.exists({ nombre: tipoDeuda });
			if (!tipoExiste) {
				return res.status(400).send({ message: 'El tipo de deuda no existe en el catalogo' });
			}

			const [cuentaDebe, cuentaHaber] = await Promise.all([
				CuentaMia.findById(cuentaDebeId),
				CuentaMia.findById(cuentaHaberId)
			]);

			if (!cuentaDebe || !cuentaHaber) {
				return res.status(404).send({ message: 'La cuenta debe o haber seleccionada no existe' });
			}

			const repetida = proveedor.facturas.find(f =>
				String(f._id) !== String(factura._id)
				&& String(f.numeroFactura).toLowerCase() === numeroFactura.toLowerCase()
			);

			if (repetida) {
				return res.status(409).send({ message: 'Ya existe una factura con ese numero para este proveedor' });
			}

			factura.numeroFactura = numeroFactura;
			factura.tipoDeuda = tipoDeuda;
			factura.fechaFactura = fechaFactura;
			factura.montoFactura = montoFactura;
			factura.cuentaDebeId = cuentaDebeId;
			factura.cuentaHaberId = cuentaHaberId;
			factura.saldoPendiente = Number((Number(factura.montoFactura) - Number(factura.montoAbonado || 0)).toFixed(2));
			factura.estado = calcularEstadoFactura(factura.montoFactura, factura.montoAbonado);

			recalcularTotalesProveedor(proveedor);
			const proveedorStored = await proveedor.save();
			const facturaGuardada = proveedorStored.facturas.id(idFactura);

			const movimientos = construirMovimientosFacturaMia(proveedorStored, facturaGuardada);

			await MovimientoMio.deleteMany({
				origenModelo: ORIGEN_MODELO_DEUDAS_MIAS,
				_idOrigen: factura._id
			});

			if (movimientos.length > 0) {
				await MovimientoMio.insertMany(movimientos);
			}

			return res.status(200).send({ proveedor: proveedorStored, movimientosGenerados: movimientos.length });
		} catch (err) {
			return res.status(500).send({ message: 'Error al editar factura del proveedor personal', error: err });
		}
	},

	abonarFacturaProveedorMia: async (req, res) => {
		try {
			const idProveedor = req.params.idProveedor;
			const idFactura = req.params.idFactura;

			if (!idProveedor || !mongoose.Types.ObjectId.isValid(idProveedor)) {
				return res.status(400).send({ message: 'Id de proveedor invalido' });
			}

			if (!idFactura || !mongoose.Types.ObjectId.isValid(idFactura)) {
				return res.status(400).send({ message: 'Id de factura invalido' });
			}

			const proveedor = await DeudaMia.findById(idProveedor);
			if (!proveedor) {
				return res.status(404).send({ message: 'Proveedor no encontrado' });
			}

			const factura = proveedor.facturas.id(idFactura);
			if (!factura) {
				return res.status(404).send({ message: 'Factura no encontrada para este proveedor' });
			}

			const monto = toNumber(req.body.monto);
			const fecha = req.body.fecha ? normalizarFecha(req.body.fecha) : new Date();
			const cuentaDebeId = String(req.body.cuentaDebeId || '').trim();
			const cuentaHaberId = String(req.body.cuentaHaberId || '').trim();

			if (monto === null || monto <= 0) {
				return res.status(400).send({ message: 'El monto del abono debe ser mayor a 0' });
			}

			if (!fecha) {
				return res.status(400).send({ message: 'Fecha de abono invalida. Usa formato YYYY-MM-DD' });
			}

			if (monto > factura.saldoPendiente) {
				return res.status(400).send({ message: 'El abono no puede superar el saldo pendiente de la factura' });
			}

			if (!validarObjectId(cuentaDebeId) || !validarObjectId(cuentaHaberId)) {
				return res.status(400).send({ message: 'Debes seleccionar cuenta debe y cuenta haber validas para el abono' });
			}

			if (cuentaDebeId === cuentaHaberId) {
				return res.status(400).send({ message: 'Las cuentas de debe y haber en el abono deben ser diferentes' });
			}

			const [cuentaDebe, cuentaHaber] = await Promise.all([
				CuentaMia.findById(cuentaDebeId),
				CuentaMia.findById(cuentaHaberId)
			]);

			if (!cuentaDebe || !cuentaHaber) {
				return res.status(404).send({ message: 'La cuenta debe o haber seleccionada no existe' });
			}

			factura.abonos.push({
				fecha,
				monto,
				descripcion: normalizarTexto(req.body.descripcion) || 'Abono de factura',
				cuentaDebeId,
				cuentaHaberId
			});

			factura.montoAbonado = Number((Number(factura.montoAbonado || 0) + monto).toFixed(2));
			factura.saldoPendiente = Number((Number(factura.montoFactura) - Number(factura.montoAbonado)).toFixed(2));
			factura.estado = calcularEstadoFactura(factura.montoFactura, factura.montoAbonado);

			recalcularTotalesProveedor(proveedor);
			const proveedorStored = await proveedor.save();
			const facturaGuardada = proveedorStored.facturas.id(idFactura);

			const movimientos = construirMovimientosFacturaMia(proveedorStored, facturaGuardada);

			await MovimientoMio.deleteMany({
				origenModelo: ORIGEN_MODELO_DEUDAS_MIAS,
				_idOrigen: factura._id
			});

			if (movimientos.length > 0) {
				await MovimientoMio.insertMany(movimientos);
			}

			return res.status(200).send({ proveedor: proveedorStored, movimientosGenerados: movimientos.length });
		} catch (err) {
			return res.status(500).send({ message: 'Error al registrar abono de factura personal', error: err });
		}
	},

	updateAbonoFacturaProveedorMia: async (req, res) => {
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

			const proveedor = await DeudaMia.findById(idProveedor);
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

			const abono = factura.abonos[indexAbono];
			const monto = toNumber(req.body.monto);
			const fecha = req.body.fecha ? normalizarFecha(req.body.fecha) : null;
			const cuentaDebeId = String(req.body.cuentaDebeId || '').trim();
			const cuentaHaberId = String(req.body.cuentaHaberId || '').trim();

			if (monto === null || monto <= 0) {
				return res.status(400).send({ message: 'El monto del abono debe ser mayor a 0' });
			}

			if (!fecha) {
				return res.status(400).send({ message: 'Fecha de abono invalida. Usa formato YYYY-MM-DD' });
			}

			if (!validarObjectId(cuentaDebeId) || !validarObjectId(cuentaHaberId)) {
				return res.status(400).send({ message: 'Debes seleccionar cuenta debe y cuenta haber validas para el abono' });
			}

			if (cuentaDebeId === cuentaHaberId) {
				return res.status(400).send({ message: 'Las cuentas de debe y haber en el abono deben ser diferentes' });
			}

			const [cuentaDebe, cuentaHaber] = await Promise.all([
				CuentaMia.findById(cuentaDebeId),
				CuentaMia.findById(cuentaHaberId)
			]);

			if (!cuentaDebe || !cuentaHaber) {
				return res.status(404).send({ message: 'La cuenta debe o haber seleccionada no existe' });
			}

			const saldoDisponible = Number(factura.saldoPendiente || 0) + Number(abono.monto || 0);
			if (monto > saldoDisponible) {
				return res.status(400).send({ message: 'El abono no puede superar el saldo pendiente disponible de la factura' });
			}

			abono.monto = monto;
			abono.fecha = fecha;
			abono.descripcion = normalizarTexto(req.body.descripcion) || 'Abono de factura';
			abono.cuentaDebeId = cuentaDebeId;
			abono.cuentaHaberId = cuentaHaberId;

			let totalAbonosFactura = 0;
			for (const item of factura.abonos) {
				totalAbonosFactura += Number(item.monto || 0);
			}

			factura.montoAbonado = Number(totalAbonosFactura.toFixed(2));
			factura.saldoPendiente = Number((Number(factura.montoFactura) - Number(factura.montoAbonado)).toFixed(2));
			factura.estado = calcularEstadoFactura(factura.montoFactura, factura.montoAbonado);

			recalcularTotalesProveedor(proveedor);
			const proveedorStored = await proveedor.save();
			const facturaGuardada = proveedorStored.facturas.id(idFactura);

			const movimientos = construirMovimientosFacturaMia(proveedorStored, facturaGuardada);

			await MovimientoMio.deleteMany({
				origenModelo: ORIGEN_MODELO_DEUDAS_MIAS,
				_idOrigen: factura._id
			});

			if (movimientos.length > 0) {
				await MovimientoMio.insertMany(movimientos);
			}

			return res.status(200).send({ proveedor: proveedorStored, movimientosGenerados: movimientos.length });
		} catch (err) {
			return res.status(500).send({ message: 'Error al editar abono de factura personal', error: err });
		}
	},

	deleteAbonoFacturaProveedorMia: async (req, res) => {
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

			const proveedor = await DeudaMia.findById(idProveedor);
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

			const movimientos = construirMovimientosFacturaMia(proveedorStored, facturaGuardada);

			await MovimientoMio.deleteMany({
				origenModelo: ORIGEN_MODELO_DEUDAS_MIAS,
				_idOrigen: factura._id
			});

			if (movimientos.length > 0) {
				await MovimientoMio.insertMany(movimientos);
			}

			return res.status(200).send({ proveedor: proveedorStored, movimientosGenerados: movimientos.length });
		} catch (err) {
			return res.status(500).send({ message: 'Error al eliminar abono de factura personal', error: err });
		}
	},

	deleteFacturaProveedorMia: async (req, res) => {
		try {
			const idProveedor = req.params.idProveedor;
			const idFactura = req.params.idFactura;

			if (!idProveedor || !mongoose.Types.ObjectId.isValid(idProveedor)) {
				return res.status(400).send({ message: 'Id de proveedor invalido' });
			}

			if (!idFactura || !mongoose.Types.ObjectId.isValid(idFactura)) {
				return res.status(400).send({ message: 'Id de factura invalido' });
			}

			const proveedor = await DeudaMia.findById(idProveedor);
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

			await MovimientoMio.deleteMany({
				origenModelo: ORIGEN_MODELO_DEUDAS_MIAS,
				_idOrigen: idOrigenFactura
			});

			return res.status(200).send({ proveedor: proveedorStored });
		} catch (err) {
			return res.status(500).send({ message: 'Error al eliminar factura del proveedor personal', error: err });
		}
	}
};

module.exports = controller;
