'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const DeudaMia = require('../modules/module-deudasMias');
const CuentaMia = require('../modules/module-cuentasMias');
const MovimientoMio = require('../modules/module-movimientoMios');

const PROVEEDOR_ID = '69bed32d93c20190a6449c4a';
const PROVEEDOR_NOMBRE = 'FLAYNER';
const ORIGEN_MODELO = 'deudasmias';

const CUENTA_DEBE_ABONO_ID_CUENTA = 'P2.2.005';
const CUENTA_HABER_ABONO_ID_CUENTA = 'P1.2.001';

const RAW_ABONOS = `
2024-10-14,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2024-11-02,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2024-11-09,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2024-11-17,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2024-11-23,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2024-12-02,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2024-12-08,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2024-12-17,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2024-12-21,2500000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2024-12-27,2500000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-01-04,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-01-11,1000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-01-18,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-01-25,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-02-01,3000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-02-08,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-02-16,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-02-22,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-02-28,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-03-08,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-03-17,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-03-23,3000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-03-29,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-04-12,3000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-04-19,1000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-04-28,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-05-05,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-05-10,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-05-17,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-05-24,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-05-31,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-06-08,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-06-16,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-06-24,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-06-28,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-07-07,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-07-12,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-07-21,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-07-25,3000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-08-02,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-08-09,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-08-17,3000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-08-26,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-09-02,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-09-10,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-09-17,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-09-24,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-10-01,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-10-08,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-10-15,1650000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-10-29,1500000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-11-06,2000000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-11-13,1300000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-11-19,1350000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
2025-12-02,1500000,Abono mano de obra,P2.2.005 - DEUDAS CONTABILIDAD PERSONAL,P1.2.001 - CONSTRUCCION CASA
`.trim();

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

function parseAbonos() {
	const rowsRaw = RAW_ABONOS.split('\n');
	const abonos = [];

	for (let i = 0; i < rowsRaw.length; i++) {
		const line = rowsRaw[i].trim();
		if (!line) continue;

		const parts = line.split(',');
		if (parts.length < 5) {
			console.log(`[WARN] Fila ${i + 1} con formato inválido (esperaba ≥5 campos):`);
			console.log(`       ${line}`);
			continue;
		}

		const fecha = normalizarFecha(parts[0]);
		const monto = toNumber(parts[1]);
		const descripcion = parts[2];
		// parts[3] es cuentaDebeId (ya incluido)
		// parts[4] es cuentaHaberId (ya incluido)

		if (!fecha) {
			console.log(`[WARN] Fila ${i + 1} con fecha inválida: ${parts[0]}`);
			continue;
		}
		if (monto === null || monto <= 0) {
			console.log(`[WARN] Fila ${i + 1} con monto inválido: ${parts[1]}`);
			continue;
		}

		abonos.push({ fecha, monto, descripcion });
	}

	console.log(`\n[PARSE] Se leyeron ${abonos.length} abonos válidos de ${rowsRaw.length} líneas`);
	return abonos;
}

async function construirMovimientosAbono(proveedor, factura, abono, cuentaDebeId, cuentaHaberId) {
	const movimientos = [];

	const movDebe = new MovimientoMio({
		fecha: abono.fecha,
		descripcion: `Abono factura ${factura.numeroFactura} - ${proveedor.nombreProveedor}`,
		cuentaId: cuentaDebeId,
		debe: abono.monto,
		haber: 0,
		origenModelo: ORIGEN_MODELO,
		_idOrigen: factura._id
	});

	const movHaber = new MovimientoMio({
		fecha: abono.fecha,
		descripcion: `Abono factura ${factura.numeroFactura} - ${proveedor.nombreProveedor}`,
		cuentaId: cuentaHaberId,
		debe: 0,
		haber: abono.monto,
		origenModelo: ORIGEN_MODELO,
		_idOrigen: factura._id
	});

	movimientos.push(movDebe, movHaber);
	return movimientos;
}

async function cargarAbonos() {
	try {
		console.log('[INICIO] Conectando a MongoDB...');
		await mongoose.connect(process.env.MONGO_URI);
		console.log('[OK] Conexión exitosa\n');

		// 1. Obtener proveedor
		console.log(`[BUSCA] Proveedor ID: ${PROVEEDOR_ID}`);
		const proveedor = await DeudaMia.findById(PROVEEDOR_ID);
		if (!proveedor) {
			console.log('[ERROR] Proveedor no encontrado');
			process.exit(1);
		}
		console.log(`[OK] Proveedor: ${proveedor.nombreProveedor}`);
		console.log(`     Facturas actuales: ${proveedor.facturas.length}`);

		// 2. Obtener cuentas
		const cuentaDebeMongo = await CuentaMia.findOne({ idCuenta: CUENTA_DEBE_ABONO_ID_CUENTA });
		const cuentaHaberMongo = await CuentaMia.findOne({ idCuenta: CUENTA_HABER_ABONO_ID_CUENTA });

		if (!cuentaDebeMongo || !cuentaHaberMongo) {
			console.log('[ERROR] Cuentas no encontradas en MongoDB');
			console.log(`        Debe (${CUENTA_DEBE_ABONO_ID_CUENTA}): ${cuentaDebeMongo ? 'OK' : 'NO'}`);
			console.log(`        Haber (${CUENTA_HABER_ABONO_ID_CUENTA}): ${cuentaHaberMongo ? 'OK' : 'NO'}`);
			process.exit(1);
		}
		console.log(`[OK] Cuenta Debe: ${cuentaDebeMongo.idCuenta} - ${cuentaDebeMongo.nombre}`);
		console.log(`[OK] Cuenta Haber: ${cuentaHaberMongo.idCuenta} - ${cuentaHaberMongo.nombre}\n`);

		// 3. Parsear abonos
		const abonos = parseAbonos();
		if (abonos.length === 0) {
			console.log('[ERROR] No hay abonos para cargar');
			process.exit(1);
		}

		// 4. Obtener factura (numeroFactura 1)
		if (proveedor.facturas.length === 0) {
			console.log('[ERROR] Proveedor sin facturas');
			process.exit(1);
		}

		const factura = proveedor.facturas.find(f => String(f.numeroFactura) === '1');
		if (!factura) {
			console.log('[ERROR] Factura numeroFactura=1 no encontrada');
			process.exit(1);
		}

		console.log(`[FACTURA] numeroFactura: ${factura.numeroFactura}`);
		console.log(`          Monto: ${factura.montoFactura}`);
		console.log(`          Abonado (previo): ${factura.montoAbonado}`);
		console.log(`          Pendiente (previo): ${factura.saldoPendiente}\n`);

		// 5. Aplicar abonos
		console.log('[ABONOS] Aplicando abonos...\n');
		const movimientosACrear = [];
		let totalAbonado = 0;

		for (const abono of abonos) {
			totalAbonado += abono.monto;

			// Crear registro de abono en la factura
			factura.abonos.push({
				fecha: abono.fecha,
				monto: abono.monto,
				descripcion: abono.descripcion,
				cuentaDebeId: cuentaDebeMongo._id,
				cuentaHaberId: cuentaHaberMongo._id
			});

			// Registrar movimientos
			const movs = await construirMovimientosAbono(proveedor, factura, abono, cuentaDebeMongo._id, cuentaHaberMongo._id);
			movimientosACrear.push(...movs);
		}

		// 6. Recalcular saldos de la factura
		factura.montoAbonado = Number((Number(factura.montoAbonado || 0) + totalAbonado).toFixed(2));
		factura.saldoPendiente = Number((Number(factura.montoFactura || 0) - factura.montoAbonado).toFixed(2));

		if (factura.saldoPendiente <= 0) {
			factura.estado = 'pagada';
			factura.saldoPendiente = 0;
		} else if (factura.montoAbonado > 0) {
			factura.estado = 'parcial';
		}

		console.log(`[RECALC] Nuevos totales de factura:`);
		console.log(`         Abonado: ${factura.montoAbonado}`);
		console.log(`         Pendiente: ${factura.saldoPendiente}`);
		console.log(`         Estado: ${factura.estado}\n`);

		// 7. Recalcular totales del proveedor
		let totalDeuda = 0;
		let totalAbonadoProveedor = 0;
		let totalPendiente = 0;

		for (const f of proveedor.facturas) {
			totalDeuda += Number(f.montoFactura || 0);
			totalAbonadoProveedor += Number(f.montoAbonado || 0);
			totalPendiente += Number(f.saldoPendiente || 0);
		}

		proveedor.totalFacturas = proveedor.facturas.length;
		proveedor.totalDeuda = Number(totalDeuda.toFixed(2));
		proveedor.totalAbonado = Number(totalAbonadoProveedor.toFixed(2));
		proveedor.totalPendiente = Number(totalPendiente.toFixed(2));

		console.log(`[RECALC] Totales del proveedor:`);
		console.log(`         Total deuda: ${proveedor.totalDeuda}`);
		console.log(`         Total abonado: ${proveedor.totalAbonado}`);
		console.log(`         Total pendiente: ${proveedor.totalPendiente}\n`);

		// 8. Guardar proveedor
		console.log('[SAVE] Guardando proveedor con abonos...');
		await proveedor.save();
		console.log('[OK] Proveedor guardado\n');

		// 9. Guardar movimientos
		console.log(`[SAVE] Guardando ${movimientosACrear.length} movimientos...`);
		if (movimientosACrear.length > 0) {
			await MovimientoMio.insertMany(movimientosACrear);
			console.log(`[OK] Movimientos guardados\n`);
		}

		// 10. Resumen final
		console.log('═'.repeat(60));
		console.log('[RESUMEN] Carga de abonos FLAYNER completada:');
		console.log(`  Proveedor: ${proveedor.nombreProveedor}`);
		console.log(`  Abonos cargados: ${abonos.length}`);
		console.log(`  Movimientos creados: ${movimientosACrear.length}`);
		console.log(`  Total abonado en esta carga: ${totalAbonado}`);
		console.log(`  Factura numeroFactura=1:`);
		console.log(`    - Monto original: ${factura.montoFactura}`);
		console.log(`    - Total abonado: ${factura.montoAbonado}`);
		console.log(`    - Saldo pendiente: ${factura.saldoPendiente}`);
		console.log(`    - Estado: ${factura.estado}`);
		console.log('═'.repeat(60));

		await mongoose.disconnect();
		console.log('[OK] Desconexión completada');
		process.exit(0);

	} catch (error) {
		console.error('[ERROR] ', error.message);
		console.error(error.stack);
		await mongoose.disconnect().catch(() => {});
		process.exit(1);
	}
}

cargarAbonos();
