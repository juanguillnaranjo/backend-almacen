'use strict'

var mongoose = require('mongoose');
var GastoOrange = require('../modules/module-gastosOrange');
var TipoGastoOrange = require('../modules/module-tiposGastosOrange');
var CuentaOrange = require('../modules/module-cuentasOrange');

const CATALOGO_GASTOS_BASE = [
	{
		clase: 'costos de ventas',
		subclases: [
			{ nombre: 'materia prima', tipos: ['carnes', 'verduras', 'granos', 'lacteos', 'condimentos'] },
			{ nombre: 'insumos de cocina', tipos: ['aceites', 'salsas base', 'desechables cocina', 'aseo cocina'] },
			{ nombre: 'productos terminados', tipos: ['bebidas', 'panaderia', 'postres', 'congelados'] },
			{ nombre: 'empaques', tipos: ['envases', 'bolsas', 'cubiertos desechables', 'servilletas'] }
		]
	},
	{
		clase: 'gastos operativos',
		subclases: [
			{ nombre: 'personal operativo', tipos: ['salarios', 'horas extra', 'auxilio transporte', 'seguridad social'] },
			{ nombre: 'mantenimiento operativo', tipos: ['reparaciones', 'repuestos', 'servicio tecnico', 'aseo locativo'] },
			{ nombre: 'logistica operativa', tipos: ['combustible', 'fletes', 'domicilios', 'parqueaderos'] },
			{ nombre: 'servicios operativos', tipos: ['gas', 'agua', 'energia', 'internet operativo'] }
		]
	},
	{
		clase: 'gastos administrativos',
		subclases: [
			{ nombre: 'personal administrativo', tipos: ['salarios', 'honorarios', 'seguridad social', 'capacitaciones'] },
			{ nombre: 'papeleria y oficina', tipos: ['papeleria', 'utiles', 'impresiones', 'cafeteria oficina'] },
			{ nombre: 'tecnologia y sistemas', tipos: ['software', 'licencias', 'equipos', 'soporte tecnico'] },
			{ nombre: 'legales y contables', tipos: ['contabilidad', 'asesoria legal', 'tramites', 'impuestos administrativos'] }
		]
	},
	{
		clase: 'gastos de ventas',
		subclases: [
			{ nombre: 'publicidad y marketing', tipos: ['publicidad digital', 'impresos', 'campanas', 'diseno'] },
			{ nombre: 'comisiones comerciales', tipos: ['comisiones ventas', 'plataformas delivery', 'afiliados'] },
			{ nombre: 'atencion al cliente', tipos: ['cortesias', 'fidelizacion', 'material promocional'] },
			{ nombre: 'ventas en punto', tipos: ['uniformes', 'material pop', 'incentivos'] }
		]
	},
	{
		clase: 'gastos financieros',
		subclases: [
			{ nombre: 'bancarios', tipos: ['cuotas de manejo', 'transferencias', 'datáfono', 'gmf'] },
			{ nombre: 'intereses', tipos: ['creditos', 'mora', 'sobregiros'] },
			{ nombre: 'obligaciones financieras', tipos: ['leasing', 'microcreditos', 'prestamos terceros'] }
		]
	},
	{
		clase: 'gastos no orange',
		subclases: [
			{ nombre: 'hogar', tipos: ['educacion', 'servicios publicos', 'mercado', 'aseo hogar', 'transporte', 'vestuario', 'salud', 'deporte'] }
		]
	}
];

function normalizarTexto(valor) {
	return String(valor || '').trim();
}

function normalizarCatalogo(valor) {
	return normalizarTexto(valor).toLowerCase();
}

function confirmarEliminacion(req) {
	const confirmacion = normalizarTexto(req && req.query && req.query.confirmacion).toUpperCase();
	return confirmacion === 'ELIMINAR';
}

function titleCase(valor) {
	return String(valor || '')
		.split(' ')
		.filter(Boolean)
		.map(fragmento => fragmento.charAt(0).toUpperCase() + fragmento.slice(1))
		.join(' ');
}

function presentarJerarquia(clase, subclase, tipo) {
	return [clase, subclase, tipo]
		.map(titleCase)
		.filter(Boolean)
		.join(' / ');
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

async function asegurarTiposBase() {
	for (const claseItem of CATALOGO_GASTOS_BASE) {
		const clase = normalizarCatalogo(claseItem.clase);
		for (const subclaseItem of claseItem.subclases) {
			const subclase = normalizarCatalogo(subclaseItem.nombre);
			for (const tipoNombre of subclaseItem.tipos) {
				const nombre = normalizarCatalogo(tipoNombre);
				await TipoGastoOrange.updateOne(
					{ clase, subclase, nombre },
					{ $setOnInsert: { clase, subclase, nombre } },
					{ upsert: true }
				);
			}
		}
	}
}

async function obtenerCatalogoTipos() {
	await asegurarTiposBase();
	return await TipoGastoOrange.find({}).sort({ clase: 1, subclase: 1, nombre: 1 });
}

function serializarTipoCatalogo(tipo) {
	const item = tipo && typeof tipo.toObject === 'function' ? tipo.toObject() : tipo;
	return {
		...item,
		clase: normalizarCatalogo(item && item.clase),
		subclase: normalizarCatalogo(item && item.subclase),
		nombre: normalizarCatalogo(item && item.nombre)
	};
}

function serializarGasto(gasto) {
	const item = gasto && typeof gasto.toObject === 'function' ? gasto.toObject() : gasto;
	const tipoGasto = normalizarCatalogo(item && item.tipoGasto);
	const claseGasto = normalizarCatalogo(item && item.claseGasto) || 'sin clasificar';
	const subclaseGasto = normalizarCatalogo(item && item.subclaseGasto) || 'sin subclase';
	return {
		...item,
		claseGasto,
		subclaseGasto,
		tipoGasto,
		categoriaGasto: normalizarTexto(item && item.categoriaGasto) || presentarJerarquia(claseGasto, subclaseGasto, tipoGasto)
	};
}

function armarMetadatosCatalogo(tipos) {
	const clases = Array.from(new Set(tipos.map(tipo => tipo.clase))).sort((a, b) => a.localeCompare(b));
	const subclasesPorClase = clases.reduce((acc, clase) => {
		acc[clase] = tipos
			.filter(tipo => tipo.clase === clase)
			.map(tipo => tipo.subclase)
			.filter((value, index, array) => array.indexOf(value) === index)
			.sort((a, b) => a.localeCompare(b));
		return acc;
	}, {});

	return { clases, subclasesPorClase };
}

async function buscarTipoCatalogo(clase, subclase, nombre) {
	return await TipoGastoOrange.findOne({
		clase: normalizarCatalogo(clase),
		subclase: normalizarCatalogo(subclase),
		nombre: normalizarCatalogo(nombre)
	});
}

async function obtenerCuentaOrangePorId(id) {
	if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
	return await CuentaOrange.findById(id).select('_id idCuenta nombre categoria liquidez');
}

async function validarCuentasAsiento(cuentaDebeId, cuentaHaberId) {
	if (!cuentaDebeId || !cuentaHaberId) {
		return { ok: false, status: 400, message: 'Debe indicar cuentaDebeId y cuentaHaberId' };
	}

	if (String(cuentaDebeId) === String(cuentaHaberId)) {
		return { ok: false, status: 400, message: 'cuentaDebeId y cuentaHaberId deben ser diferentes' };
	}

	const [cuentaDebe, cuentaHaber] = await Promise.all([
		obtenerCuentaOrangePorId(cuentaDebeId),
		obtenerCuentaOrangePorId(cuentaHaberId)
	]);

	if (!cuentaDebe) return { ok: false, status: 400, message: 'La cuentaDebeId no existe en Orange' };
	if (!cuentaHaber) return { ok: false, status: 400, message: 'La cuentaHaberId no existe en Orange' };

	const categoriaDebe = normalizarTexto(cuentaDebe.categoria).toUpperCase();
	if (!categoriaDebe.startsWith('GASTO') && !categoriaDebe.startsWith('COSTO')) {
		return { ok: false, status: 400, message: 'La cuentaDebeId debe ser una cuenta de GASTO o COSTO' };
	}

	const categoriaHaber = normalizarTexto(cuentaHaber.categoria).toUpperCase();
	const esActivoLiquido = categoriaHaber.startsWith('ACTIVO') && !!cuentaHaber.liquidez;
	if (!esActivoLiquido) {
		return { ok: false, status: 400, message: 'La cuentaHaberId debe ser una cuenta de ACTIVO con liquidez' };
	}

	return { ok: true, cuentaDebe, cuentaHaber };
}

var controller = {
	getTiposGastoOrange: async (req, res) => {
		   try {
			   const tipos = (await obtenerCatalogoTipos()).map(serializarTipoCatalogo);
			   return res.status(200).send({ tipos, ...armarMetadatosCatalogo(tipos) });
		   } catch (err) {
			   return res.status(500).send({ message: 'Error al obtener tipos de gasto Orange', error: err.message || err });
		   }
	},

	createTipoGastoOrange: async (req, res) => {
		try {
			const clase = normalizarCatalogo(req.body && req.body.clase);
			const subclase = normalizarCatalogo(req.body && req.body.subclase);
			const nombre = normalizarCatalogo(req.body && req.body.nombre);
			if (!clase || !subclase || !nombre) {
				return res.status(400).send({ message: 'Debes indicar clase, subclase y tipo de gasto' });
			}

			const existente = await TipoGastoOrange.findOne({ clase, subclase, nombre });
			if (existente) {
				return res.status(409).send({ message: 'Ese tipo de gasto ya existe en la subclase seleccionada' });
			}

			const tipo = await TipoGastoOrange.create({ clase, subclase, nombre });
			return res.status(201).send({ tipo: serializarTipoCatalogo(tipo) });
		} catch (err) {
			return res.status(500).send({ message: 'Error al crear tipo de gasto Orange', error: err.message || err });
		}
	},

	deleteTipoGastoOrange: async (req, res) => {
		   try {
			if (!confirmarEliminacion(req)) {
				return res.status(400).send({ message: 'Confirmacion requerida para eliminar. Debe enviar confirmacion=ELIMINAR' });
			}

			const id = req.params.id;
			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id invalido' });
			}

			const tipo = await TipoGastoOrange.findById(id);
			if (!tipo) {
				return res.status(404).send({ message: 'Tipo de gasto no encontrado' });
			}

			const enUso = await GastoOrange.exists({
				claseGasto: normalizarCatalogo(tipo.clase),
				subclaseGasto: normalizarCatalogo(tipo.subclase),
				tipoGasto: normalizarCatalogo(tipo.nombre)
			});
			if (enUso) {
				return res.status(400).send({ message: 'No puedes eliminar un tipo que ya esta asociado a gastos registrados' });
			}


			const totalTipos = await TipoGastoOrange.countDocuments();
			if (totalTipos <= 1) {
				return res.status(400).send({ message: 'Debes mantener al menos un tipo de gasto' });
			}

			await TipoGastoOrange.findByIdAndDelete(id);
			return res.status(200).send({ message: 'Tipo de gasto eliminado' });
		} catch (err) {
			return res.status(500).send({ message: 'Error al eliminar tipo de gasto Orange', error: err.message || err });
		}
	},

	deleteClaseGasto: async (req, res) => {
		try {
			if (!confirmarEliminacion(req)) {
				return res.status(400).send({ message: 'Confirmacion requerida para eliminar. Debe enviar confirmacion=ELIMINAR' });
			}

			const clase = normalizarCatalogo(req.query && req.query.clase);
			if (!clase) {
				return res.status(400).send({ message: 'Debes indicar la clase a eliminar' });
			}

			const enUso = await GastoOrange.exists({ claseGasto: clase });
			if (enUso) {
				return res.status(400).send({ message: 'No puedes eliminar una clase que tiene gastos registrados' });
			}

			const resultado = await TipoGastoOrange.deleteMany({ clase });
			return res.status(200).send({
				message: `Clase "${clase}" eliminada junto con sus tipos`,
				eliminados: resultado.deletedCount
			});
		} catch (err) {
			return res.status(500).send({ message: 'Error al eliminar clase', error: err.message || err });
		}
	},

	deleteSubclaseGasto: async (req, res) => {
		try {
			if (!confirmarEliminacion(req)) {
				return res.status(400).send({ message: 'Confirmacion requerida para eliminar. Debe enviar confirmacion=ELIMINAR' });
			}

			const clase = normalizarCatalogo(req.query && req.query.clase);
			const subclase = normalizarCatalogo(req.query && req.query.subclase);
			if (!clase || !subclase) {
				return res.status(400).send({ message: 'Debes indicar clase y subclase a eliminar' });
			}

			const enUso = await GastoOrange.exists({ claseGasto: clase, subclaseGasto: subclase });
			if (enUso) {
				return res.status(400).send({ message: 'No puedes eliminar una subclase que tiene gastos registrados' });
			}

			const resultado = await TipoGastoOrange.deleteMany({ clase, subclase });
			return res.status(200).send({
				message: `Subclase "${subclase}" de la clase "${clase}" eliminada junto con sus tipos`,
				eliminados: resultado.deletedCount
			});
		} catch (err) {
			return res.status(500).send({ message: 'Error al eliminar subclase', error: err.message || err });
		}
	},

	getGastosOrange: async (req, res) => {
		try {
			await asegurarTiposBase();
			const gastos = await GastoOrange.find({})
				.populate('cuentaDebeId', 'idCuenta nombre categoria liquidez')
				.populate('cuentaHaberId', 'idCuenta nombre categoria liquidez')
				.sort({ fecha: -1 });

			if (!gastos || gastos.length === 0) {
				return res.status(404).send({ message: 'No hay gastos Orange para mostrar' });
			}

			return res.status(200).send({ gastos: gastos.map(serializarGasto) });
		} catch (err) {
			return res.status(500).send({ message: 'Error al obtener gastos Orange', error: err.message || err });
		}
	},

	getGastoOrangeById: async (req, res) => {
		try {
			const id = req.params.id;
			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id invalido' });
			}

			const gasto = await GastoOrange.findById(id)
				.populate('cuentaDebeId', 'idCuenta nombre categoria liquidez')
				.populate('cuentaHaberId', 'idCuenta nombre categoria liquidez');

			if (!gasto) {
				return res.status(404).send({ message: 'Gasto Orange no encontrado' });
			}

			return res.status(200).send({ gasto: serializarGasto(gasto) });
		} catch (err) {
			return res.status(500).send({ message: 'Error al obtener gasto Orange', error: err.message || err });
		}
	},

	getResumenGastosOrange: async (req, res) => {
		try {
			await asegurarTiposBase();
			const resumenGlobal = await GastoOrange.aggregate([
				{
					$group: {
						_id: null,
						totalGastos: { $sum: 1 },
						montoTotal: { $sum: '$monto' }
					}
				}
			]);

			const porClase = await GastoOrange.aggregate([
				{
					$project: {
						claseGasto: { $ifNull: ['$claseGasto', 'sin clasificar'] },
						monto: '$monto'
					}
				},
				{
					$group: {
						_id: '$claseGasto',
						cantidad: { $sum: 1 },
						total: { $sum: '$monto' }
					}
				},
				{ $sort: { total: -1 } }
			]);

			const porTipo = await GastoOrange.aggregate([
				{
					$project: {
						claseGasto: { $ifNull: ['$claseGasto', 'sin clasificar'] },
						subclaseGasto: { $ifNull: ['$subclaseGasto', 'sin subclase'] },
						tipoGasto: { $ifNull: ['$tipoGasto', 'sin tipo'] },
						monto: '$monto'
					}
				},
				{
					$group: {
						_id: {
							claseGasto: '$claseGasto',
							subclaseGasto: '$subclaseGasto',
							tipoGasto: '$tipoGasto'
						},
						cantidad: { $sum: 1 },
						total: { $sum: '$monto' }
					}
				},
				{ $sort: { total: -1 } }
			]);

			return res.status(200).send({
				resumen: resumenGlobal[0] || { totalGastos: 0, montoTotal: 0 },
				porClase: porClase || [],
				porTipo: porTipo || []
			});
		} catch (err) {
			return res.status(500).send({ message: 'Error al obtener resumen de gastos Orange', error: err.message || err });
		}
	},

	createGastoOrange: async (req, res) => {
		try {
			await asegurarTiposBase();
			const params = req.body || {};
			const monto = Number(params.monto || 0);
			const claseGasto = normalizarCatalogo(params.claseGasto);
			const subclaseGasto = normalizarCatalogo(params.subclaseGasto);
			const tipoGasto = normalizarCatalogo(params.tipoGasto);
			const descripcion = normalizarTexto(params.descripcion);
			const fecha = params.fecha ? normalizarFecha(params.fecha) : new Date();

			if (!(monto > 0) || !claseGasto || !subclaseGasto || !tipoGasto || !descripcion) {
				return res.status(400).send({ message: 'Campos requeridos incompletos' });
			}

			if (params.fecha && !fecha) {
				return res.status(400).send({ message: 'fecha invalida. Usa formato YYYY-MM-DD' });
			}

			const tipoExiste = await buscarTipoCatalogo(claseGasto, subclaseGasto, tipoGasto);
			if (!tipoExiste) {
				return res.status(400).send({ message: 'La combinacion clase / subclase / tipo no existe en el catalogo' });
			}

			const validacionCuentas = await validarCuentasAsiento(params.cuentaDebeId, params.cuentaHaberId);
			if (!validacionCuentas.ok) {
				return res.status(validacionCuentas.status).send({ message: validacionCuentas.message });
			}

			const gasto = new GastoOrange({
				fecha,
				monto,
				claseGasto,
				subclaseGasto,
				tipoGasto,
				categoriaGasto: normalizarTexto(params.categoriaGasto) || presentarJerarquia(claseGasto, subclaseGasto, tipoGasto),
				descripcion,
				observaciones: normalizarTexto(params.observaciones),
				cuentaDebeId: params.cuentaDebeId,
				cuentaHaberId: params.cuentaHaberId
			});

			const gastoStored = await gasto.save();

			const gastoPopulado = await GastoOrange.findById(gastoStored._id)
				.populate('cuentaDebeId', 'idCuenta nombre categoria liquidez')
				.populate('cuentaHaberId', 'idCuenta nombre categoria liquidez');

			return res.status(201).send({ gasto: serializarGasto(gastoPopulado) });
		} catch (err) {
			return res.status(500).send({ message: 'Error al crear gasto Orange', error: err.message || err });
		}
	},

	updateGastoOrange: async (req, res) => {
		try {
			await asegurarTiposBase();
			const id = req.params.id;
			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id invalido' });
			}

			const params = req.body || {};
			const monto = Number(params.monto || 0);
			const claseGasto = normalizarCatalogo(params.claseGasto);
			const subclaseGasto = normalizarCatalogo(params.subclaseGasto);
			const tipoGasto = normalizarCatalogo(params.tipoGasto);
			const descripcion = normalizarTexto(params.descripcion);
			const fecha = params.fecha ? normalizarFecha(params.fecha) : new Date();

			if (!(monto > 0) || !claseGasto || !subclaseGasto || !tipoGasto || !descripcion) {
				return res.status(400).send({ message: 'Campos requeridos incompletos' });
			}

			if (params.fecha && !fecha) {
				return res.status(400).send({ message: 'fecha invalida. Usa formato YYYY-MM-DD' });
			}

			const tipoExiste = await buscarTipoCatalogo(claseGasto, subclaseGasto, tipoGasto);
			if (!tipoExiste) {
				return res.status(400).send({ message: 'La combinacion clase / subclase / tipo no existe en el catalogo' });
			}

			const validacionCuentas = await validarCuentasAsiento(params.cuentaDebeId, params.cuentaHaberId);
			if (!validacionCuentas.ok) {
				return res.status(validacionCuentas.status).send({ message: validacionCuentas.message });
			}

			const gastoActualizado = await GastoOrange.findByIdAndUpdate(
				id,
				{
					fecha,
					monto,
					claseGasto,
					subclaseGasto,
					tipoGasto,
					categoriaGasto: normalizarTexto(params.categoriaGasto) || presentarJerarquia(claseGasto, subclaseGasto, tipoGasto),
					descripcion,
					observaciones: normalizarTexto(params.observaciones),
					cuentaDebeId: params.cuentaDebeId,
					cuentaHaberId: params.cuentaHaberId
				},
				{ returnDocument: 'after' }
			)
				.populate('cuentaDebeId', 'idCuenta nombre categoria liquidez')
				.populate('cuentaHaberId', 'idCuenta nombre categoria liquidez');

			if (!gastoActualizado) {
				return res.status(404).send({ message: 'Gasto Orange no encontrado' });
			}

			return res.status(200).send({ gasto: serializarGasto(gastoActualizado) });
		} catch (err) {
			return res.status(500).send({ message: 'Error al actualizar gasto Orange', error: err.message || err });
		}
	},

	deleteGastoOrange: async (req, res) => {
		try {
			if (!confirmarEliminacion(req)) {
				return res.status(400).send({ message: 'Confirmacion requerida para eliminar. Debe enviar confirmacion=ELIMINAR' });
			}

			const id = req.params.id;
			if (!id || !mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).send({ message: 'Id invalido' });
			}

			const gastoEliminado = await GastoOrange.findByIdAndDelete(id);
			if (!gastoEliminado) {
				return res.status(404).send({ message: 'Gasto Orange no encontrado' });
			}

			return res.status(200).send({ message: 'Gasto Orange eliminado' });
		} catch (err) {
			return res.status(500).send({ message: 'Error al eliminar gasto Orange', error: err.message || err });
		}
	}
};

module.exports = controller;
