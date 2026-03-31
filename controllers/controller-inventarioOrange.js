'use strict'

var mongoose = require('mongoose');
var InventarioOrange = require('../modules/module-inventarioOrange');
var Insumo = require('../modules/module-insumo');

function confirmarEliminacion(req) {
	const confirmacion = String(req && req.query && req.query.confirmacion || '')
		.trim()
		.toUpperCase();
	return confirmacion === 'ELIMINAR';
}

function textoPlano(texto) {
	return String(texto || '')
		.trim()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();
}

function normalizarCodigoTexto(texto) {
	return String(texto || '')
		.toUpperCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^A-Z0-9]/g, '');
}

function construirBaseCodigoProducto(datos) {
	const prefClase = normalizarCodigoTexto(datos.clase).slice(0, 3) || 'CLS';
	const prefTipo = normalizarCodigoTexto(datos.tipo).slice(0, 3) || 'TIP';
	const prefTamano = normalizarCodigoTexto(datos.tamano).slice(0, 2) || 'TM';
	const prefSabor = normalizarCodigoTexto(datos.sabor).slice(0, 3) || 'SAB';
	return prefClase + '-' + prefTipo + '-' + prefTamano + '-' + prefSabor;
}

async function generarCodigoUnico(base) {
	for (let intento = 0; intento < 12; intento++) {
		const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
		const timePart = Date.now().toString(36).toUpperCase().slice(-4);
		const codigo = base + '-' + timePart + randomPart;
		const existe = await InventarioOrange.exists({ codigo: codigo });
		if (!existe) {
			return codigo;
		}
	}
	throw new Error('No se pudo generar un codigo unico para el producto');
}

function armarDatosProducto(body) {
	return {
		clase: textoPlano(body.clase),
		tipo: textoPlano(body.tipo),
		tamano: textoPlano(body.tamano),
		sabor: String(body.sabor || '').trim(),
		costoUnitario: Number(body.costoUnitario) || 0,
		precioVenta: Number(body.precioVenta) || 0,
		cantidad: Number(body.cantidad) || 0,
		descripcion: String(body.descripcion || '').trim(),
		icono: String(body.icono || '').trim(),
		activo: body.activo === undefined ? true : Boolean(body.activo),
		tipoProducto: ['elaborado', 'producido'].includes(String(body.tipoProducto || '')) ? String(body.tipoProducto) : 'elaborado'
	};
}

function validarDatosProducto(datos, esParcial) {
	if (!esParcial || datos.clase !== undefined) {
		if (!datos.clase) return 'Nivel 1 (clase) es requerido';
	}
	if (!esParcial || datos.tipo !== undefined) {
		if (!datos.tipo) return 'Nivel 2 (tipo) es requerido';
	}
	if (!esParcial || datos.tamano !== undefined) {
		if (!datos.tamano) return 'Nivel 3 (tamano) es requerido';
	}
	if (!esParcial || datos.sabor !== undefined) {
		if (!datos.sabor || !datos.sabor.trim()) return 'Nivel 4 (sabor) es requerido';
	}
	if (datos.costoUnitario !== undefined && datos.costoUnitario < 0) {
		return 'Costo unitario no puede ser negativo';
	}
	if (datos.precioVenta !== undefined && datos.precioVenta < 0) {
		return 'Precio de venta no puede ser negativo';
	}
	if (datos.cantidad !== undefined && datos.cantidad < 0) {
		return 'Cantidad no puede ser negativa';
	}
	return null;
}

exports.getProductosOrange = async function (req, res) {
	try {
		const filtro = {};
		if (req.query.clase) filtro.clase = textoPlano(req.query.clase);
		if (req.query.tipo) filtro.tipo = textoPlano(req.query.tipo);
		if (req.query.tamano) filtro.tamano = textoPlano(req.query.tamano);
		if (req.query.sabor) filtro.sabor = new RegExp('^' + String(req.query.sabor).trim() + '$', 'i');

		const productos = await InventarioOrange.find(filtro).sort({ clase: 1, tipo: 1, tamano: 1, sabor: 1 });
		return res.status(200).json({
			success: true,
			productos: productos || []
		});
	} catch (err) {
		return res.status(500).json({
			success: false,
			message: 'Error al obtener productos',
			error: err.message
		});
	}
};

exports.getProductoOrange = async function (req, res) {
	const id = req.params.id;
	if (!mongoose.Types.ObjectId.isValid(id)) {
		return res.status(400).json({ success: false, message: 'ID de producto invalido' });
	}

	try {
		const producto = await InventarioOrange.findById(id);
		if (!producto) {
			return res.status(404).json({ success: false, message: 'Producto no encontrado' });
		}
		return res.status(200).json({ success: true, producto });
	} catch (err) {
		return res.status(500).json({ success: false, message: 'Error al obtener producto', error: err.message });
	}
};

exports.getProductoByCodigo = async function (req, res) {
	const codigo = String(req.params.codigo || '').trim().toUpperCase();
	if (!codigo) {
		return res.status(400).json({ success: false, message: 'Codigo de producto requerido' });
	}

	try {
		const producto = await InventarioOrange.findOne({ codigo: codigo });
		if (!producto) {
			return res.status(404).json({ success: false, message: 'Producto no encontrado' });
		}
		return res.status(200).json({ success: true, producto });
	} catch (err) {
		return res.status(500).json({ success: false, message: 'Error al buscar producto', error: err.message });
	}
};

exports.createProductoOrange = async function (req, res) {
	const datos = armarDatosProducto(req.body || {});
	const validacion = validarDatosProducto(datos, false);
	if (validacion) {
		return res.status(400).json({ success: false, message: validacion });
	}

	try {
		const codigoBase = construirBaseCodigoProducto(datos);
		const codigoGenerado = await generarCodigoUnico(codigoBase);

		const producto = new InventarioOrange({
			...datos,
			codigo: codigoGenerado
		});

		const productoGuardado = await producto.save();
		return res.status(201).json({
			success: true,
			message: 'Producto final (nivel 4) creado exitosamente',
			producto: productoGuardado
		});
	} catch (err) {
		if (err && err.code === 11000) {
			return res.status(400).json({
				success: false,
				message: 'Ya existe un producto con la misma clase/tipo/tamano/sabor'
			});
		}
		if (err && (err.name === 'ValidationError' || err.name === 'CastError')) {
			return res.status(400).json({
				success: false,
				message: 'Datos invalidos para crear producto',
				error: err.message
			});
		}
		return res.status(500).json({
			success: false,
			message: 'Error al crear producto',
			error: err.message
		});
	}
};

exports.updateProductoOrange = async function (req, res) {
	const id = req.params.id;
	if (!mongoose.Types.ObjectId.isValid(id)) {
		return res.status(400).json({ success: false, message: 'ID de producto invalido' });
	}

	const datos = armarDatosProducto(req.body || {});
	const actualizaciones = {};
	if (req.body.clase !== undefined) actualizaciones.clase = datos.clase;
	if (req.body.tipo !== undefined) actualizaciones.tipo = datos.tipo;
	if (req.body.tamano !== undefined) actualizaciones.tamano = datos.tamano;
	if (req.body.sabor !== undefined) actualizaciones.sabor = datos.sabor;
	if (req.body.costoUnitario !== undefined) actualizaciones.costoUnitario = datos.costoUnitario;
	if (req.body.precioVenta !== undefined) actualizaciones.precioVenta = datos.precioVenta;
	if (req.body.cantidad !== undefined) actualizaciones.cantidad = datos.cantidad;
	if (req.body.descripcion !== undefined) actualizaciones.descripcion = datos.descripcion;
	if (req.body.activo !== undefined) actualizaciones.activo = Boolean(req.body.activo);
	if (req.body.icono !== undefined) actualizaciones.icono = String(req.body.icono || '').trim();
	if (req.body.tipoProducto !== undefined) {
		const tipo = String(req.body.tipoProducto);
		if (['elaborado', 'producido'].includes(tipo)) {
			actualizaciones.tipoProducto = tipo;
			// Si cambia a elaborado, se borra la receta
			if (tipo === 'elaborado') actualizaciones.receta = [];
		}
	}

	const validacion = validarDatosProducto(actualizaciones, true);
	if (validacion) {
		return res.status(400).json({ success: false, message: validacion });
	}

	if (
		actualizaciones.clase !== undefined ||
		actualizaciones.tipo !== undefined ||
		actualizaciones.tamano !== undefined ||
		actualizaciones.sabor !== undefined
	) {
		try {
			const actual = await InventarioOrange.findById(id);
			if (!actual) {
				return res.status(404).json({ success: false, message: 'Producto no encontrado' });
			}
			const paraCodigo = {
				clase: actualizaciones.clase !== undefined ? actualizaciones.clase : actual.clase,
				tipo: actualizaciones.tipo !== undefined ? actualizaciones.tipo : actual.tipo,
				tamano: actualizaciones.tamano !== undefined ? actualizaciones.tamano : actual.tamano,
				sabor: actualizaciones.sabor !== undefined ? actualizaciones.sabor : actual.sabor
			};
			actualizaciones.codigo = await generarCodigoUnico(construirBaseCodigoProducto(paraCodigo));
		} catch (err) {
			return res.status(500).json({ success: false, message: 'Error al regenerar codigo', error: err.message });
		}
	}

	try {
		const productoActualizado = await InventarioOrange.findByIdAndUpdate(
			id,
			actualizaciones,
			{ returnDocument: 'after' }
		);
		if (!productoActualizado) {
			return res.status(404).json({ success: false, message: 'Producto no encontrado' });
		}
		return res.status(200).json({
			success: true,
			message: 'Producto actualizado exitosamente',
			producto: productoActualizado
		});
	} catch (err) {
		if (err && err.code === 11000) {
			return res.status(400).json({
				success: false,
				message: 'Ya existe un producto con la misma clase/tipo/tamano/sabor'
			});
		}
		return res.status(500).json({
			success: false,
			message: 'Error al actualizar producto',
			error: err.message
		});
	}
};

exports.incrementarCantidad = async function (req, res) {
	const id = req.params.id;
	const incremento = Number(req.body.incremento) || 0;

	if (!mongoose.Types.ObjectId.isValid(id)) {
		return res.status(400).json({ success: false, message: 'ID de producto invalido' });
	}
	if (incremento <= 0) {
		return res.status(400).json({ success: false, message: 'El incremento debe ser mayor que 0' });
	}

	try {
		const productoActualizado = await InventarioOrange.findByIdAndUpdate(
			id,
			{ $inc: { cantidad: incremento } },
			{ returnDocument: 'after' }
		);
		if (!productoActualizado) {
			return res.status(404).json({ success: false, message: 'Producto no encontrado' });
		}
		return res.status(200).json({
			success: true,
			message: 'Cantidad incrementada exitosamente',
			producto: productoActualizado
		});
	} catch (err) {
		return res.status(500).json({ success: false, message: 'Error al incrementar cantidad', error: err.message });
	}
};

exports.decrementarCantidad = async function (req, res) {
	const id = req.params.id;
	const decremento = Number(req.body.decremento) || 0;

	if (!mongoose.Types.ObjectId.isValid(id)) {
		return res.status(400).json({ success: false, message: 'ID de producto invalido' });
	}
	if (decremento <= 0) {
		return res.status(400).json({ success: false, message: 'El decremento debe ser mayor que 0' });
	}

	try {
		const producto = await InventarioOrange.findById(id);
		if (!producto) {
			return res.status(404).json({ success: false, message: 'Producto no encontrado' });
		}
		if ((producto.cantidad || 0) < decremento) {
			return res.status(400).json({
				success: false,
				message: 'No hay cantidad suficiente para decrementar',
				cantidadActual: producto.cantidad,
				intentoDe: decremento
			});
		}

		producto.cantidad = (producto.cantidad || 0) - decremento;
		const productoActualizado = await producto.save();

		return res.status(200).json({
			success: true,
			message: 'Cantidad decrementada exitosamente',
			producto: productoActualizado
		});
	} catch (err) {
		return res.status(500).json({ success: false, message: 'Error al decrementar cantidad', error: err.message });
	}
};

exports.deleteProductoOrange = async function (req, res) {
	const id = req.params.id;
	if (!mongoose.Types.ObjectId.isValid(id)) {
		return res.status(400).json({ success: false, message: 'ID de producto invalido' });
	}
	if (!confirmarEliminacion(req)) {
		return res.status(400).json({
			success: false,
			message: 'Confirmacion requerida para eliminar. Debe enviar ?confirmacion=ELIMINAR'
		});
	}

	try {
		const productoEliminado = await InventarioOrange.findByIdAndDelete(id);
		if (!productoEliminado) {
			return res.status(404).json({ success: false, message: 'Producto no encontrado' });
		}
		return res.status(200).json({
			success: true,
			message: 'Producto eliminado exitosamente',
			producto: productoEliminado
		});
	} catch (err) {
		return res.status(500).json({ success: false, message: 'Error al eliminar producto', error: err.message });
	}
};

exports.getResumenInventario = async function (req, res) {
	try {
		const resumen = await InventarioOrange.aggregate([
			{
				$group: {
					_id: '$clase',
					totalProductos: { $sum: 1 },
					totalCantidad: { $sum: '$cantidad' },
					valorTotalCosto: { $sum: { $multiply: ['$costoUnitario', '$cantidad'] } },
					valorTotalVenta: { $sum: { $multiply: ['$precioVenta', '$cantidad'] } }
				}
			},
			{ $sort: { _id: 1 } }
		]);

		const totalGeneral = resumen.reduce(
			(acc, item) => ({
				totalProductos: acc.totalProductos + item.totalProductos,
				totalCantidad: acc.totalCantidad + item.totalCantidad,
				valorTotalCosto: acc.valorTotalCosto + item.valorTotalCosto,
				valorTotalVenta: acc.valorTotalVenta + item.valorTotalVenta
			}),
			{ totalProductos: 0, totalCantidad: 0, valorTotalCosto: 0, valorTotalVenta: 0 }
		);

		return res.status(200).json({
			success: true,
			porClase: resumen || [],
			total: totalGeneral
		});
	} catch (err) {
		return res.status(500).json({ success: false, message: 'Error al obtener resumen', error: err.message });
	}
};

exports.getClases = async function (req, res) {
	try {
		const clases = await InventarioOrange.distinct('clase');
		return res.status(200).json({
			success: true,
			clases: (clases || []).sort()
		});
	} catch (err) {
		return res.status(500).json({ success: false, message: 'Error al obtener clases', error: err.message });
	}
};

exports.getTiposPorClase = async function (req, res) {
	const clase = textoPlano(req.params.clase);
	if (!clase) {
		return res.status(400).json({ success: false, message: 'Clase requerida' });
	}

	try {
		const tipos = await InventarioOrange.distinct('tipo', { clase: clase });
		return res.status(200).json({ success: true, clase: clase, tipos: (tipos || []).sort() });
	} catch (err) {
		return res.status(500).json({ success: false, message: 'Error al obtener tipos', error: err.message });
	}
};

exports.getTamanosPorClaseTipo = async function (req, res) {
	const clase = textoPlano(req.params.clase);
	const tipo = textoPlano(req.params.tipo);
	if (!clase || !tipo) {
		return res.status(400).json({ success: false, message: 'Clase y tipo son requeridos' });
	}

	try {
		const tamanos = await InventarioOrange.distinct('tamano', { clase: clase, tipo: tipo });
		return res.status(200).json({
			success: true,
			clase: clase,
			tipo: tipo,
			tamanos: (tamanos || []).sort()
		});
	} catch (err) {
		return res.status(500).json({ success: false, message: 'Error al obtener tamanos', error: err.message });
	}
};

exports.getSaboresPorRuta = async function (req, res) {
	const clase = textoPlano(req.params.clase);
	const tipo = textoPlano(req.params.tipo);
	const tamano = textoPlano(req.params.tamano);

	if (!clase || !tipo || !tamano) {
		return res.status(400).json({ success: false, message: 'Clase, tipo y tamano son requeridos' });
	}

	try {
		const sabores = await InventarioOrange.find(
			{ clase: clase, tipo: tipo, tamano: tamano },
			{ _id: 1, codigo: 1, sabor: 1, cantidad: 1, precioVenta: 1, costoUnitario: 1, activo: 1 }
		).sort({ sabor: 1 });

		return res.status(200).json({
			success: true,
			clase: clase,
			tipo: tipo,
			tamano: tamano,
			sabores: sabores || []
		});
	} catch (err) {
		return res.status(500).json({ success: false, message: 'Error al obtener sabores', error: err.message });
	}
};

exports.getArbolInventario = async function (req, res) {
	try {
		const productos = await InventarioOrange.find().sort({ clase: 1, tipo: 1, tamano: 1, sabor: 1 });
		const arbol = {};

		for (const p of productos) {
			if (!arbol[p.clase]) arbol[p.clase] = {};
			if (!arbol[p.clase][p.tipo]) arbol[p.clase][p.tipo] = {};
			if (!arbol[p.clase][p.tipo][p.tamano]) arbol[p.clase][p.tipo][p.tamano] = [];
			arbol[p.clase][p.tipo][p.tamano].push({
				_id: p._id,
				codigo: p.codigo,
				sabor: p.sabor,
				cantidad: p.cantidad,
				costoUnitario: p.costoUnitario,
				precioVenta: p.precioVenta,
				activo: p.activo
			});
		}

		return res.status(200).json({ success: true, arbol: arbol });
	} catch (err) {
		return res.status(500).json({ success: false, message: 'Error al obtener arbol de inventario', error: err.message });
	}
};

// Compatibilidad con endpoint previo
exports.getDepartamentos = exports.getClases;

// ─── RECETA ───────────────────────────────────────────────────────────────────

// Obtener la receta de un producto (con datos completos del insumo)
exports.getReceta = async function (req, res) {
	const id = req.params.id;
	if (!mongoose.Types.ObjectId.isValid(id)) {
		return res.status(400).json({ success: false, message: 'ID de producto invalido' });
	}
	try {
		const producto = await InventarioOrange.findById(id).populate('receta.insumo');
		if (!producto) return res.status(404).json({ success: false, message: 'Producto no encontrado' });
		return res.status(200).json({
			success: true,
			tipoProducto: producto.tipoProducto || 'elaborado',
			receta: producto.receta || []
		});
	} catch (err) {
		return res.status(500).json({ success: false, message: 'Error al obtener receta', error: err.message });
	}
};

// Reemplazar toda la receta de un producto producido
exports.setReceta = async function (req, res) {
	const id = req.params.id;
	if (!mongoose.Types.ObjectId.isValid(id)) {
		return res.status(400).json({ success: false, message: 'ID de producto invalido' });
	}

	const recetaRaw = Array.isArray(req.body.receta) ? req.body.receta : [];

	for (const linea of recetaRaw) {
		if (!linea.insumo || !mongoose.Types.ObjectId.isValid(String(linea.insumo))) {
			return res.status(400).json({ success: false, message: 'Cada linea de receta requiere un ID de insumo valido' });
		}
		const cant = Number(linea.cantidad);
		if (isNaN(cant) || cant <= 0) {
			return res.status(400).json({ success: false, message: 'La cantidad de cada insumo debe ser mayor que 0' });
		}
	}

	const recetaNormalizada = recetaRaw.map(function (linea) {
		return { insumo: linea.insumo, cantidad: Number(linea.cantidad) };
	});

	try {
		// Cargar los insumos para calcular el costo total
		var Insumo = require('../modules/module-insumo');
		let costoTotalReceta = 0;
		
		for (const linea of recetaNormalizada) {
			const insumo = await Insumo.findById(linea.insumo);
			if (insumo) {
				costoTotalReceta += (insumo.costoUnitario || 0) * linea.cantidad;
			}
		}

		const productoActualizado = await InventarioOrange.findByIdAndUpdate(
			id,
			{ 
				receta: recetaNormalizada, 
				tipoProducto: 'producido',
				costoUnitario: costoTotalReceta 
			},
			{ returnDocument: 'after' }
		).populate('receta.insumo');

		if (!productoActualizado) return res.status(404).json({ success: false, message: 'Producto no encontrado' });
		return res.status(200).json({
			success: true,
			message: 'Receta guardada exitosamente',
			tipoProducto: productoActualizado.tipoProducto,
			receta: productoActualizado.receta,
			costoUnitario: costoTotalReceta
		});
	} catch (err) {
		return res.status(500).json({ success: false, message: 'Error al guardar receta', error: err.message });
	}
};

// Cambiar tipo del producto (elaborado ↔ producido)
exports.updateTipoProducto = async function (req, res) {
	const id = req.params.id;
	if (!mongoose.Types.ObjectId.isValid(id)) {
		return res.status(400).json({ success: false, message: 'ID de producto invalido' });
	}

	const tipoProducto = String(req.body.tipoProducto || '');
	if (!['elaborado', 'producido'].includes(tipoProducto)) {
		return res.status(400).json({ success: false, message: 'tipoProducto debe ser "elaborado" o "producido"' });
	}

	const actualizacion = { tipoProducto: tipoProducto };
	if (tipoProducto === 'elaborado') actualizacion.receta = [];

	try {
		const productoActualizado = await InventarioOrange.findByIdAndUpdate(id, actualizacion, { returnDocument: 'after' });
		if (!productoActualizado) return res.status(404).json({ success: false, message: 'Producto no encontrado' });
		return res.status(200).json({
			success: true,
			message: 'Tipo de producto actualizado exitosamente',
			producto: productoActualizado
		});
	} catch (err) {
		return res.status(500).json({ success: false, message: 'Error al actualizar tipo de producto', error: err.message });
	}
};
