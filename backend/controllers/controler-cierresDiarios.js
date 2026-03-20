'use strict'

var https = require('https');
var CierreDiario = require('../modules/module-cierresDiarios.js');
var Movimiento = require('../modules/module-movimientos.js');
var Cuenta = require('../modules/cuenta.js');
var CobroAlmacen = require('../modules/module-cobrarAlmacen.js');

const ORIGEN_MODELO_CIERRES = 'cierresdiarios';
const URL_CREDITOS_ABONOS_DIA = process.env.URL_CREDITOS_ABONOS_DIA || 'https://almacen.appiorange.com/envioAbonosCrditosClientes.php';

// Cada entrada representa un movimiento individual (no un par).
// tipo: 'debe' | 'haber'
// campoMonto: nombre del campo en el cierre (acceso directo)
// formula: función (cierre) => número (para montos calculados)
const CONFIG_ASIENTOS_CIERRE = [
	{
		tipo: 'debe',
		formula: (c) =>
			(c.totalVentas || 0) +
			(c.totalAbonos || 0) -
			(c.retiroTransferencias || 0) -
			(c.gastosArgemiro || 0) -
			(c.totalGastos || 0) -
			(c.retiroJuan || 0) -
			(c.retiroYolanda || 0),
		descripcion: 'Caja efectivo almacen del dia',
		cuenta: 'CAJA EFECTIVO ALMACEN',
		cuentasAlternas: ['CAJA EFECTIVO']
	},
	{
		tipo: 'debe',
		campoMonto: 'retiroTransferencias',
		descripcion: 'Transferencias del dia',
		cuenta: 'CUENTA BANCARIA ALMACEN',
		cuentasAlternas: ['CUENTA BANCARIA']
	},
	{
		tipo: 'debe',
		campoMonto: 'retiroJuan',
		descripcion: 'Retiro de efectivo de Juan Guillermo',
		cuenta: 'RETIROS EFECTIVO JUAN',
		cuentasAlternas: ['RETIRO EFECTIVO JUAN', 'RETIROS JUAN']
	},
	{
		tipo: 'debe',
		campoMonto: 'retiroYolanda',
		descripcion: 'Retiro de efectivo de Doña Yolanda',
		cuenta: 'RETIROS EFECTIVO DOÑA YOLANDA',
		cuentasAlternas: ['RETIROS EFECTIVO DONA YOLANDA', 'RETIROS YOLANDA']
	},
	{
		tipo: 'debe',
		campoMonto: 'totalGastos',
		descripcion: 'Gastos del almacen',
		cuenta: 'GASTOS ALMACEN',
		cuentasAlternas: []
	},
	{
		tipo: 'debe',
		campoMonto: 'gastosArgemiro',
		descripcion: 'Gastos Argemiro',
		cuenta: 'GASTOS ARGEMIRO',
		cuentasAlternas: ['GASTOS DE ARGEMIRO']
	},
	{
		tipo: 'haber',
		campoMonto: 'totalVentas',
		descripcion: 'Ventas diarias',
		cuenta: 'VENTAS ALMACEN',
		cuentasAlternas: ['VENTAS']
	},
	{
		tipo: 'haber',
		campoMonto: 'totalAbonos',
		descripcion: 'Abonos del dia (cuentas por cobrar)',
		cuenta: 'CUENTAS POR COBRAR',
		cuentasAlternas: ['CUENTAS X COBRAR', 'CARTERA', 'ABONOS ALMACEN', 'ABONOS']
	}
];

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

function normalizarTexto(valor) {
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
		cuentasPorNombre.set(normalizarTexto(cuenta.nombre), cuenta);
	}
	return cuentasPorNombre;
}

function resolverCuenta(cuentasPorNombre, principal, alternas) {
	const candidatos = [principal].concat(alternas || []);
	for (const nombre of candidatos) {
		const cuenta = cuentasPorNombre.get(normalizarTexto(nombre));
		if (cuenta) return cuenta;
	}
	return null;
}

function tomarPrimerValor(objeto, claves) {
	for (const clave of claves) {
		if (
			Object.prototype.hasOwnProperty.call(objeto || {}, clave) &&
			objeto[clave] !== null &&
			objeto[clave] !== undefined &&
			String(objeto[clave]).trim() !== ''
		) {
			return objeto[clave];
		}
	}
	return '';
}

function obtenerTextoRemoto(url) {
	return new Promise((resolve, reject) => {
		const req = https.get(url, (response) => {
			let body = '';

			if (response.statusCode && response.statusCode >= 400) {
				reject(new Error('El servidor externo respondio con estado ' + response.statusCode));
				response.resume();
				return;
			}

			response.setEncoding('utf8');
			response.on('data', (chunk) => {
				body += chunk;
			});

			response.on('end', () => {
				resolve(body);
			});
		});

		req.on('error', () => {
			reject(new Error('No se pudo conectar con el servidor externo de creditos/abonos del dia'));
		});

		req.setTimeout(15000, () => {
			req.destroy(new Error('Tiempo de espera agotado consultando creditos/abonos del dia'));
		});
	});
}

function parseJsonRaicesConcatenadas(texto) {
	const raices = [];
	let i = 0;
	const len = texto.length;

	while (i < len) {
		while (i < len && /\s/.test(texto[i])) i += 1;
		if (i >= len) break;

		const inicio = texto[i];
		if (inicio !== '{' && inicio !== '[') {
			i += 1;
			continue;
		}

		let profundidad = 0;
		let enString = false;
		let escapado = false;
		let j = i;

		for (; j < len; j += 1) {
			const ch = texto[j];

			if (enString) {
				if (escapado) escapado = false;
				else if (ch === '\\') escapado = true;
				else if (ch === '"') enString = false;
				continue;
			}

			if (ch === '"') {
				enString = true;
				continue;
			}

			if (ch === '{' || ch === '[') profundidad += 1;
			if (ch === '}' || ch === ']') profundidad -= 1;

			if (profundidad === 0) {
				raices.push(texto.slice(i, j + 1));
				i = j + 1;
				break;
			}
		}

		if (j >= len) break;
	}

	return raices;
}

function detectarTipoDataset(arreglo) {
	if (!Array.isArray(arreglo) || arreglo.length === 0) return 'desconocido';
	const muestra = arreglo[0] || {};
	const claves = Object.keys(muestra);
	if (claves.includes('Id_Abono') || claves.includes('Valor_Abono')) return 'abonos';
	if (claves.includes('Fecha_borrado') || claves.includes('Consecutivo')) return 'devoluciones';
	if (claves.includes('Id_Factura') || claves.includes('Ds_Producto') || claves.includes('Cantida_Producto')) return 'creditos';
	if (claves.some(k => /abono/i.test(k))) return 'abonos';
	if (claves.some(k => /devol|borrado/i.test(k))) return 'devoluciones';
	if (claves.some(k => /factura|producto|venta/i.test(k))) return 'creditos';
	return 'desconocido';
}

function normalizarPayloadCreditosAbonosDia(texto) {
	const limpio = String(texto || '').trim();
	if (!limpio) {
		return { creditos: [], abonos: [], devoluciones: [] };
	}

	try {
		const unico = JSON.parse(limpio);
		if (Array.isArray(unico)) {
			const tipo = detectarTipoDataset(unico);
			return {
				creditos: tipo === 'creditos' ? unico : [],
				abonos: tipo === 'abonos' ? unico : [],
				devoluciones: tipo === 'devoluciones' ? unico : []
			};
		}
		if (unico && typeof unico === 'object') {
			return {
				creditos: Array.isArray(unico.datosCreditos) ? unico.datosCreditos : Array.isArray(unico.creditos) ? unico.creditos : [],
				abonos: Array.isArray(unico.datosAbonosDia) ? unico.datosAbonosDia : Array.isArray(unico.abonos) ? unico.abonos : [],
				devoluciones: Array.isArray(unico.datosDevoluciones)
					? unico.datosDevoluciones
					: Array.isArray(unico.devoluciones)
						? unico.devoluciones
						: Array.isArray(unico.datosDevolciones)
							? unico.datosDevolciones
							: []
			};
		}
	} catch (error) {
		// Intencional: intentar parseo de JSON concatenados.
	}

	const bloques = parseJsonRaicesConcatenadas(limpio);
	if (!bloques.length) throw new Error('No se pudo interpretar la respuesta del servidor externo');

	const arreglos = bloques
		.map((bloque) => {
			try {
				return JSON.parse(bloque);
			} catch (e) {
				return null;
			}
		})
		.filter((v) => Array.isArray(v));

	let creditos = [];
	let abonos = [];
	let devoluciones = [];
	for (const arr of arreglos) {
		const tipo = detectarTipoDataset(arr);
		if (tipo === 'creditos' && !creditos.length) creditos = arr;
		if (tipo === 'abonos' && !abonos.length) abonos = arr;
		if (tipo === 'devoluciones' && !devoluciones.length) devoluciones = arr;
	}

	if (!creditos.length && arreglos[0]) creditos = arreglos[0];
	if (!abonos.length && arreglos[1]) abonos = arreglos[1];
	if (!devoluciones.length && arreglos[2]) devoluciones = arreglos[2];

	return { creditos, abonos, devoluciones };
}

function extraerIdClienteExterno(fila) {
	return String(tomarPrimerValor(fila, ['IdCliente', 'Id_Cliente', 'id_cliente', 'idCliente']) || '').trim();
}

function extraerMontoLineaCredito(fila) {
	const precio = Number(fila && fila['Valor_Venta'] ? fila['Valor_Venta'] : 0) || 0;
	const cantidad = Number(fila && fila['Cantida_Producto'] ? fila['Cantida_Producto'] : 0) || 0;
	return Math.max(precio * cantidad, 0);
}

function extraerMontoAbono(fila) {
	return Math.max(Number(fila && fila['Valor_Abono'] ? fila['Valor_Abono'] : 0) || 0, 0);
}

function fechaAClaveLocal(fecha) {
	const date = normalizarFecha(fecha);
	if (!date) return '';
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function mergeUnicoPorClave(existentes, nuevos, claveFn) {
	const salida = Array.isArray(existentes) ? existentes.slice() : [];
	const keys = new Set(salida.map((x) => claveFn(x)));
	for (const item of (Array.isArray(nuevos) ? nuevos : [])) {
		const key = claveFn(item);
		if (!key || keys.has(key)) continue;
		salida.push(item);
		keys.add(key);
	}
	return salida;
}

function aplicarDevolucionesProductos(creditos, devoluciones) {
	const listaCreditos = Array.isArray(creditos) ? creditos : [];
	const listaDevoluciones = Array.isArray(devoluciones) ? devoluciones : [];
	if (!listaDevoluciones.length) return listaCreditos;

	return listaCreditos.filter((credito) => {
		const idProductoCredito = String(tomarPrimerValor(credito, ['Id_Producto', 'id_producto']) || '').trim();
		if (!idProductoCredito) return true;

		const idFacturaCredito = String(tomarPrimerValor(credito, ['Id_Factura', 'id_factura']) || '').trim();

		const fueDevuelto = listaDevoluciones.some((devolucion) => {
			const idProductoDev = String(tomarPrimerValor(devolucion, ['Id_Producto', 'id_producto']) || '').trim();
			if (!idProductoDev || idProductoDev !== idProductoCredito) return false;

			const idFacturaDev = String(tomarPrimerValor(devolucion, ['Id_Factura', 'id_factura']) || '').trim();
			if (!idFacturaDev) return true;
			if (!idFacturaCredito) return false;
			return idFacturaDev === idFacturaCredito;
		});

		return !fueDevuelto;
	});
}

function construirMovimientosCreditosDia(totalCreditosDia, fecha, idOrigen, cuentasPorNombre) {
	if (!(totalCreditosDia > 0)) return [];

	const cuentaDebe = resolverCuenta(cuentasPorNombre, 'CUENTAS POR COBRAR', ['CUENTAS X COBRAR', 'CARTERA']);
	const cuentaHaber = resolverCuenta(cuentasPorNombre, 'VENTAS A CREDITO', ['VENTA A CREDITO']);

	if (!cuentaDebe) {
		throw new Error('No se encontró la cuenta requerida para contabilizar créditos del día: CUENTAS POR COBRAR');
	}

	if (!cuentaHaber) {
		throw new Error('No se encontró la cuenta requerida para contabilizar créditos del día: VENTAS A CREDITO');
	}

	const fechaEtiqueta = fechaAClaveLocal(fecha);

	return [
		{
			cuentaId: cuentaDebe._id,
			origenModelo: ORIGEN_MODELO_CIERRES,
			_idOrigen: idOrigen,
			debe: totalCreditosDia,
			haber: 0,
			descripcion: `Créditos del día - cierre ${fechaEtiqueta}`,
			fecha
		},
		{
			cuentaId: cuentaHaber._id,
			origenModelo: ORIGEN_MODELO_CIERRES,
			_idOrigen: idOrigen,
			debe: 0,
			haber: totalCreditosDia,
			descripcion: `Créditos del día - cierre ${fechaEtiqueta}`,
			fecha
		}
	];
}

async function sincronizarCreditosAbonosDiaEnCobroAlmacen(fechaObjetivo, opciones) {
	const cuentasPorNombre = opciones && opciones.cuentasPorNombre ? opciones.cuentasPorNombre : new Map();
	const idOrigenMovimiento = opciones && opciones.idOrigenMovimiento ? opciones.idOrigenMovimiento : null;
	const fechaObjetivoKey = fechaAClaveLocal(fechaObjetivo);
	if (!fechaObjetivoKey) {
		throw new Error('No se definio una fecha objetivo valida para sincronizar creditos/abonos del dia');
	}

	const texto = await obtenerTextoRemoto(URL_CREDITOS_ABONOS_DIA);
	const datos = normalizarPayloadCreditosAbonosDia(texto);

	const creditosDia = (Array.isArray(datos.creditos) ? datos.creditos : []).filter((fila) => {
		const key = fechaAClaveLocal(tomarPrimerValor(fila, ['Fecha_Venta', 'fecha_venta', 'FechaVenta']));
		return key && key === fechaObjetivoKey;
	});
	const abonosDia = (Array.isArray(datos.abonos) ? datos.abonos : []).filter((fila) => {
		const key = fechaAClaveLocal(tomarPrimerValor(fila, ['Fecha_abono', 'fecha_abono', 'FechaAbono']));
		return key && key === fechaObjetivoKey;
	});
	const devolucionesDia = (Array.isArray(datos.devoluciones) ? datos.devoluciones : []).filter((fila) => {
		const key = fechaAClaveLocal(tomarPrimerValor(fila, ['Fecha_borrado', 'fecha_borrado', 'FechaBorrado']));
		return key && key === fechaObjetivoKey;
	});

	const mapaCreditos = new Map();
	for (const fila of creditosDia) {
		const id = extraerIdClienteExterno(fila);
		if (!id) continue;
		if (!mapaCreditos.has(id)) mapaCreditos.set(id, []);
		mapaCreditos.get(id).push(fila);
	}

	const mapaAbonos = new Map();
	for (const fila of abonosDia) {
		const id = extraerIdClienteExterno(fila);
		if (!id) continue;
		if (!mapaAbonos.has(id)) mapaAbonos.set(id, []);
		mapaAbonos.get(id).push(fila);
	}

	const mapaDevoluciones = new Map();
	for (const fila of devolucionesDia) {
		const id = extraerIdClienteExterno(fila);
		if (!id) continue;
		if (!mapaDevoluciones.has(id)) mapaDevoluciones.set(id, []);
		mapaDevoluciones.get(id).push(fila);
	}

	const idsCliente = new Set([...mapaCreditos.keys(), ...mapaAbonos.keys(), ...mapaDevoluciones.keys()]);
	let clientesAfectados = 0;
	let productosDevueltosAplicados = 0;
	let totalCreditosDiaContabilizados = 0;

	for (const idCliente of idsCliente) {
		const creditosClienteDia = mapaCreditos.get(idCliente) || [];
		const abonosClienteDia = mapaAbonos.get(idCliente) || [];
		const devolucionesClienteDia = mapaDevoluciones.get(idCliente) || [];
		const creditosClienteDiaSinDevolucion = aplicarDevolucionesProductos(creditosClienteDia, devolucionesClienteDia);
		totalCreditosDiaContabilizados += creditosClienteDiaSinDevolucion.reduce((acc, item) => acc + extraerMontoLineaCredito(item), 0);

		const cliente = await CobroAlmacen
			.findOne({ idClienteExterno: idCliente })
			.select('nombreCliente idClienteExterno totalVentas totalAbonado totalPendiente totalDeuda totalCreditosExternos totalAbonosExternos creditosExternosRaw abonosExternosRaw clienteExternoData ultimaSincronizacionExterna')
			.lean();

		const creditosCombinados = mergeUnicoPorClave(
			cliente && Array.isArray(cliente.creditosExternosRaw) ? cliente.creditosExternosRaw : [],
			creditosClienteDia,
			(item) => [
				String((item && item['Id_Factura']) || ''),
				String((item && item['Id_Producto']) || ''),
				String((item && item['Cantida_Producto']) || ''),
				String((item && item['Valor_Venta']) || ''),
				String((item && item['Fecha_Venta']) || '')
			].join('|')
		);

		const abonosCombinados = mergeUnicoPorClave(
			cliente && Array.isArray(cliente.abonosExternosRaw) ? cliente.abonosExternosRaw : [],
			abonosClienteDia,
			(item) => [
				String((item && item['Id_Abono']) || ''),
				String((item && item['Fecha_abono']) || ''),
				String((item && item['Valor_Abono']) || ''),
				String((item && item['Id_Factura']) || '')
			].join('|')
		);

		const creditosSinDevolucion = aplicarDevolucionesProductos(creditosCombinados, devolucionesClienteDia);
		productosDevueltosAplicados += Math.max(creditosCombinados.length - creditosSinDevolucion.length, 0);

		const totalVentas = creditosSinDevolucion.reduce((acc, item) => acc + extraerMontoLineaCredito(item), 0);
		const totalAbonado = abonosCombinados.reduce((acc, item) => acc + extraerMontoAbono(item), 0);
		const saldoInicial = cliente
			? (Number(cliente.totalPendiente || 0) - Number(cliente.totalVentas || 0) + Number(cliente.totalAbonado || 0))
			: 0;
		const totalPendiente = Math.max(saldoInicial + totalVentas - totalAbonado, 0);
		const facturasUnicas = new Set(creditosSinDevolucion.map((x) => String(x && x['Id_Factura'] ? x['Id_Factura'] : '')).filter(Boolean));
		const totalCreditosExternos = facturasUnicas.size;
		const totalAbonosExternos = abonosCombinados.length;

		const nombreFallback = normalizarTexto(tomarPrimerValor(creditosClienteDia[0] || {}, ['Ds_Cliente', 'NombreCliente', 'Nombre_Cliente']))
			|| normalizarTexto(tomarPrimerValor(abonosClienteDia[0] || {}, ['Ds_Cliente', 'NombreCliente', 'Nombre_Cliente']))
			|| ('Cliente ' + idCliente);

		const observacionesSync = [
			'Sincronizacion diaria desde ' + URL_CREDITOS_ABONOS_DIA,
			'Creditos nuevos del dia: ' + creditosClienteDia.length,
			'Abonos nuevos del dia: ' + abonosClienteDia.length,
			'Devoluciones del dia: ' + devolucionesClienteDia.length
		].join(' | ');

		await CobroAlmacen.findOneAndUpdate(
			{ idClienteExterno: idCliente },
			{
				$set: {
					nombreCliente: (cliente && cliente.nombreCliente) ? cliente.nombreCliente : nombreFallback,
					idClienteExterno: idCliente,
					tipoVenta: 'credito',
					observaciones: observacionesSync,
					totalVentas,
					totalAbonado,
					totalPendiente,
					totalDeuda: totalPendiente,
					totalCreditosExternos,
					totalAbonosExternos,
					creditosExternosRaw: creditosSinDevolucion,
					abonosExternosRaw: abonosCombinados,
					clienteExternoData: (cliente && cliente.clienteExternoData) ? cliente.clienteExternoData : null,
					ultimaSincronizacionExterna: new Date()
				}
			},
			{ upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
		);

		clientesAfectados += 1;
	}

	let movimientosContablesGenerados = 0;
	if (idOrigenMovimiento && totalCreditosDiaContabilizados > 0) {
		const movimientosCreditosDia = construirMovimientosCreditosDia(
			totalCreditosDiaContabilizados,
			normalizarFecha(fechaObjetivo) || fechaObjetivo,
			idOrigenMovimiento,
			cuentasPorNombre
		);

		if (movimientosCreditosDia.length > 0) {
			await Movimiento.insertMany(movimientosCreditosDia);
			movimientosContablesGenerados = movimientosCreditosDia.length;
		}
	}

	return {
		urlOrigen: URL_CREDITOS_ABONOS_DIA,
		fechaObjetivo: fechaObjetivoKey,
		creditosDia: creditosDia.length,
		abonosDia: abonosDia.length,
		devolucionesDia: devolucionesDia.length,
		totalCreditosDiaContabilizados,
		movimientosContablesGenerados,
		productosDevueltosAplicados,
		clientesAfectados
	};
}

function construirMovimientosDesdeCierre(cierre, cuentasPorNombre) {
	const fecha = cierre.fecha;
	const idOrigen = cierre._id;
	const fechaEtiqueta = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
	const movimientos = [];

	for (const config of CONFIG_ASIENTOS_CIERRE) {
		const monto = config.formula
			? Number(config.formula(cierre) || 0)
			: Number(cierre[config.campoMonto] || 0);

		if (!(monto > 0)) continue;

		const cuenta = resolverCuenta(cuentasPorNombre, config.cuenta, config.cuentasAlternas);

		if (!cuenta) {
			throw new Error(
				`No se encontró la cuenta requerida para "${config.descripcion}": ${config.cuenta}`
			);
		}

		movimientos.push({
			cuentaId: cuenta._id,
			origenModelo: ORIGEN_MODELO_CIERRES,
			_idOrigen: idOrigen,
			debe: config.tipo === 'debe' ? monto : 0,
			haber: config.tipo === 'haber' ? monto : 0,
			descripcion: `${config.descripcion} - cierre ${fechaEtiqueta}`,
			fecha
		});
	}

	return movimientos;
}

var controller = {
	getCierresDiarios: async (req, res) => {
		try {
			const cierres = await CierreDiario.find({}).sort({ fecha: -1 });
			if (!cierres || cierres.length === 0) {
				return res.status(404).send({ message: 'No hay cierres diarios para mostrar' });
			}
			return res.status(200).send({ cierres });
		} catch (err) {
			return res.status(500).send({ message: 'Error al devolver los cierres diarios', error: err });
		}
	},

	getCierreByFecha: async (req, res) => {
		try {
			const fechaNormalizada = normalizarFecha(req.params.fecha);
			if (!fechaNormalizada) {
				return res.status(400).send({ message: 'Fecha invalida. Usa formato YYYY-MM-DD' });
			}

			const cierre = await CierreDiario.findOne({ fecha: fechaNormalizada });
			if (!cierre) {
				return res.status(404).send({ message: 'No existe cierre diario para esa fecha' });
			}

			return res.status(200).send({ cierre });
		} catch (err) {
			return res.status(500).send({ message: 'Error al buscar cierre diario por fecha', error: err });
		}
	},

	upsertCierreDiario: async (req, res) => {
		try {
			const params = req.body;

			const fechaNormalizada = normalizarFecha(params.fecha);
			if (!fechaNormalizada) {
				return res.status(400).send({ message: 'Fecha invalida. Usa formato YYYY-MM-DD' });
			}

			const baseInicial = toNumber(params.baseInicial);
			const totalVentas = toNumber(params.totalVentas);
			const totalAbonos = toNumber(params.totalAbonos);
			const totalGastos = toNumber(params.totalGastos);
			const gastosArgemiro = toNumber(params.gastosArgemiro);
			const retiroTransferencias = toNumber(params.retiroTransferencias);
			const retiroJuan = toNumber(params.retiroJuan);
			const retiroYolanda = toNumber(params.retiroYolanda);
			const efectivoTeorico = toNumber(params.efectivoTeorico);
			const efectivoReal = toNumber(params.efectivoReal);

			const valores = [
				baseInicial,
				totalVentas,
				totalAbonos,
				totalGastos,
				gastosArgemiro,
				retiroTransferencias,
				retiroJuan,
				retiroYolanda,
				efectivoTeorico,
				efectivoReal
			];

			if (valores.some(v => v === null)) {
				return res.status(400).send({
					message: 'Todos los campos numericos son obligatorios y deben ser validos'
				});
			}

			const diferencia = params.diferencia !== undefined && params.diferencia !== null
				? toNumber(params.diferencia)
				: (efectivoReal - efectivoTeorico);

			if (diferencia === null) {
				return res.status(400).send({ message: 'El campo diferencia debe ser numerico' });
			}

			const updateData = {
				fecha: fechaNormalizada,
				baseInicial,
				totalVentas,
				totalAbonos,
				totalGastos,
				gastosArgemiro,
				retiroTransferencias,
				retiroJuan,
				retiroYolanda,
				efectivoTeorico,
				efectivoReal,
				diferencia,
				origen: params.origen || 'externo',
				fechaRecepcion: new Date()
			};

			const cierreStored = await CierreDiario.findOneAndUpdate(
				{ fecha: fechaNormalizada },
				updateData,
				{ returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
			);

			const cuentas = await Cuenta.find({}).select('_id nombre');
			const cuentasPorNombre = mapearCuentasPorNombre(cuentas);
			const movimientos = construirMovimientosDesdeCierre(cierreStored, cuentasPorNombre);

			await Movimiento.deleteMany({
				origenModelo: ORIGEN_MODELO_CIERRES,
				_idOrigen: cierreStored._id
			});

			if (movimientos.length > 0) {
				await Movimiento.insertMany(movimientos);
			}

			let syncCreditosAbonos = null;
			try {
				syncCreditosAbonos = await sincronizarCreditosAbonosDiaEnCobroAlmacen(cierreStored.fecha, {
					cuentasPorNombre,
					idOrigenMovimiento: cierreStored._id
				});
			} catch (syncError) {
				syncCreditosAbonos = {
					error: true,
					message: syncError.message || 'No se pudo sincronizar creditos/abonos del dia'
				};
			}

			return res.status(200).send({
				cierre: cierreStored,
				movimientosGenerados: movimientos.length,
				syncCreditosAbonos
			});
		} catch (err) {
			return res.status(500).send({ message: 'Error al guardar cierre diario', error: err });
		}
	}
};

module.exports = controller;
