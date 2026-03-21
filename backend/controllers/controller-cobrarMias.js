'use strict'

var mongoose = require('mongoose');
var CobroMio = require('../modules/module-cobrarMias');
var TipoCobroMio = require('../modules/module-tiposCobrosMios');
var MovimientoMio = require('../modules/module-movimientoMios');
var CuentaMia = require('../modules/module-cuentasMias');

const ORIGEN_MODELO_COBRAR_MIAS = 'cobrarmias';
const TIPOS_COBRO_BASE = ['hogar', 'salud', 'educacion', 'transporte', 'prestamo', 'tarjeta', 'otros'];

function normalizarTexto(valor) {
	return String(valor || '').trim();
}

function normalizarTipoCobro(valor) {
	return String(valor || '').trim().toLowerCase();
}

async function asegurarTiposBaseCobro() {
	const total = await TipoCobroMio.countDocuments();
	if (total > 0) return;

	const tiposIniciales = TIPOS_COBRO_BASE.map(nombre => ({ nombre }));
	try {
		await TipoCobroMio.insertMany(tiposIniciales, { ordered: false });
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
		date.setHours(12, 0, 0, 0);
		return date;
	}

	const date = new Date(valor);
	if (isNaN(date.getTime())) return null;
	date.setHours(12, 0, 0, 0);
	return date;
}

function calcularEstadoFactura(montoFactura, montoAbonado) {
	if (montoAbonado <= 0) return 'pendiente';
	if (montoAbonado >= montoFactura) return 'pagada';
	return 'parcial';
}

function recalcularTotalesProveedor(deudor) {
	let totalDeuda = 0;
	let totalAbonado = 0;
	let totalPendiente = 0;

	for (const factura of deudor.facturas) {
		totalDeuda += Number(factura.montoFactura || 0);
		totalAbonado += Number(factura.montoAbonado || 0);
		totalPendiente += Number(factura.saldoPendiente || 0);
	}

	deudor.totalFacturas = deudor.facturas.length;
	deudor.totalDeuda = Number(totalDeuda.toFixed(2));
	deudor.totalAbonado = Number(totalAbonado.toFixed(2));
	deudor.totalPendiente = Number(totalPendiente.toFixed(2));
}

function validarObjectId(valor) {
	return !!valor && mongoose.Types.ObjectId.isValid(String(valor));
}

function construirDescripcionFactura(deudor, factura) {
	return `Factura ${factura.numeroFactura} - ${deudor.nombreDeudor}`;
}

function construirDescripcionAbono(deudor, factura) {
	return `Abono factura ${factura.numeroFactura} - ${deudor.nombreDeudor}`;
}

function construirMovimientosFacturaMia(deudor, factura) {
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
			origenModelo: ORIGEN_MODELO_COBRAR_MIAS,
			_idOrigen: factura._id,
			debe: montoFactura,
			haber: 0,
			descripcion: construirDescripcionFactura(deudor, factura),
			fecha: factura.fechaFactura
		});

		movimientos.push({
			cuentaId: factura.cuentaHaberId,
			origenModelo: ORIGEN_MODELO_COBRAR_MIAS,
			_idOrigen: factura._id,
			debe: 0,
			haber: montoFactura,
			descripcion: construirDescripcionFactura(deudor, factura),
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
			origenModelo: ORIGEN_MODELO_COBRAR_MIAS,
			_idOrigen: factura._id,
			debe: montoAbono,
			haber: 0,
			descripcion: construirDescripcionAbono(deudor, factura),
			fecha: abono.fecha || new Date()
		});

		movimientos.push({
			cuentaId: abono.cuentaHaberId,
			origenModelo: ORIGEN_MODELO_COBRAR_MIAS,
			_idOrigen: factura._id,
			debe: 0,
			haber: montoAbono,
			descripcion: construirDescripcionAbono(deudor, factura),
			fecha: abono.fecha || new Date()
		});
	}

	return movimientos;
}

var controller = {
	getTiposCobroMio: async (req, res) => {
		try {
			await asegurarTiposBaseCobro();
			const tipos = await TipoCobroMio.find().sort({ nombre: 1 });
			return res.status(200).send({ tipos });
		} catch (err) {
			return res.status(500).send({ message: 'Error al devolver tipos de deuda personal', error: err });
		}
	},

	createTipoCobroMio: async (req, res) => {
		try {
			const nombre = normalizarTipoCobro(req.body?.nombre);
			if (!nombre) {
				return res.status(400).send({ message: 'El nombre del tipo de deuda es obligatorio' });
			}

			const existente = await TipoCobroMio.findOne({ nombre });
			if (existente) {
				return res.status(409).send({ message: 'El tipo de deuda ya existe' });
			}

			const tipo = await TipoCobroMio.create({ nombre });
			return res.status(201).send({ tipo });
		} catch (err) {
			return res.status(500).send({ message: 'Error al crear tipo de deuda personal', error: err });
		}
	},

	updateTipoCobroMio: async (req, res) => {
		try {
			const id = String(req.params.id || '').trim();
			const nombre = normalizarTipoCobro(req.body?.nombre);

			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id de tipo de deuda invalido' });
			}

			if (!nombre) {
				return res.status(400).send({ message: 'El nombre del tipo de deuda es obligatorio' });
			}

			const tipo = await TipoCobroMio.findById(id);
			if (!tipo) {
				return res.status(404).send({ message: 'Tipo de deuda no encontrado' });
			}

			const nombreActual = normalizarTipoCobro(tipo.nombre);
			const repetido = await TipoCobroMio.findOne({ nombre, _id: { $ne: tipo._id } });
			if (repetido) {
				return res.status(409).send({ message: 'Ya existe otro tipo de deuda con ese nombre' });
			}

			tipo.nombre = nombre;
			const tipoStored = await tipo.save();

			if (nombreActual !== nombre) {
				await CobroMio.updateMany(
					{ tipoCobro: nombreActual },
					{ $set: { tipoCobro: nombre } }
				);

				await CobroMio.updateMany(
					{ 'facturas.tipoCobro': nombreActual },
					{ $set: { 'facturas.$[f].tipoCobro': nombre } },
					{ arrayFilters: [{ 'f.tipoCobro': nombreActual }] }
				);
			}

			return res.status(200).send({ tipo: tipoStored });
		} catch (err) {
			return res.status(500).send({ message: 'Error al actualizar tipo de deuda personal', error: err });
		}
	},

	deleteTipoCobroMio: async (req, res) => {
		try {
			await asegurarTiposBaseCobro();
			const id = String(req.params.id || '').trim();
			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id de tipo de deuda invalido' });
			}

			const tipo = await TipoCobroMio.findById(id);
			if (!tipo) {
				return res.status(404).send({ message: 'Tipo de deuda no encontrado' });
			}

			const tipoNombre = normalizarTipoCobro(tipo.nombre);
			const confirmacion = String(req.body?.confirmacion || '').trim().toUpperCase();
			const confirmacionEsperada = `ELIMINAR ${String(tipo.nombre || '').toUpperCase()}`;
			if (confirmacion !== confirmacionEsperada) {
				return res.status(400).send({
					message: `Confirmacion invalida. Debes escribir exactamente: ${confirmacionEsperada}`
				});
			}

			const enUsoProveedor = await CobroMio.exists({ tipoCobro: tipoNombre });
			if (enUsoProveedor) {
				return res.status(409).send({ message: 'No se puede eliminar un tipo de deuda asignado a deudores' });
			}

			const enUso = await CobroMio.exists({ 'facturas.tipoCobro': tipoNombre });
			if (enUso) {
				return res.status(409).send({ message: 'No se puede eliminar un tipo de deuda que ya esta en uso' });
			}

			const totalTipos = await TipoCobroMio.countDocuments();
			if (totalTipos <= 1) {
				return res.status(400).send({ message: 'Debes mantener al menos un tipo de deuda' });
			}

			await TipoCobroMio.findByIdAndDelete(id);
			return res.status(200).send({ message: 'Tipo de deuda eliminado' });
		} catch (err) {
			return res.status(500).send({ message: 'Error al eliminar tipo de deuda personal', error: err });
		}
	},

	getProveedoresCobroMio: async (req, res) => {
		try {
			const deudores = await CobroMio.find({}).sort({ nombreDeudor: 1 });
			if (!deudores || deudores.length === 0) {
				return res.status(404).send({ message: 'No hay deudores de deuda personal para mostrar' });
			}
			return res.status(200).send({ deudores });
		} catch (err) {
			return res.status(500).send({ message: 'Error al devolver deudores de deuda personal', error: err });
		}
	},

	getResumenProveedoresCobroMio: async (req, res) => {
		try {
			const resumen = await CobroMio.aggregate([
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
			return res.status(500).send({ message: 'Error al devolver resumen de deudores personales', error: err });
		}
	},

	getProveedorCobroMioById: async (req, res) => {
		try {
			const id = req.params.id;
			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id de deudor invalido' });
			}

			const deudor = await CobroMio.findById(id);
			if (!deudor) {
				return res.status(404).send({ message: 'Proveedor no encontrado' });
			}

			return res.status(200).send({ deudor });
		} catch (err) {
			return res.status(500).send({ message: 'Error al devolver deudor personal', error: err });
		}
	},

	createProveedorCobroMio: async (req, res) => {
		try {
			const params = req.body;
			const nombreDeudor = normalizarTexto(params.nombreDeudor);
			if (!nombreDeudor) {
				return res.status(400).send({ message: 'nombreDeudor es obligatorio' });
			}

			const existe = await CobroMio.findOne({ nombreDeudor });
			if (existe) {
				return res.status(409).send({ message: 'Ya existe un deudor con ese nombre' });
			}

			const deudor = new CobroMio({
				nombreDeudor,
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

			const deudorStored = await deudor.save();
			return res.status(200).send({ deudor: deudorStored });
		} catch (err) {
			return res.status(500).send({ message: 'Error al crear deudor de deuda personal', error: err });
		}
	},

	updateProveedorCobroMio: async (req, res) => {
		try {
			const id = req.params.id;
			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id de deudor invalido' });
			}

			const deudor = await CobroMio.findById(id);
			if (!deudor) {
				return res.status(404).send({ message: 'Proveedor no encontrado' });
			}

			const params = req.body;
			if (params.nombreDeudor !== undefined) {
				const nombreDeudor = normalizarTexto(params.nombreDeudor);
				if (!nombreDeudor) {
					return res.status(400).send({ message: 'nombreDeudor no puede estar vacio' });
				}
				const repetido = await CobroMio.findOne({ nombreDeudor, _id: { $ne: deudor._id } });
				if (repetido) {
					return res.status(409).send({ message: 'Ya existe otro deudor con ese nombre' });
				}
				deudor.nombreDeudor = nombreDeudor;
			}

			if (params.nit !== undefined) deudor.nit = normalizarTexto(params.nit);
			if (params.telefono !== undefined) deudor.telefono = normalizarTexto(params.telefono);
			if (params.correo !== undefined) deudor.correo = normalizarTexto(params.correo);
			if (params.direccion !== undefined) deudor.direccion = normalizarTexto(params.direccion);
			if (params.observaciones !== undefined) deudor.observaciones = normalizarTexto(params.observaciones);

			const deudorStored = await deudor.save();
			return res.status(200).send({ deudor: deudorStored });
		} catch (err) {
			return res.status(500).send({ message: 'Error al actualizar deudor de deuda personal', error: err });
		}
	},

	deleteProveedorCobroMio: async (req, res) => {
		try {
			const id = String(req.params.id || '').trim();
			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id de deudor invalido' });
			}

			const deudor = await CobroMio.findById(id);
			if (!deudor) {
				return res.status(404).send({ message: 'Proveedor no encontrado' });
			}

			const confirmacion = String(req.body?.confirmacion || '').trim().toUpperCase();
			const confirmacionEsperada = `ELIMINAR ${String(deudor.nombreDeudor || '').toUpperCase()}`;
			if (confirmacion !== confirmacionEsperada) {
				return res.status(400).send({
					message: `Confirmacion invalida. Debes escribir exactamente: ${confirmacionEsperada}`
				});
			}

			if ((deudor.facturas || []).length > 0) {
				return res.status(409).send({ message: 'No se puede eliminar un deudor con facturas registradas. Elimina primero sus facturas.' });
			}

			await CobroMio.findByIdAndDelete(id);
			return res.status(200).send({ message: 'Proveedor eliminado correctamente' });
		} catch (err) {
			return res.status(500).send({ message: 'Error al eliminar deudor de deuda personal', error: err });
		}
	},

	addFacturaDeudorMio: async (req, res) => {
		try {
			const idProveedor = req.params.idProveedor;
			if (!idProveedor || !mongoose.Types.ObjectId.isValid(idProveedor)) {
				return res.status(400).send({ message: 'Id de deudor invalido' });
			}

			const deudor = await CobroMio.findById(idProveedor);
			if (!deudor) {
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

			const [cuentaDebe, cuentaHaber] = await Promise.all([
				CuentaMia.findOne({ nombre: /cuentas por cobrar personal/i }),
				CuentaMia.findOne({ nombre: /historico de cuentas por cobrar personal/i })
			]);

			if (!cuentaDebe) {
				return res.status(404).send({ message: 'No se encontro la cuenta "CUENTAS POR COBRAR PERSONAL"' });
			}

			if (!cuentaHaber) {
				return res.status(404).send({ message: 'No se encontro la cuenta "HISTORICO DE CUENTAS POR COBRAR PERSONAL"' });
			}

			const cuentaDebeId = String(cuentaDebe._id);
			const cuentaHaberId = String(cuentaHaber._id);

			const repetida = deudor.facturas.find(f =>
				String(f.numeroFactura).toLowerCase() === numeroFactura.toLowerCase()
			);

			if (repetida) {
				return res.status(409).send({ message: 'Ya existe una factura con ese numero para este deudor' });
			}

			deudor.facturas.push({
				numeroFactura,
				fechaFactura,
				montoFactura,
				montoAbonado: 0,
				saldoPendiente: montoFactura,
				estado: 'pendiente',
				cuentaDebeId,
				cuentaHaberId,
				abonos: []
			});

			const facturaCreada = deudor.facturas[deudor.facturas.length - 1];
			recalcularTotalesProveedor(deudor);
			const deudorStored = await deudor.save();

			try {
				const movimientos = construirMovimientosFacturaMia(deudorStored, facturaCreada);

				await MovimientoMio.deleteMany({
					origenModelo: ORIGEN_MODELO_COBRAR_MIAS,
					_idOrigen: facturaCreada._id
				});

				if (movimientos.length > 0) {
					await MovimientoMio.insertMany(movimientos);
				}

				return res.status(200).send({ deudor: deudorStored, movimientosGenerados: movimientos.length });
			} catch (movErr) {
				// Si falla la contabilidad, revertimos la factura para evitar inconsistencias y falsos duplicados en reintentos.
				const deudorRollback = await CobroMio.findById(idProveedor);
				if (deudorRollback) {
					const facturaRollback = deudorRollback.facturas.id(facturaCreada._id);
					if (facturaRollback) {
						facturaRollback.deleteOne();
						recalcularTotalesProveedor(deudorRollback);
						await deudorRollback.save();
					}
				}

				return res.status(500).send({
					message: 'No se pudo generar la contabilidad automatica de la factura. Operacion revertida.',
					error: movErr
				});
			}
		} catch (err) {
			return res.status(500).send({ message: 'Error al agregar factura al deudor personal', error: err });
		}
	},

	abonarFacturaDeudorMio: async (req, res) => {
		try {
			const idProveedor = req.params.idProveedor;
			const idFactura = req.params.idFactura;

			if (!idProveedor || !mongoose.Types.ObjectId.isValid(idProveedor)) {
				return res.status(400).send({ message: 'Id de deudor invalido' });
			}

			if (!idFactura || !mongoose.Types.ObjectId.isValid(idFactura)) {
				return res.status(400).send({ message: 'Id de factura invalido' });
			}

			const deudor = await CobroMio.findById(idProveedor);
			if (!deudor) {
				return res.status(404).send({ message: 'Proveedor no encontrado' });
			}

			const factura = deudor.facturas.id(idFactura);
			if (!factura) {
				return res.status(404).send({ message: 'Factura no encontrada para este deudor' });
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

			recalcularTotalesProveedor(deudor);
			const deudorStored = await deudor.save();
			const facturaGuardada = deudorStored.facturas.id(idFactura);

			const movimientos = construirMovimientosFacturaMia(deudorStored, facturaGuardada);

			await MovimientoMio.deleteMany({
				origenModelo: ORIGEN_MODELO_COBRAR_MIAS,
				_idOrigen: factura._id
			});

			if (movimientos.length > 0) {
				await MovimientoMio.insertMany(movimientos);
			}

			return res.status(200).send({ deudor: deudorStored, movimientosGenerados: movimientos.length });
		} catch (err) {
			return res.status(500).send({ message: 'Error al registrar abono de factura personal', error: err });
		}
	},

	deleteAbonoFacturaDeudorMio: async (req, res) => {
		try {
			const idProveedor = req.params.idProveedor;
			const idFactura = req.params.idFactura;
			const indexAbono = Number(req.params.indexAbono);

			if (!idProveedor || !mongoose.Types.ObjectId.isValid(idProveedor)) {
				return res.status(400).send({ message: 'Id de deudor invalido' });
			}

			if (!idFactura || !mongoose.Types.ObjectId.isValid(idFactura)) {
				return res.status(400).send({ message: 'Id de factura invalido' });
			}

			if (!Number.isInteger(indexAbono) || indexAbono < 0) {
				return res.status(400).send({ message: 'Indice de abono invalido' });
			}

			const deudor = await CobroMio.findById(idProveedor);
			if (!deudor) {
				return res.status(404).send({ message: 'Proveedor no encontrado' });
			}

			const factura = deudor.facturas.id(idFactura);
			if (!factura) {
				return res.status(404).send({ message: 'Factura no encontrada para este deudor' });
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

			recalcularTotalesProveedor(deudor);
			const deudorStored = await deudor.save();
			const facturaGuardada = deudorStored.facturas.id(idFactura);

			const movimientos = construirMovimientosFacturaMia(deudorStored, facturaGuardada);

			await MovimientoMio.deleteMany({
				origenModelo: ORIGEN_MODELO_COBRAR_MIAS,
				_idOrigen: factura._id
			});

			if (movimientos.length > 0) {
				await MovimientoMio.insertMany(movimientos);
			}

			return res.status(200).send({ deudor: deudorStored, movimientosGenerados: movimientos.length });
		} catch (err) {
			return res.status(500).send({ message: 'Error al eliminar abono de factura personal', error: err });
		}
	},

	deleteFacturaDeudorMio: async (req, res) => {
		try {
			const idProveedor = req.params.idProveedor;
			const idFactura = req.params.idFactura;

			if (!idProveedor || !mongoose.Types.ObjectId.isValid(idProveedor)) {
				return res.status(400).send({ message: 'Id de deudor invalido' });
			}

			if (!idFactura || !mongoose.Types.ObjectId.isValid(idFactura)) {
				return res.status(400).send({ message: 'Id de factura invalido' });
			}

			const deudor = await CobroMio.findById(idProveedor);
			if (!deudor) {
				return res.status(404).send({ message: 'Proveedor no encontrado' });
			}

			const factura = deudor.facturas.id(idFactura);
			if (!factura) {
				return res.status(404).send({ message: 'Factura no encontrada para este deudor' });
			}

			const idOrigenFactura = factura._id;
			factura.deleteOne();
			recalcularTotalesProveedor(deudor);
			const deudorStored = await deudor.save();

			await MovimientoMio.deleteMany({
				origenModelo: ORIGEN_MODELO_COBRAR_MIAS,
				_idOrigen: idOrigenFactura
			});

			return res.status(200).send({ deudor: deudorStored });
		} catch (err) {
			return res.status(500).send({ message: 'Error al eliminar factura del deudor personal', error: err });
		}
	}
};

module.exports = controller;


