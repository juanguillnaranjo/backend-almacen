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

		if (!numeroFactura) {
			return { ok: false, message: `numeroFactura es obligatorio en facturasContado[${i}]` };
		}

		if (monto === null || monto <= 0) {
			return { ok: false, message: `monto invalido en facturasContado[${i}]` };
		}

		resultado.push({
			numeroFactura,
			proveedor: normalizarTexto(item.proveedor),
			descripcion: normalizarTexto(item.descripcion),
			monto
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

		if (!concepto) {
			return { ok: false, message: `concepto es obligatorio en viaticos[${i}]` };
		}

		if (monto === null || monto <= 0) {
			return { ok: false, message: `monto invalido en viaticos[${i}]` };
		}

		resultado.push({
			concepto,
			descripcion: normalizarTexto(item.descripcion),
			monto
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

function construirMovimientosProcesoSurtido(proceso, cuentaSalidaCanonica, cuentasPorNombre) {
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

	const alternas = ALTERNAS_CUENTAS_SALIDA[cuentaSalidaCanonica] || [];
	const cuentaSalida = resolverCuenta(cuentasPorNombre, cuentaSalidaCanonica, alternas);
	if (!cuentaSalida) {
		throw new Error('No se encontro la cuenta contable de salida: ' + cuentaSalidaCanonica);
	}

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

	if (totalFacturas > 0) {
		const descripcionFacturas = 'Proceso surtido facturas ' + fechaStr;

		movimientos.push({
			cuentaId: cuentaCompras._id,
			origenModelo: ORIGEN_MODELO_PROCESO_SURTIDO,
			_idOrigen: proceso._id,
			debe: totalFacturas,
			haber: 0,
			descripcion: descripcionFacturas,
			fecha: proceso.fecha
		});

		movimientos.push({
			cuentaId: cuentaSalida._id,
			origenModelo: ORIGEN_MODELO_PROCESO_SURTIDO,
			_idOrigen: proceso._id,
			debe: 0,
			haber: totalFacturas,
			descripcion: descripcionFacturas,
			fecha: proceso.fecha
		});
	}

	if (totalViaticos > 0) {
		const descripcionViaticos = 'Proceso surtido viaticos ' + fechaStr;

		movimientos.push({
			cuentaId: cuentaViaticosSurtido._id,
			origenModelo: ORIGEN_MODELO_PROCESO_SURTIDO,
			_idOrigen: proceso._id,
			debe: totalViaticos,
			haber: 0,
			descripcion: descripcionViaticos,
			fecha: proceso.fecha
		});

		movimientos.push({
			cuentaId: cuentaSalida._id,
			origenModelo: ORIGEN_MODELO_PROCESO_SURTIDO,
			_idOrigen: proceso._id,
			debe: 0,
			haber: totalViaticos,
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

var controller = {
	getProcesosSurtido: async (req, res) => {
		try {
			const procesos = await ProcesoSurtido.find({}).sort({ fecha: -1 });
			if (!procesos || procesos.length === 0) {
				return res.status(404).send({ message: 'No hay procesos de surtido para mostrar' });
			}
			return res.status(200).send({ procesos });
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

			return res.status(200).send({ proceso });
		} catch (err) {
			return res.status(500).send({ message: 'Error al buscar proceso de surtido por fecha', error: err });
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

			const cuentaSalidaCanonica = validarCuentaSalida(params.cuentaSalida);
			if (!cuentaSalidaCanonica) {
				return res.status(400).send({ message: 'Debes seleccionar la cuenta de salida. Opciones: ' + CUENTAS_SALIDA_VALIDAS.join(', ') });
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
				fecha,
				facturasContado: facturasNormalizadas.data,
				viaticos: viaticosNormalizados.data,
				totalFacturas: totales.totalFacturas,
				totalViaticos: totales.totalViaticos,
				totalProceso: totales.totalProceso,
				observaciones: normalizarTexto(params.observaciones),
				cuentaSalida: cuentaSalidaCanonica,
				origen: normalizarTexto(params.origen) || 'manual'
			};

			const procesoStored = await ProcesoSurtido.findOneAndUpdate(
				isEdicionPorId ? { _id: idProceso } : { fecha },
				{ $set: updateData },
				{ returnDocument: 'after', upsert: !isEdicionPorId, setDefaultsOnInsert: true }
			);

			const cuentas = await Cuenta.find({});
			const cuentasPorNombre = mapearCuentasPorNombre(cuentas);
			const movimientos = construirMovimientosProcesoSurtido(procesoStored, cuentaSalidaCanonica, cuentasPorNombre);

			// Borrar movimientos previos usando los dos posibles _id:
			// el del proceso existente (si habia uno) y el del proceso guardado
			const idsALimpiar = [];
			if (procesoExistente?._id) idsALimpiar.push(procesoExistente._id);
			if (!idsALimpiar.some(id => id.equals(procesoStored._id))) {
				idsALimpiar.push(procesoStored._id);
			}
			await Movimiento.deleteMany({ origenModelo: ORIGEN_MODELO_PROCESO_SURTIDO, _idOrigen: { $in: idsALimpiar } });

			if (movimientos.length > 0) {
				await Movimiento.insertMany(movimientos);
			}

			return res.status(200).send({ proceso: procesoStored });
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
