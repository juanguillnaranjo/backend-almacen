'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const DeudaMia = require('../modules/module-deudasMias');
const MovimientoMio = require('../modules/module-movimientoMios');

const PROVEEDOR_ID = '69bed32d93c20190a6449c4a';
const ORIGEN_MODELO = 'deudasmias';

async function limpiarYRecargar() {
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

		// 2. Obtener factura
		const factura = proveedor.facturas.find(f => String(f.numeroFactura) === '1');
		if (!factura) {
			console.log('[ERROR] Factura no encontrada');
			process.exit(1);
		}

		console.log(`[ESTADO ACTUAL]`);
		console.log(`  Abonos en documento: ${factura.abonos.length}`);
		console.log(`  Total abonado: ${factura.montoAbonado}`);

		// 3. Mantener solo los primeros 53 abonos (remove duplicates)
		const abonosOriginales = factura.abonos.slice(0, 53);
		console.log(`\n[LIMPIEZA]`);
		console.log(`  Manteniendo primeros 53 abonos`);
		console.log(`  Removiendo ${factura.abonos.length - 53} duplicados`);

		factura.abonos = abonosOriginales;

		// 4. Recalcular saldo
		let totalAbonado = 0;
		for (const abono of factura.abonos) {
			totalAbonado += Number(abono.monto || 0);
		}

		factura.montoAbonado = Number(totalAbonado.toFixed(2));
		factura.saldoPendiente = Number((Number(factura.montoFactura || 0) - factura.montoAbonado).toFixed(2));

		if (factura.saldoPendiente <= 0) {
			factura.estado = 'pagada';
			factura.saldoPendiente = 0;
		} else if (factura.montoAbonado > 0) {
			factura.estado = 'parcial';
		} else {
			factura.estado = 'pendiente';
		}

		console.log(`\n[NUEVOS TOTALES]`);
		console.log(`  Total abonado: ${factura.montoAbonado}`);
		console.log(`  Saldo pendiente: ${factura.saldoPendiente}`);
		console.log(`  Estado: ${factura.estado}`);

		// 5. Recalcular totales del proveedor
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

		console.log(`\n[TOTALES PROVEEDOR]`);
		console.log(`  Total deuda: ${proveedor.totalDeuda}`);
		console.log(`  Total abonado: ${proveedor.totalAbonado}`);
		console.log(`  Total pendiente: ${proveedor.totalPendiente}`);

		// 6. Guardar proveedor
		console.log(`\n[SAVE] Guardando proveedor...`);
		await proveedor.save();
		console.log(`[OK] Proveedor guardado`);

		// 7. Limpiar movimientos duplicados (mantener solo los primeros 106 = 53 x 2)
		console.log(`\n[MOVIMIENTOS] Identificando y removiendo duplicados...`);
		
		// Buscar todos los movimientos de esta factura
		const todosMovimientos = await MovimientoMio.find({
			origenModelo: ORIGEN_MODELO,
			_idOrigen: factura._id
		}).sort({ fecha: 1, _id: 1 });

		console.log(`  Total movimientos actuales: ${todosMovimientos.length}`);
		console.log(`  Movimientos esperados (53 abonos x 2): 106`);

		if (todosMovimientos.length > 106) {
			// Contamos en pares: si queremos 53 abonos, necesitamos 106 movimientos
			const aRemover = todosMovimientos.slice(106);
			console.log(`  Removiendo ${aRemover.length} movimientos duplicados`);

			const idsARemover = aRemover.map(m => m._id);
			await MovimientoMio.deleteMany({ _id: { $in: idsARemover } });
			console.log(`[OK] Movimientos duplicados removidos`);
		} else {
			console.log(`  No hay duplicados que remover`);
		}

		console.log(`\n════════════════════════════════════════════════════════════`);
		console.log(`[RESUMEN] Limpieza de FLAYNER completada:`);
		console.log(`  Abonos finales: ${factura.abonos.length}`);
		console.log(`  Movimientos finales: ${await MovimientoMio.countDocuments({ origenModelo: ORIGEN_MODELO, _idOrigen: factura._id })}`);
		console.log(`  Total abonado: ${factura.montoAbonado}`);
		console.log(`  Saldo pendiente: ${factura.saldoPendiente}`);
		console.log(`════════════════════════════════════════════════════════════`);

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

limpiarYRecargar();
