'use strict'

var CuentaOrange = require('../modules/module-cuentasOrange');
var MovimientoOrange = require('../modules/module-movimientosOrange');
var CierreOrange = require('../modules/module-cierresOrange');
var GastoOrange = require('../modules/module-gastosOrange');
var RetiroOrange = require('../modules/module-retirosOrange');
var DeudaProveedorOrange = require('../modules/module-deudasOrange');

function toNumber(value) {
	const num = Number(value);
	return isNaN(num) ? 0 : num;
}

function normalizarTexto(value) {
	return String(value || '').trim().toLowerCase();
}

function tipoCuentaOrange(cuenta) {
	const idCuenta = String(cuenta && cuenta.idCuenta || '').trim().toUpperCase();
	const categoria = normalizarTexto(cuenta && cuenta.categoria);

	if (idCuenta.startsWith('O1')) return 'activo';
	if (idCuenta.startsWith('O2')) return 'pasivo';
	if (idCuenta.startsWith('O3')) return 'patrimonio';
	if (idCuenta.startsWith('O4')) return 'ingreso';
	if (idCuenta.startsWith('O5')) return 'gasto';

	if (categoria.includes('activo')) return 'activo';
	if (categoria.includes('pasivo')) return 'pasivo';
	if (categoria.includes('patrimonio')) return 'patrimonio';
	if (categoria.includes('ingreso')) return 'ingreso';
	if (categoria.includes('gasto') || categoria.includes('costo')) return 'gasto';

	return 'otro';
}

function getInicioMesActual() {
	const hoy = new Date();
	return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
}

function getFinMesActual() {
	const hoy = new Date();
	return new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
}

function serializarCierre(c) {
	if (!c) return null;
	return {
		fecha: c.fecha,
		baseInicial: toNumber(c.baseInicial),
		totalVentas: toNumber(c.totalVentas),
		totalGastos: toNumber(c.totalGastos),
		retiroEfectivo: toNumber(c.retiroEfectivo),
		retiroTransferencias: toNumber(c.retiroTransferencias),
		efectivoReal: toNumber(c.efectivoReal),
		efectivoTeorico: toNumber(c.efectivoTeorico),
		diferencia: toNumber(c.diferencia),
		baseSigDia: toNumber(c.baseSigDia),
		ventaTotalMesas: toNumber(c.ventaTotalMesas),
		ventaTotalDomicilio: toNumber(c.ventaTotalDomicilio),
		ventaTotalLlevar: toNumber(c.ventaTotalLlevar)
	};
}

var controller = {
	getDashboardOrange: async (req, res) => {
		try {
			const inicioMes = getInicioMesActual();
			const finMes = getFinMesActual();

			const [
				cuentas,
				movimientos,
				cierresRecientes,
				totalCierresCount,
				cierresMesAgg,
				gastosPorClaseAgg,
				retirosMesAgg,
				resumenDeudaAgg
			] = await Promise.all([
				CuentaOrange.find({}).sort({ idCuenta: 1 }),
				MovimientoOrange.find({})
					.populate('cuentaId', 'idCuenta nombre categoria liquidez')
					.sort({ fecha: -1, _id: -1 }),
				CierreOrange.find({}).sort({ fecha: -1 }).limit(10),
				CierreOrange.countDocuments({}),
				CierreOrange.aggregate([
					{ $match: { fecha: { $gte: inicioMes, $lt: finMes } } },
					{
						$group: {
							_id: null,
							totalVentasMes: { $sum: '$totalVentas' },
							totalGastosMes: { $sum: '$totalGastos' },
							totalMesasMes: { $sum: '$ventaTotalMesas' },
							totalDomicilioMes: { $sum: '$ventaTotalDomicilio' },
							totalLlevarMes: { $sum: '$ventaTotalLlevar' },
							totalRetiroEfectivoMes: { $sum: '$retiroEfectivo' },
							totalRetiroTransferenciasMes: { $sum: '$retiroTransferencias' },
							cantidadCierresMes: { $sum: 1 }
						}
					}
				]),
				GastoOrange.aggregate([
					{ $match: { fecha: { $gte: inicioMes, $lt: finMes } } },
					{
						$group: {
							_id: '$claseGasto',
							total: { $sum: '$monto' },
							cantidad: { $sum: 1 }
						}
					},
					{ $sort: { total: -1 } },
					{ $limit: 8 }
				]),
				RetiroOrange.aggregate([
					{ $match: { fecha: { $gte: inicioMes, $lt: finMes } } },
					{
						$group: {
							_id: null,
							totalRetirosMes: { $sum: '$monto' },
							cantidadRetirosMes: { $sum: 1 }
						}
					}
				]),
				DeudaProveedorOrange.aggregate([
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
				])
			]);

			const resMes = cierresMesAgg[0] || {};
			const resRetiros = retirosMesAgg[0] || {};
			const resDeuda = resumenDeudaAgg[0] || {};

			// ── Ecuacion contable desde movimientos ────────────────────────────
			let totalDebe = 0;
			let totalHaber = 0;
			let activos = 0;
			let activosCorrientes = 0;
			let pasivos = 0;
			let patrimonio = 0;
			let ingresos = 0;
			let gastos = 0;

			const saldoCuentaMap = {};
			const asientosManuales = new Set();

			const cuentasPorId = cuentas.reduce((acc, c) => {
				acc[String(c._id)] = c;
				return acc;
			}, {});

			for (const mov of movimientos) {
				const debe = toNumber(mov && mov.debe);
				const haber = toNumber(mov && mov.haber);
				totalDebe += debe;
				totalHaber += haber;

				const cuentaId = String(mov && mov.cuentaId && mov.cuentaId._id || mov && mov.cuentaId || '');
				const cuenta = (mov && mov.cuentaId && mov.cuentaId._id)
					? mov.cuentaId
					: cuentasPorId[cuentaId];

				if (cuentaId) {
					saldoCuentaMap[cuentaId] = toNumber(saldoCuentaMap[cuentaId]) + (debe - haber);
				}

				if (cuenta) {
					const tipo = tipoCuentaOrange(cuenta);
					const saldoMov = debe - haber;
					if (tipo === 'activo') {
						activos += saldoMov;
						if (cuenta.liquidez) activosCorrientes += saldoMov;
					} else if (tipo === 'pasivo') {
						pasivos += haber - debe;
					} else if (tipo === 'patrimonio') {
						patrimonio += haber - debe;
					} else if (tipo === 'ingreso') {
						ingresos += haber - debe;
					} else if (tipo === 'gasto') {
						gastos += debe - haber;
					}
				}

				if (normalizarTexto(mov && mov.origenModelo) === 'manual') {
					const idOrigen = String(mov && mov._idOrigen || mov && mov._id || '');
					if (idOrigen) asientosManuales.add(idOrigen);
				}
			}

			const ladoDerecho = pasivos + patrimonio + ingresos - gastos;
			const diferenciaEcuacion = activos - ladoDerecho;

			// ── Movimientos recientes ────────────────────────────────────────
			const movimientosRecientes = movimientos.slice(0, 12).map(mov => ({
				id: String(mov && mov._id || ''),
				fecha: mov && mov.fecha || null,
				descripcion: String(mov && mov.descripcion || ''),
				origenModelo: String(mov && mov.origenModelo || ''),
				cuenta: {
					idCuenta: String(mov && mov.cuentaId && mov.cuentaId.idCuenta || ''),
					nombre: String(mov && mov.cuentaId && mov.cuentaId.nombre || '')
				},
				debe: Number(toNumber(mov && mov.debe).toFixed(2)),
				haber: Number(toNumber(mov && mov.haber).toFixed(2))
			}));

			const ultimoCierre = cierresRecientes[0] || null;

			return res.status(200).send({
				kpis: {
					totalCuentas: cuentas.length,
					totalMovimientos: movimientos.length,
					totalAsientosManuales: asientosManuales.size,
					totalCierres: totalCierresCount,
					totalDeudaPendiente: Number(toNumber(resDeuda.totalPendiente).toFixed(2)),
					totalProveedoresDeuda: toNumber(resDeuda.totalProveedores),
					activosCorrientes: Number(activosCorrientes.toFixed(2))
				},
				balance: {
					totalDebe: Number(totalDebe.toFixed(2)),
					totalHaber: Number(totalHaber.toFixed(2)),
					diferencia: Number((totalDebe - totalHaber).toFixed(2))
				},
				ecuacionContable: {
					activos: Number(activos.toFixed(2)),
					activosCorrientes: Number(activosCorrientes.toFixed(2)),
					pasivos: Number(pasivos.toFixed(2)),
					patrimonio: Number(patrimonio.toFixed(2)),
					ingresos: Number(ingresos.toFixed(2)),
					gastos: Number(gastos.toFixed(2)),
					ladoDerecho: Number(ladoDerecho.toFixed(2)),
					diferencia: Number(diferenciaEcuacion.toFixed(2))
				},
				resumenVentasMes: {
					totalVentas: Number(toNumber(resMes.totalVentasMes).toFixed(2)),
					totalGastos: Number(toNumber(resMes.totalGastosMes).toFixed(2)),
					totalMesas: Number(toNumber(resMes.totalMesasMes).toFixed(2)),
					totalDomicilio: Number(toNumber(resMes.totalDomicilioMes).toFixed(2)),
					totalLlevar: Number(toNumber(resMes.totalLlevarMes).toFixed(2)),
					totalRetiroEfectivo: Number(toNumber(resMes.totalRetiroEfectivoMes).toFixed(2)),
					totalRetiroTransferencias: Number(toNumber(resMes.totalRetiroTransferenciasMes).toFixed(2)),
					cantidadCierres: toNumber(resMes.cantidadCierresMes)
				},
				gastosPorClaseMes: gastosPorClaseAgg.map(g => ({
					clase: String(g._id || 'sin clase'),
					total: Number(toNumber(g.total).toFixed(2)),
					cantidad: toNumber(g.cantidad)
				})),
				retirosMes: {
					total: Number(toNumber(resRetiros.totalRetirosMes).toFixed(2)),
					cantidad: toNumber(resRetiros.cantidadRetirosMes)
				},
				deuda: {
					totalProveedores: toNumber(resDeuda.totalProveedores),
					totalFacturas: toNumber(resDeuda.totalFacturas),
					totalDeuda: Number(toNumber(resDeuda.totalDeuda).toFixed(2)),
					totalAbonado: Number(toNumber(resDeuda.totalAbonado).toFixed(2)),
					totalPendiente: Number(toNumber(resDeuda.totalPendiente).toFixed(2))
				},
				ultimoCierre: serializarCierre(ultimoCierre),
				cierresRecientes: cierresRecientes.map(c => ({
					fecha: c.fecha,
					totalVentas: toNumber(c.totalVentas),
					totalGastos: toNumber(c.totalGastos),
					diferencia: toNumber(c.diferencia),
					baseSigDia: toNumber(c.baseSigDia)
				})),
				movimientosRecientes
			});
		} catch (err) {
			return res.status(500).send({ message: 'Error al obtener dashboard Orange', error: err.message || err });
		}
	}
};

module.exports = controller;
