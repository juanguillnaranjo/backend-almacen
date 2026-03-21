'use strict'

var CuentaMia = require('../modules/module-cuentasMias');
var MovimientoMio = require('../modules/module-movimientoMios');
var DeudaMia = require('../modules/module-deudasMias');

function toNumber(value) {
	const num = Number(value);
	return isNaN(num) ? 0 : num;
}

function normalizarTexto(value) {
	return String(value || '').trim().toLowerCase();
}

function tipoCuentaDesdeCuenta(cuenta) {
	const idCuenta = String(cuenta?.idCuenta || '').trim().toUpperCase();
	const categoria = normalizarTexto(cuenta?.categoria);

	if (idCuenta.startsWith('P1')) return 'activo';
	if (idCuenta.startsWith('P2')) return 'pasivo';
	if (idCuenta.startsWith('P3')) return 'patrimonio';
	if (idCuenta.startsWith('P4')) return 'ingreso';
	if (idCuenta.startsWith('P5') || idCuenta.startsWith('P6') || idCuenta.startsWith('P7')) return 'gasto';

	if (categoria.includes('activo')) return 'activo';
	if (categoria.includes('pasivo')) return 'pasivo';
	if (categoria.includes('patrimonio')) return 'patrimonio';
	if (categoria.includes('ingreso')) return 'ingreso';
	if (categoria.includes('gasto') || categoria.includes('costo')) return 'gasto';

	return 'otro';
}

function etiquetaTipoCuenta(tipo) {
	if (tipo === 'activo') return 'Activos';
	if (tipo === 'pasivo') return 'Pasivos';
	if (tipo === 'patrimonio') return 'Patrimonio';
	if (tipo === 'ingreso') return 'Ingresos';
	if (tipo === 'gasto') return 'Gastos';
	return 'Otros';
}

function getUltimosMeses(cantidad) {
	const meses = [];
	const base = new Date();
	base.setHours(12, 0, 0, 0);
	base.setDate(1);

	for (let i = cantidad - 1; i >= 0; i--) {
		const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
		const label = d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
		meses.push({ key, label });
	}

	return meses;
}

var controller = {
	getDashboardPersonal: async (req, res) => {
		try {
			const [cuentas, movimientos, resumenDeudaAgg] = await Promise.all([
				CuentaMia.find({}).sort({ idCuenta: 1 }),
				MovimientoMio.find({})
					.populate('cuentaId', 'idCuenta nombre categoria')
					.sort({ fecha: -1, _id: -1 }),
				DeudaMia.aggregate([
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

			const resumenDeuda = resumenDeudaAgg[0] || {
				totalProveedores: 0,
				totalFacturas: 0,
				totalDeuda: 0,
				totalAbonado: 0,
				totalPendiente: 0
			};

			const cuentasPorId = cuentas.reduce((acc, cuenta) => {
				acc[String(cuenta._id)] = cuenta;
				return acc;
			}, {});

			let totalDebe = 0;
			let totalHaber = 0;
			let activos = 0;
			let pasivos = 0;
			let patrimonio = 0;
			let ingresos = 0;
			let gastos = 0;

			const saldoCuentaMap = {};
			const origenesMap = {};
			const asientosManuales = new Set();

			for (const mov of movimientos) {
				const debe = toNumber(mov?.debe ?? mov?.debito);
				const haber = toNumber(mov?.haber ?? mov?.credito);
				totalDebe += debe;
				totalHaber += haber;

				const cuentaId = String(mov?.cuentaId?._id || mov?.cuentaId || '');
				const cuenta = mov?.cuentaId?._id ? mov.cuentaId : cuentasPorId[cuentaId];
				if (cuentaId) {
					saldoCuentaMap[cuentaId] = toNumber(saldoCuentaMap[cuentaId]) + (debe - haber);
				}

				if (cuenta) {
					const tipoCuenta = tipoCuentaDesdeCuenta(cuenta);
					if (tipoCuenta === 'activo') activos += debe - haber;
					else if (tipoCuenta === 'pasivo') pasivos += haber - debe;
					else if (tipoCuenta === 'patrimonio') patrimonio += haber - debe;
					else if (tipoCuenta === 'ingreso') ingresos += haber - debe;
					else if (tipoCuenta === 'gasto') gastos += debe - haber;
				}

				const origen = normalizarTexto(mov?.origenModelo) || 'sin-origen';
				origenesMap[origen] = toNumber(origenesMap[origen]) + 1;

				if (origen === 'manual') {
					const idOrigen = String(mov?._idOrigen || mov?._id || '');
					if (idOrigen) asientosManuales.add(idOrigen);
				}
			}

			const cuentasPorCategoriaMap = {};
			for (const cuenta of cuentas) {
				const tipo = tipoCuentaDesdeCuenta(cuenta);
				const etiqueta = etiquetaTipoCuenta(tipo);
				cuentasPorCategoriaMap[etiqueta] = toNumber(cuentasPorCategoriaMap[etiqueta]) + 1;
			}

			const saldosPorCategoria = {
				Activos: Number(activos.toFixed(2)),
				Pasivos: Number(pasivos.toFixed(2)),
				Patrimonio: Number(patrimonio.toFixed(2)),
				Ingresos: Number(ingresos.toFixed(2)),
				Gastos: Number(gastos.toFixed(2))
			};

			const topCuentasSaldo = cuentas
				.map(cuenta => {
					const id = String(cuenta?._id || '');
					const saldo = toNumber(saldoCuentaMap[id]);
					return {
						id: id,
						idCuenta: String(cuenta?.idCuenta || ''),
						nombre: String(cuenta?.nombre || ''),
						categoria: String(cuenta?.categoria || ''),
						saldo: Number(saldo.toFixed(2))
					};
				})
				.sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo))
				.slice(0, 8);

			const topOrigenes = Object.entries(origenesMap)
				.map(([origen, cantidad]) => ({ origen, cantidad: Number(cantidad) }))
				.sort((a, b) => b.cantidad - a.cantidad)
				.slice(0, 8);

			const movimientosRecientes = movimientos.slice(0, 12).map(mov => {
				const debe = toNumber(mov?.debe ?? mov?.debito);
				const haber = toNumber(mov?.haber ?? mov?.credito);
				return {
					id: String(mov?._id || ''),
					fecha: mov?.fecha || null,
					descripcion: String(mov?.descripcion || ''),
					origenModelo: String(mov?.origenModelo || ''),
					cuentaId: String(mov?.cuentaId?._id || mov?.cuentaId || ''),
					cuenta: {
						idCuenta: String(mov?.cuentaId?.idCuenta || ''),
						nombre: String(mov?.cuentaId?.nombre || '')
					},
					debe: Number(debe.toFixed(2)),
					haber: Number(haber.toFixed(2))
				};
			});

			const meses = getUltimosMeses(6);
			const tendenciaMap = meses.reduce((acc, item) => {
				acc[item.key] = { key: item.key, label: item.label, ingresos: 0, gastos: 0 };
				return acc;
			}, {});

			for (const mov of movimientos) {
				const fecha = mov?.fecha ? new Date(mov.fecha) : null;
				if (!fecha || isNaN(fecha.getTime())) continue;

				const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
				if (!tendenciaMap[key]) continue;

				const cuenta = mov?.cuentaId;
				const tipo = tipoCuentaDesdeCuenta(cuenta);
				const debe = toNumber(mov?.debe ?? mov?.debito);
				const haber = toNumber(mov?.haber ?? mov?.credito);

				if (tipo === 'ingreso') {
					tendenciaMap[key].ingresos += (haber - debe);
				} else if (tipo === 'gasto') {
					tendenciaMap[key].gastos += (debe - haber);
				}
			}

			const tendenciaMensual = meses.map(item => {
				const row = tendenciaMap[item.key];
				return {
					label: item.label,
					ingresos: Number(toNumber(row?.ingresos).toFixed(2)),
					gastos: Number(toNumber(row?.gastos).toFixed(2))
				};
			});

			const patrimonioNeto = activos - pasivos;
			const utilidad = ingresos - gastos;
			const ladoDerechoEcuacion = pasivos + patrimonio + ingresos - gastos;

			let activosCorrientes = 0;
			for (const cuenta of cuentas) {
				const id = String(cuenta?._id || '');
				const liquidez = cuenta?.liquidez;
				const categoria = normalizarTexto(cuenta?.categoria);
				const idCuenta = String(cuenta?.idCuenta || '').toUpperCase();
				const esActivoCorriente = typeof liquidez === 'boolean'
					? liquidez === true
					: (categoria.includes('activo corriente') || idCuenta.startsWith('P1.1'));
				if (!esActivoCorriente) continue;
				activosCorrientes += toNumber(saldoCuentaMap[id]);
			}

			return res.status(200).send({
				kpis: {
					totalCuentas: cuentas.length,
					totalMovimientos: movimientos.length,
					totalAsientosManuales: asientosManuales.size,
					totalProveedoresDeuda: Number(resumenDeuda.totalProveedores || 0),
					totalFacturasDeuda: Number(resumenDeuda.totalFacturas || 0),
					totalDeudaPendiente: Number(toNumber(resumenDeuda.totalPendiente).toFixed(2))
				},
				balance: {
					totalDebe: Number(totalDebe.toFixed(2)),
					totalHaber: Number(totalHaber.toFixed(2)),
					diferencia: Number((totalDebe - totalHaber).toFixed(2))
				},
				estadoFinanciero: {
					activos: Number(activos.toFixed(2)),
					activosCorrientes: Number(activosCorrientes.toFixed(2)),
					pasivos: Number(pasivos.toFixed(2)),
					patrimonio: Number(patrimonio.toFixed(2)),
					ingresos: Number(ingresos.toFixed(2)),
					gastos: Number(gastos.toFixed(2)),
					patrimonioNeto: Number(patrimonioNeto.toFixed(2)),
					utilidad: Number(utilidad.toFixed(2))
				},
				ecuacionContable: {
					activos: Number(activos.toFixed(2)),
					pasivos: Number(pasivos.toFixed(2)),
					patrimonio: Number(patrimonio.toFixed(2)),
					ingresos: Number(ingresos.toFixed(2)),
					gastos: Number(gastos.toFixed(2)),
					ladoDerecho: Number(ladoDerechoEcuacion.toFixed(2)),
					diferencia: Number((activos - ladoDerechoEcuacion).toFixed(2))
				},
				deuda: {
					totalProveedores: Number(resumenDeuda.totalProveedores || 0),
					totalFacturas: Number(resumenDeuda.totalFacturas || 0),
					totalDeuda: Number(toNumber(resumenDeuda.totalDeuda).toFixed(2)),
					totalAbonado: Number(toNumber(resumenDeuda.totalAbonado).toFixed(2)),
					totalPendiente: Number(toNumber(resumenDeuda.totalPendiente).toFixed(2))
				},
				cuentasPorCategoria: Object.entries(cuentasPorCategoriaMap)
					.map(([categoria, cantidad]) => ({ categoria, cantidad: Number(cantidad) }))
					.sort((a, b) => b.cantidad - a.cantidad),
				saldosPorCategoria,
				topCuentasSaldo,
				topOrigenes,
				tendenciaMensual,
				movimientosRecientes
			});
		} catch (err) {
			return res.status(500).send({ message: 'Error al generar dashboard personal', error: err?.message || err });
		}
	}
};

module.exports = controller;
