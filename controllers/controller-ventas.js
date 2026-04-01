const mongoose = require('mongoose');
const Venta = require('../modules/module-venta');
const InventarioOrange = require('../modules/module-inventarioOrange');
const thermalPrinterService = require('./services/thermal-printer.service');

const DEFAULT_PRINTER_NAME = process.env.THERMAL_PRINTER_NAME || 'THERMAL Receipt Printer';

function money(n) {
	const value = Number(n) || 0;
	return '$' + Math.round(value).toLocaleString('es-CO');
}

function strTrim(value, max = 42) {
	return String(value || '').trim().slice(0, max);
}

function line(width = 42) {
	return '-'.repeat(width);
}

function parseLocalDate(value, endOfDay = false) {
	const raw = String(value || '').trim();
	if (!raw) return null;

	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
	let date = null;
	if (match) {
		date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
	} else {
		date = new Date(raw);
	}

	if (isNaN(date.getTime())) return null;
	if (endOfDay) {
		date.setHours(23, 59, 59, 999);
	} else {
		date.setHours(0, 0, 0, 0);
	}
	return date;
}

function getNowInBogota() {
	// Mantiene consistencia con el día/hora operativa de Colombia (UTC-5)
	const nowBogotaText = new Date().toLocaleString('sv-SE', { timeZone: 'America/Bogota' });
	const normalized = nowBogotaText.replace(' ', 'T');
	const date = new Date(normalized);
	return isNaN(date.getTime()) ? new Date() : date;
}

function resolveClientOrBogotaNow(clientDateTime) {
	const fromClient = new Date(String(clientDateTime || '').trim());
	if (!isNaN(fromClient.getTime())) return fromClient;
	return getNowInBogota();
}

function resolveClientLocalText(clientDateTime) {
	const raw = String(clientDateTime || '').trim();
	if (!raw) return '';
	const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/.exec(raw);
	if (match) return match[1].replace('T', ' ');
	const parsed = new Date(raw);
	if (isNaN(parsed.getTime())) return '';
	const pad2 = (n) => String(n).padStart(2, '0');
	const y = parsed.getFullYear();
	const m = pad2(parsed.getMonth() + 1);
	const d = pad2(parsed.getDate());
	const hh = pad2(parsed.getHours());
	const mm = pad2(parsed.getMinutes());
	const ss = pad2(parsed.getSeconds());
	return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function buildVentaCuentaLabel(venta) {
	if (!venta) return 'Sin cuenta';
	if (venta.tipo === 'mesa') {
		return `Mesa ${venta.numero_mesa || ''}`.trim();
	}

	const nombre = strTrim(venta.cliente_nombre || '', 36);
	if (venta.tipo === 'domicilio') {
		return nombre ? `Domicilio - ${nombre}` : 'Domicilio';
	}

	return nombre ? `Para llevar - ${nombre}` : 'Para llevar';
}

function getProductoId(item) {
	if (!item || !item.productoId) return '';
	if (typeof item.productoId === 'string') return item.productoId;
	if (item.productoId && typeof item.productoId === 'object') return String(item.productoId._id || '');
	return '';
}

function getBaseProductoId(item) {
	if (!item || !item.itemBaseProductoId) return '';
	if (typeof item.itemBaseProductoId === 'string') return item.itemBaseProductoId;
	if (item.itemBaseProductoId && typeof item.itemBaseProductoId === 'object') return String(item.itemBaseProductoId._id || '');
	return '';
}

function isItemElaborado(item, items) {
	if (typeof item.esElaborado === 'boolean') return item.esElaborado;
	const tipoProducto = String(item?.productoId?.tipoProducto || 'elaborado');
	if (tipoProducto) return tipoProducto !== 'producido';
	if (item?.esAdicion) {
		const baseId = getBaseProductoId(item);
		const base = (items || []).find(i => getProductoId(i) === baseId);
		if (base) return isItemElaborado(base, items);
	}
	return true;
}

function buildKitchenTicket(venta) {
	const label = venta.tipo === 'mesa'
		? `Mesa ${venta.numero_mesa || ''}`.trim()
		: venta.tipo === 'domicilio'
			? strTrim(venta.cliente_nombre || 'Domicilio', 32)
			: strTrim(venta.cliente_nombre || 'Para llevar', 32);
	const hora = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

	const items = Array.isArray(venta.items) ? venta.items : [];
	const bases = items.filter(i => !i.esAdicion && isItemElaborado(i, items));
	if (!bases.length) {
		return null;
	}

	const bodyLines = [];
	bases.forEach((base) => {
		bodyLines.push(`${Number(base.cantidad) || 1}x ${strTrim(base.nombre, 34)}`);
		const obs = strTrim(base.observacion || '', 120);
		if (obs) bodyLines.push(`  Obs: ${obs}`);
		const baseId = getProductoId(base);
		const adiciones = items.filter(i => i.esAdicion && getBaseProductoId(i) === baseId);
		if (adiciones.length) {
			bodyLines.push('  Adiciones:');
			adiciones.forEach(a => {
				bodyLines.push(`   + ${Number(a.cantidad) || 1}x ${strTrim(a.nombre, 30)}`);
			});
		}
		bodyLines.push('');
	});

	return [
		'COCINA',
		line(),
		`Pedido: ${label}`,
		`Hora: ${hora}`,
		line(),
		...bodyLines,
		line(),
		''
	].join('\n');
}

function buildCuentaTicket(venta) {
	const label = venta.tipo === 'mesa'
		? `Mesa ${venta.numero_mesa || ''}`.trim()
		: venta.tipo === 'domicilio'
			? strTrim(venta.cliente_nombre || 'Domicilio', 32)
			: strTrim(venta.cliente_nombre || 'Para llevar', 32);
	const fecha = new Date().toLocaleString('es-CO', {
		year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
	});

	const items = Array.isArray(venta.items) ? venta.items : [];
	const itemLines = items.flatMap((item) => {
		const pref = item.esAdicion ? '+ ' : '';
		const nombre = strTrim(pref + (item.nombre || 'Producto'), 28);
		const qty = Number(item.cantidad) || 1;
		const subtotal = money(item.subtotal);
		const firstLine = `${nombre}`;
		const secondLine = `  ${qty} x ${money(item.precioUnitario)} = ${subtotal}`;
		const obs = strTrim(item.observacion || '', 120);
		return obs ? [firstLine, secondLine, `  Obs: ${obs}`] : [firstLine, secondLine];
	});

	let pago = 'Pago: Pendiente';
	if (venta.metodo_pago === 'efectivo') {
		pago = `Efectivo: ${money(venta.monto_efectivo)}`;
	} else if (venta.metodo_pago === 'tarjeta') {
		pago = `Tarjeta: ${money(venta.monto_tarjeta)}`;
	} else if (venta.metodo_pago === 'mixto') {
		pago = `Efec ${money(venta.monto_efectivo)} / Tarj ${money(venta.monto_tarjeta)}`;
	}

	const cambio = Number(venta.cambio) > 0 ? `Cambio: ${money(venta.cambio)}` : '';

	return [
		'ORANGE',
		line(),
		label,
		fecha,
		line(),
		...itemLines,
		line(),
		`Subtotal: ${money(venta.subtotal)}`,
		Number(venta.impuesto) ? `Impuesto: ${money(venta.impuesto)}` : '',
		Number(venta.descuento) ? `Descuento: -${money(venta.descuento)}` : '',
		`TOTAL: ${money(venta.total)}`,
		line(),
		pago,
		cambio,
		'Gracias por su preferencia',
		''
	].filter(Boolean).join('\n');
}

// Crear una nueva venta
exports.crearVenta = async (req, res) => {
	const { tipo, numero_mesa, cliente_nombre, cliente_telefono, cliente_direccion, usuario_nombre, fechaHoraCliente } = req.body;
	const role = String(req.user?.role || '');

	if (!tipo || !['mesa', 'domicilio', 'llevar'].includes(tipo)) {
		return res.status(400).json({ success: false, message: 'Tipo de venta inválido' });
	}

	if (role === 'orange_pos' && tipo === 'domicilio') {
		return res.status(403).json({ success: false, message: 'Tu rol no puede crear ventas a domicilio' });
	}

	try {
		const nowVenta = resolveClientOrBogotaNow(fechaHoraCliente);
		const nowVentaLocal = resolveClientLocalText(fechaHoraCliente);
		const venta = new Venta({
			tipo,
			numero_mesa: tipo === 'mesa' ? numero_mesa : undefined,
			cliente_nombre: tipo === 'domicilio' || tipo === 'llevar' ? cliente_nombre : undefined,
			cliente_telefono: tipo === 'domicilio' ? cliente_telefono : undefined,
			cliente_direccion: tipo === 'domicilio' ? cliente_direccion : undefined,
			usuario_nombre: usuario_nombre || 'Sistema',
			items: [],
			subtotal: 0,
			total: 0,
			estado: 'abierta',
			fecha_apertura: nowVenta,
			fecha_apertura_local: nowVentaLocal,
			createdAt: nowVenta,
			updatedAt: nowVenta
		});

		await venta.save();
		res.status(201).json({
			success: true,
			message: 'Venta creada exitosamente',
			venta: venta
		});
	} catch (err) {
		res.status(500).json({ success: false, message: 'Error al crear venta', error: err.message });
	}
};

// Obtener ventas abiertas
exports.getVentasAbiertas = async (req, res) => {
	try {
		const ventas = await Venta.find({ estado: 'abierta' })
			.populate('items.productoId', 'codigo sabor precioVenta costoUnitario tipoProducto')
			.sort({ fecha_apertura: -1 });

		res.status(200).json({
			success: true,
			ventas: ventas
		});
	} catch (err) {
		res.status(500).json({ success: false, message: 'Error al obtener ventas', error: err.message });
	}
};

// Obtener todas las ventas (con filtros)
exports.getVentas = async (req, res) => {
	const { estado, tipo, fecha_desde, fecha_hasta, limite = 50, pagina = 1 } = req.query;

	try {
		const filtros = {};
		if (estado) filtros.estado = estado;
		if (tipo) filtros.tipo = tipo;
		if (fecha_desde || fecha_hasta) {
			const campoFecha = estado === 'cerrada' ? 'fecha_cierre' : 'fecha_apertura';
			filtros[campoFecha] = {};
			if (fecha_desde) filtros[campoFecha].$gte = parseLocalDate(fecha_desde, false);
			if (fecha_hasta) filtros[campoFecha].$lte = parseLocalDate(fecha_hasta, true);
		}

		const skip = (parseInt(pagina) - 1) * parseInt(limite);
		const ventas = await Venta.find(filtros)
			.populate('items.productoId', 'codigo sabor precioVenta costoUnitario tipoProducto')
			.sort({ fecha_cierre: -1, fecha_apertura: -1 })
			.limit(parseInt(limite))
			.skip(skip);

		const total = await Venta.countDocuments(filtros);

		res.status(200).json({
			success: true,
			ventas: ventas,
			total: total,
			pagina: parseInt(pagina),
			paginas: Math.ceil(total / parseInt(limite))
		});
	} catch (err) {
		res.status(500).json({ success: false, message: 'Error al obtener ventas', error: err.message });
	}
};

exports.getResumenPagosDigitales = async (req, res) => {
	const { desde, hasta } = req.query || {};

	try {
		const filtros = {
			estado: 'cerrada',
			monto_tarjeta: { $gt: 0 }
		};

		const fechaDesde = parseLocalDate(desde, false);
		const fechaHasta = parseLocalDate(hasta, true);
		if (fechaDesde || fechaHasta) {
			filtros.fecha_cierre = {};
			if (fechaDesde) filtros.fecha_cierre.$gte = fechaDesde;
			if (fechaHasta) filtros.fecha_cierre.$lte = fechaHasta;
		}

		const ventas = await Venta.find(filtros)
			.select('tipo numero_mesa cliente_nombre total metodo_pago monto_efectivo monto_tarjeta fecha_cierre fecha_apertura')
			.sort({ fecha_cierre: -1, fecha_apertura: -1 });

		const ventasDigitales = ventas.map((venta) => {
			const amount = Number(venta.monto_tarjeta || 0);
			const isPartial = Number(venta.monto_efectivo || 0) > 0 && amount > 0;
			return {
				_id: venta._id,
				cuenta: buildVentaCuentaLabel(venta),
				tipo: venta.tipo,
				fecha: venta.fecha_cierre || venta.fecha_apertura,
				metodoPago: isPartial ? 'mixto' : 'tarjeta',
				totalVenta: Number(venta.total || 0),
				montoDigital: amount
			};
		});

		const resumen = ventasDigitales.reduce((acc, venta) => {
			acc.totalVentas += 1;
			acc.montoDigitalTotal += Number(venta.montoDigital || 0);
			if (venta.metodoPago === 'mixto') {
				acc.ventasMixtas += 1;
			} else {
				acc.ventasSoloDigitales += 1;
			}
			return acc;
		}, {
			totalVentas: 0,
			montoDigitalTotal: 0,
			ventasMixtas: 0,
			ventasSoloDigitales: 0
		});

		return res.status(200).json({
			success: true,
			resumen,
			ventas: ventasDigitales
		});
	} catch (err) {
		return res.status(500).json({ success: false, message: 'Error al obtener resumen de pagos digitales', error: err.message });
	}
};

// Obtener una venta por ID
exports.getVenta = async (req, res) => {
	const { id } = req.params;

	if (!mongoose.Types.ObjectId.isValid(id)) {
		return res.status(400).json({ success: false, message: 'ID de venta inválido' });
	}

	try {
		const venta = await Venta.findById(id).populate('items.productoId');

		if (!venta) {
			return res.status(404).json({ success: false, message: 'Venta no encontrada' });
		}

		res.status(200).json({
			success: true,
			venta: venta
		});
	} catch (err) {
		res.status(500).json({ success: false, message: 'Error al obtener venta', error: err.message });
	}
};

// Agregar item a una venta
exports.agregarItem = async (req, res) => {
	const { ventaId } = req.params;
	const { productoId, cantidad, esAdicion, itemBaseProductoId, itemBaseNombre, observacion } = req.body;

	if (!mongoose.Types.ObjectId.isValid(ventaId)) {
		return res.status(400).json({ success: false, message: 'ID de venta inválido' });
	}

	if (!mongoose.Types.ObjectId.isValid(productoId)) {
		return res.status(400).json({ success: false, message: 'ID de producto inválido' });
	}

	const cant = Number(cantidad);
	if (isNaN(cant) || cant <= 0) {
		return res.status(400).json({ success: false, message: 'Cantidad debe ser mayor que 0' });
	}

	try {
		const venta = await Venta.findById(ventaId);
		if (!venta) {
			return res.status(404).json({ success: false, message: 'Venta no encontrada' });
		}

		if (venta.estado !== 'abierta') {
			return res.status(400).json({ success: false, message: 'No se puede agregar items a una venta cerrada' });
		}

		const producto = await InventarioOrange.findById(productoId);
		if (!producto) {
			return res.status(404).json({ success: false, message: 'Producto no encontrado' });
		}

		const baseProductoValido = itemBaseProductoId && mongoose.Types.ObjectId.isValid(itemBaseProductoId)
			? String(itemBaseProductoId)
			: null;
		const itemEsAdicion = Boolean(esAdicion && baseProductoValido);
		const observacionLimpia = typeof observacion === 'string' ? observacion.trim().slice(0, 200) : '';

		// Verificar si el item ya existe (si es adicion, se agrupa por producto base)
		const itemExistente = venta.items.find(i => {
			const mismoProducto = i.productoId.toString() === productoId;
			const mismaAdicion = Boolean(i.esAdicion) === itemEsAdicion;
			const mismaBase = itemEsAdicion
				? (i.itemBaseProductoId && i.itemBaseProductoId.toString() === baseProductoValido)
				: !i.itemBaseProductoId;
			return mismoProducto && mismaAdicion && mismaBase;
		});

		const precioUnitario = Number(producto.precioVenta) || 0;
		const costoUnitario = Number(producto.costoUnitario) || 0;
		const subtotal = precioUnitario * cant;

		if (itemExistente) {
			// Actualizar cantidad
			itemExistente.cantidad += cant;
			itemExistente.subtotal = itemExistente.precioUnitario * itemExistente.cantidad;
			if (observacionLimpia) {
				itemExistente.observacion = observacionLimpia;
			}
		} else {
			// Agregar nuevo item
			venta.items.push({
				productoId: producto._id,
				nombre: `${producto.sabor}`,
				cantidad: cant,
				precioUnitario: precioUnitario,
				costoUnitario: costoUnitario,
				subtotal: subtotal,
				observacion: observacionLimpia,
				esAdicion: itemEsAdicion,
				itemBaseProductoId: itemEsAdicion ? baseProductoValido : undefined,
				itemBaseNombre: itemEsAdicion ? String(itemBaseNombre || '').trim().slice(0, 80) : '',
				esElaborado: String(producto.tipoProducto || 'elaborado') !== 'producido'
			});
		}

		// Recalcular totales
		venta.subtotal = venta.items.reduce((sum, item) => sum + item.subtotal, 0);
		venta.total = venta.subtotal + (venta.impuesto || 0) - (venta.descuento || 0);
		venta.updatedAt = new Date();

		await venta.save();

		const ventaActualizada = await Venta.findById(ventaId).populate('items.productoId');

		res.status(200).json({
			success: true,
			message: 'Item agregado correctamente',
			venta: ventaActualizada
		});
	} catch (err) {
		res.status(500).json({ success: false, message: 'Error al agregar item', error: err.message });
	}
};

// Actualizar observacion de un item
exports.actualizarItemDetalle = async (req, res) => {
	const { ventaId, itemIndex } = req.params;
	const { observacion } = req.body;

	if (!mongoose.Types.ObjectId.isValid(ventaId)) {
		return res.status(400).json({ success: false, message: 'ID de venta inválido' });
	}

	try {
		const venta = await Venta.findById(ventaId);
		if (!venta) {
			return res.status(404).json({ success: false, message: 'Venta no encontrada' });
		}

		if (venta.estado !== 'abierta') {
			return res.status(400).json({ success: false, message: 'No se puede editar items de una venta cerrada' });
		}

		const idx = parseInt(itemIndex);
		if (isNaN(idx) || idx < 0 || idx >= venta.items.length) {
			return res.status(400).json({ success: false, message: 'Índice de item inválido' });
		}

		venta.items[idx].observacion = typeof observacion === 'string'
			? observacion.trim().slice(0, 200)
			: '';
		venta.updatedAt = new Date();

		await venta.save();

		const ventaActualizada = await Venta.findById(ventaId).populate('items.productoId');
		return res.status(200).json({
			success: true,
			message: 'Detalle del item actualizado',
			venta: ventaActualizada
		});
	} catch (err) {
		return res.status(500).json({ success: false, message: 'Error al actualizar detalle del item', error: err.message });
	}
};

// Actualizar cantidad de un item
exports.actualizarItem = async (req, res) => {
	const { ventaId, itemIndex } = req.params;
	const { cantidad } = req.body;

	if (!mongoose.Types.ObjectId.isValid(ventaId)) {
		return res.status(400).json({ success: false, message: 'ID de venta inválido' });
	}

	const cant = Number(cantidad);
	if (isNaN(cant) || cant <= 0) {
		return res.status(400).json({ success: false, message: 'Cantidad debe ser mayor que 0' });
	}

	try {
		const venta = await Venta.findById(ventaId);
		if (!venta) {
			return res.status(404).json({ success: false, message: 'Venta no encontrada' });
		}

		const idx = parseInt(itemIndex);
		if (isNaN(idx) || idx < 0 || idx >= venta.items.length) {
			return res.status(400).json({ success: false, message: 'Índice de item inválido' });
		}

		const role = String(req.user?.role || '');
		const cantidadActual = Number(venta.items[idx].cantidad || 0);
		if (role === 'orange_pos' && cant < cantidadActual) {
			return res.status(403).json({ success: false, message: 'Tu rol no tiene permiso para restar cantidad' });
		}

		venta.items[idx].cantidad = cant;
		venta.items[idx].subtotal = venta.items[idx].precioUnitario * cant;

		// Recalcular totales
		venta.subtotal = venta.items.reduce((sum, item) => sum + item.subtotal, 0);
		venta.total = venta.subtotal + (venta.impuesto || 0) - (venta.descuento || 0);
		venta.updatedAt = new Date();

		await venta.save();

		const ventaActualizada = await Venta.findById(ventaId).populate('items.productoId');

		res.status(200).json({
			success: true,
			message: 'Item actualizado correctamente',
			venta: ventaActualizada
		});
	} catch (err) {
		res.status(500).json({ success: false, message: 'Error al actualizar item', error: err.message });
	}
};

// Remover item de una venta
exports.removerItem = async (req, res) => {
	const { ventaId, itemIndex } = req.params;

	if (!mongoose.Types.ObjectId.isValid(ventaId)) {
		return res.status(400).json({ success: false, message: 'ID de venta inválido' });
	}

	try {
		const venta = await Venta.findById(ventaId);
		if (!venta) {
			return res.status(404).json({ success: false, message: 'Venta no encontrada' });
		}

		const idx = parseInt(itemIndex);
		if (isNaN(idx) || idx < 0 || idx >= venta.items.length) {
			return res.status(400).json({ success: false, message: 'Índice de item inválido' });
		}

		const itemObjetivo = venta.items[idx];
		const productoBaseId = getProductoId(itemObjetivo);

		if (itemObjetivo?.esAdicion) {
			venta.items.splice(idx, 1);
		} else {
			venta.items = venta.items.filter((item, index) => {
				if (index === idx) return false;
				if (!item?.esAdicion) return true;
				return getBaseProductoId(item) !== productoBaseId;
			});
		}

		// Recalcular totales
		venta.subtotal = venta.items.reduce((sum, item) => sum + item.subtotal, 0);
		venta.total = venta.subtotal + (venta.impuesto || 0) - (venta.descuento || 0);
		venta.updatedAt = new Date();

		await venta.save();

		const ventaActualizada = await Venta.findById(ventaId).populate('items.productoId');

		res.status(200).json({
			success: true,
			message: 'Item removido correctamente',
			venta: ventaActualizada
		});
	} catch (err) {
		res.status(500).json({ success: false, message: 'Error al remover item', error: err.message });
	}
};

// Aplicar descuento
exports.aplicarDescuento = async (req, res) => {
	const { ventaId } = req.params;
	const { descuento } = req.body;

	if (!mongoose.Types.ObjectId.isValid(ventaId)) {
		return res.status(400).json({ success: false, message: 'ID de venta inválido' });
	}

	const desc = Number(descuento);
	if (isNaN(desc) || desc < 0) {
		return res.status(400).json({ success: false, message: 'Descuento inválido' });
	}

	try {
		const venta = await Venta.findById(ventaId);
		if (!venta) {
			return res.status(404).json({ success: false, message: 'Venta no encontrada' });
		}

		venta.descuento = desc;
		venta.total = venta.subtotal + (venta.impuesto || 0) - desc;
		venta.updatedAt = new Date();

		await venta.save();

		res.status(200).json({
			success: true,
			message: 'Descuento aplicado',
			venta: venta
		});
	} catch (err) {
		res.status(500).json({ success: false, message: 'Error al aplicar descuento', error: err.message });
	}
};

// Cerrar venta
exports.cerrarVenta = async (req, res) => {
	const { ventaId } = req.params;
	const { metodo_pago, monto_efectivo, monto_tarjeta, fechaHoraCliente } = req.body;
	const role = String(req.user?.role || '');

	if (!mongoose.Types.ObjectId.isValid(ventaId)) {
		return res.status(400).json({ success: false, message: 'ID de venta inválido' });
	}

	try {
		if (role === 'orange_pos' && String(metodo_pago || 'efectivo') !== 'efectivo') {
			return res.status(403).json({ success: false, message: 'Tu rol solo puede cerrar ventas en efectivo' });
		}

		const venta = await Venta.findById(ventaId);
		if (!venta) {
			return res.status(404).json({ success: false, message: 'Venta no encontrada' });
		}

		if (venta.items.length === 0) {
			return res.status(400).json({ success: false, message: 'No se puede cerrar una venta sin items' });
		}

		venta.metodo_pago = metodo_pago || 'efectivo';
		venta.monto_efectivo = Number(monto_efectivo) || 0;
		venta.monto_tarjeta = Number(monto_tarjeta) || 0;

		// Calcular cambio si es efectivo
		if (venta.metodo_pago === 'efectivo' && venta.monto_efectivo > venta.total) {
			venta.cambio = venta.monto_efectivo - venta.total;
		}

		const nowVenta = resolveClientOrBogotaNow(fechaHoraCliente);
		const nowVentaLocal = resolveClientLocalText(fechaHoraCliente);
		venta.estado = 'cerrada';
		venta.fecha_cierre = nowVenta;
		venta.fecha_cierre_local = nowVentaLocal;
		venta.updatedAt = nowVenta;

		await venta.save();

		res.status(200).json({
			success: true,
			message: 'Venta cerrada exitosamente',
			venta: venta
		});
	} catch (err) {
		res.status(500).json({ success: false, message: 'Error al cerrar venta', error: err.message });
	}
};

// Cancelar venta
exports.cancelarVenta = async (req, res) => {
	const { ventaId } = req.params;

	if (!mongoose.Types.ObjectId.isValid(ventaId)) {
		return res.status(400).json({ success: false, message: 'ID de venta inválido' });
	}

	try {
		const venta = await Venta.findById(ventaId);
		if (!venta) {
			return res.status(404).json({ success: false, message: 'Venta no encontrada' });
		}

		venta.estado = 'cancelada';
		venta.updatedAt = getNowInBogota();

		await venta.save();

		res.status(200).json({
			success: true,
			message: 'Venta cancelada',
			venta: venta
		});
	} catch (err) {
		res.status(500).json({ success: false, message: 'Error al cancelar venta', error: err.message });
	}
};

// Reabrir venta cerrada para edición
exports.reabrirVenta = async (req, res) => {
	const { ventaId } = req.params;

	if (!mongoose.Types.ObjectId.isValid(ventaId)) {
		return res.status(400).json({ success: false, message: 'ID de venta inválido' });
	}

	try {
		const venta = await Venta.findById(ventaId).populate('items.productoId');
		if (!venta) {
			return res.status(404).json({ success: false, message: 'Venta no encontrada' });
		}

		if (venta.estado !== 'cerrada') {
			return res.status(400).json({ success: false, message: 'Solo se pueden reabrir ventas cerradas' });
		}

		venta.estado = 'abierta';
		venta.fecha_cierre = undefined;
		venta.metodo_pago = 'otro';
		venta.monto_efectivo = 0;
		venta.monto_tarjeta = 0;
		venta.cambio = 0;
		venta.updatedAt = new Date();

		await venta.save();

		const ventaActualizada = await Venta.findById(ventaId).populate('items.productoId');
		res.status(200).json({
			success: true,
			message: 'Venta reabierta para edición',
			venta: ventaActualizada
		});
	} catch (err) {
		res.status(500).json({ success: false, message: 'Error al reabrir venta', error: err.message });
	}
};

// Reasignar tipo/destino de venta (mesa, domicilio, llevar)
exports.reasignarVenta = async (req, res) => {
	const { ventaId } = req.params;
	const { tipo, numero_mesa, cliente_nombre, cliente_telefono, cliente_direccion } = req.body;
	const role = String(req.user?.role || '');

	if (!mongoose.Types.ObjectId.isValid(ventaId)) {
		return res.status(400).json({ success: false, message: 'ID de venta inválido' });
	}
	if (!tipo || !['mesa', 'domicilio', 'llevar'].includes(tipo)) {
		return res.status(400).json({ success: false, message: 'Tipo de venta inválido' });
	}

	if (role === 'orange_pos') {
		return res.status(403).json({ success: false, message: 'Tu rol no tiene permiso para reasignar pedidos' });
	}

	try {
		const venta = await Venta.findById(ventaId);
		if (!venta) return res.status(404).json({ success: false, message: 'Venta no encontrada' });

		venta.tipo = tipo;
		if (tipo === 'mesa') {
			venta.numero_mesa = numero_mesa || undefined;
			venta.cliente_nombre = undefined;
			venta.cliente_telefono = undefined;
			venta.cliente_direccion = undefined;
		} else if (tipo === 'domicilio') {
			venta.numero_mesa = undefined;
			venta.cliente_nombre = cliente_nombre || undefined;
			venta.cliente_telefono = cliente_telefono || undefined;
			venta.cliente_direccion = cliente_direccion || undefined;
		} else {
			venta.numero_mesa = undefined;
			venta.cliente_nombre = cliente_nombre || undefined;
			venta.cliente_telefono = undefined;
			venta.cliente_direccion = undefined;
		}

		await venta.save();
		res.status(200).json({ success: true, message: 'Venta reasignada', venta });
	} catch (err) {
		res.status(500).json({ success: false, message: 'Error al reasignar venta', error: err.message });
	}
};

// Imprimir comanda completa a cocina (solo elaborados)
exports.imprimirCocina = async (req, res) => {
	const { ventaId } = req.params;
	const printerName = String(req.body?.printerName || DEFAULT_PRINTER_NAME).trim();

	if (!mongoose.Types.ObjectId.isValid(ventaId)) {
		return res.status(400).json({ success: false, message: 'ID de venta inválido' });
	}

	try {
		const venta = await Venta.findById(ventaId).populate('items.productoId', 'tipoProducto sabor');
		if (!venta) {
			return res.status(404).json({ success: false, message: 'Venta no encontrada' });
		}

		const ticket = buildKitchenTicket(venta);
		if (!ticket) {
			return res.status(400).json({ success: false, message: 'La venta no tiene productos elaborados para cocina' });
		}

		await thermalPrinterService.printRawText(ticket, { printerName });
		return res.status(200).json({
			success: true,
			message: 'Comanda enviada a impresora de cocina',
			printerName
		});
	} catch (err) {
		return res.status(500).json({ success: false, message: 'Error al imprimir comanda de cocina', error: err.message });
	}
};

// Imprimir cuenta del pedido
exports.imprimirCuenta = async (req, res) => {
	const { ventaId } = req.params;
	const printerName = String(req.body?.printerName || DEFAULT_PRINTER_NAME).trim();

	if (!mongoose.Types.ObjectId.isValid(ventaId)) {
		return res.status(400).json({ success: false, message: 'ID de venta inválido' });
	}

	try {
		const venta = await Venta.findById(ventaId).populate('items.productoId', 'tipoProducto sabor');
		if (!venta) {
			return res.status(404).json({ success: false, message: 'Venta no encontrada' });
		}

		if (!Array.isArray(venta.items) || !venta.items.length) {
			return res.status(400).json({ success: false, message: 'La venta no tiene items para imprimir' });
		}

		const ticket = buildCuentaTicket(venta);
		await thermalPrinterService.printRawText(ticket, { printerName });
		return res.status(200).json({
			success: true,
			message: 'Cuenta enviada a impresora',
			printerName
		});
	} catch (err) {
		return res.status(500).json({ success: false, message: 'Error al imprimir cuenta', error: err.message });
	}
};
