'use strict'

var CuentaOrange = require('../modules/module-cuentasOrange');
var MovimientoOrange = require('../modules/module-movimientosOrange');

const CATEGORIA_PREFIJOS = {
	'Activo Corriente': 'O1.1',
	'Activo No Corriente': 'O1.2',
	'Pasivo Corriente': 'O2.1',
	'Pasivo No Corriente': 'O2.2',
	'Patrimonio': 'O3.0',
	'Ingresos Operacionales': 'O4.1',
	'Otros Ingresos': 'O4.2',
	'Costos de Ventas': 'O5.1',
	'Gastos Operacionales': 'O5.2',
	'Gastos No Operacionales': 'O5.3'
};

async function generarIdCuenta(categoria) {
	const prefijo = CATEGORIA_PREFIJOS[categoria];
	if (!prefijo) throw new Error(`Categoria no reconocida: ${categoria}`);

	const prefijoRegex = prefijo.replace(/\./g, '\\.')
	const cuentas = await CuentaOrange.find({
		idCuenta: { $regex: `^${prefijoRegex}\\.` }
	}).select('idCuenta');

	let siguiente = 1;
	if (cuentas.length > 0) {
		const secuencias = cuentas.map(c => {
			const partes = String(c.idCuenta || '').split('.');
			return parseInt(partes[partes.length - 1], 10) || 0;
		});
		siguiente = Math.max(...secuencias) + 1;
	}

	return `${prefijo}.${String(siguiente).padStart(3, '0')}`;
}

async function obtenerSaldosCuentasOrange(cuentaIds) {
	if (!cuentaIds || cuentaIds.length === 0) {
		return new Map();
	}

	const saldos = await MovimientoOrange.aggregate([
		{ $match: { cuentaId: { $in: cuentaIds } } },
		{
			$group: {
				_id: '$cuentaId',
				saldo: {
					$sum: {
						$subtract: [
							{ $ifNull: ['$debe', 0] },
							{ $ifNull: ['$haber', 0] }
						]
					}
				}
			}
		}
	]);

	const mapa = new Map();
	for (const item of saldos) {
		mapa.set(String(item._id), Number(item.saldo || 0));
	}

	return mapa;
}

var controller = {

	getCuentasOrange: async (req, res) => {
		try {
			const cuentas = await CuentaOrange.find({}).sort({ idCuenta: 1 });
			if (!cuentas || cuentas.length === 0) {
				return res.status(404).send({ message: 'No hay cuentas Orange para mostrar' });
			}

			const saldosPorCuenta = await obtenerSaldosCuentasOrange(cuentas.map(cuenta => cuenta._id));

			const cuentasConSaldo = cuentas.map(cuenta => {
				const cuentaObj = cuenta.toObject();
				cuentaObj.saldo = Number(saldosPorCuenta.get(String(cuenta._id)) || 0);
				return cuentaObj;
			});

			return res.status(200).send({ cuentas: cuentasConSaldo });
		} catch (err) {
			return res.status(500).send({ message: 'Error al obtener cuentas Orange', error: err.message || err });
		}
	},

	createCuentaOrange: async (req, res) => {
		try {
			const { nombre, descripcion, categoria, liquidez } = req.body || {};

			if (!nombre || !String(nombre).trim()) {
				return res.status(400).send({ message: 'El nombre de la cuenta es obligatorio' });
			}

			if (!categoria || !CATEGORIA_PREFIJOS[categoria]) {
				return res.status(400).send({ message: 'Categoria no valida' });
			}

			const idCuenta = await generarIdCuenta(categoria);

			const cuenta = new CuentaOrange({
				idCuenta,
				nombre: String(nombre).trim(),
				descripcion: descripcion ? String(descripcion).trim() : '',
				categoria,
				liquidez: liquidez === true
			});

			const cuentaStored = await cuenta.save();
			const cuentaConSaldo = cuentaStored.toObject();
			cuentaConSaldo.saldo = 0;

			return res.status(200).send({ cuenta: cuentaConSaldo });
		} catch (err) {
			return res.status(500).send({ message: 'Error al crear la cuenta Orange', error: err.message || err });
		}
	},

	updateCuentaOrange: async (req, res) => {
		try {
			const { id } = req.params;
			const { nombre, descripcion, categoria, liquidez } = req.body || {};

			const cuenta = await CuentaOrange.findById(id);
			if (!cuenta) {
				return res.status(404).send({ message: 'Cuenta no encontrada' });
			}

			const categoriaLimpia = categoria ? String(categoria).trim() : cuenta.categoria;
			if (!CATEGORIA_PREFIJOS[categoriaLimpia]) {
				return res.status(400).send({ message: 'Categoria no valida' });
			}

			const updateData = {
				nombre: nombre ? String(nombre).trim() : cuenta.nombre,
				descripcion: descripcion ? String(descripcion).trim() : '',
				categoria: categoriaLimpia,
				liquidez: liquidez === true
			};

			if (categoriaLimpia !== cuenta.categoria) {
				updateData.idCuenta = await generarIdCuenta(categoriaLimpia);
			}

			const cuentaUpdated = await CuentaOrange.findOneAndUpdate(
				{ _id: id },
				{ $set: updateData },
				{ returnDocument: 'after' }
			);

			if (!cuentaUpdated) {
				return res.status(404).send({ message: 'Cuenta no encontrada' });
			}

			const cuentaObj = cuentaUpdated.toObject();
			const saldosPorCuenta = await obtenerSaldosCuentasOrange([cuentaUpdated._id]);
			cuentaObj.saldo = Number(saldosPorCuenta.get(String(cuentaUpdated._id)) || 0);
			return res.status(200).send({ cuenta: cuentaObj });
		} catch (err) {
			return res.status(500).send({ message: 'Error al actualizar la cuenta Orange', error: err.message || err });
		}
	},

	deleteCuentaOrange: async (req, res) => {
		try {
			const { id } = req.params;
			const { confirmacion } = req.body || {};

			const cuenta = await CuentaOrange.findById(id);
			if (!cuenta) {
				return res.status(404).send({ message: 'Cuenta no encontrada' });
			}

			const confirmacionEsperada = `ELIMINAR ${cuenta.idCuenta}`;
			if (confirmacion !== confirmacionEsperada) {
				return res.status(400).send({
					message: `Confirmacion invalida. Escribe exactamente: ${confirmacionEsperada}`
				});
			}

			await CuentaOrange.findByIdAndDelete(id);
			return res.status(200).send({ message: 'Cuenta eliminada correctamente' });
		} catch (err) {
			return res.status(500).send({ message: 'Error al eliminar la cuenta Orange', error: err.message || err });
		}
	}

};

module.exports = controller;
