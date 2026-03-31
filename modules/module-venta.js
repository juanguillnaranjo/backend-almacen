const mongoose = require('mongoose');
const Schema = mongoose.Schema;

var VentaSchema = new Schema({
	tipo: { type: String, enum: ['mesa', 'domicilio', 'llevar'], required: true },
	
	// Para ventas en mesa
	numero_mesa: { type: Number },
	
	// Para ventas a domicilio
	cliente_nombre: { type: String },
	cliente_telefono: { type: String },
	cliente_direccion: { type: String },
	
	// Items de la venta
	items: [{
		productoId: { type: Schema.Types.ObjectId, ref: 'InventarioOrange', required: true },
		nombre: String,
		cantidad: { type: Number, required: true, min: 1 },
		precioUnitario: { type: Number, required: true, min: 0 },
		costoUnitario: { type: Number, default: 0 },
		subtotal: { type: Number, required: true },
		observacion: { type: String, default: '' },
		esAdicion: { type: Boolean, default: false },
		itemBaseProductoId: { type: Schema.Types.ObjectId, ref: 'InventarioOrange' },
		itemBaseNombre: { type: String, default: '' },
		esElaborado: { type: Boolean, default: true }
	}],
	
	// Totales
	subtotal: { type: Number, required: true, default: 0 },
	impuesto: { type: Number, default: 0 },
	descuento: { type: Number, default: 0 },
	total: { type: Number, required: true, default: 0 },
	
	// Estado
	estado: { type: String, enum: ['abierta', 'cerrada', 'cancelada'], default: 'abierta' },
	
	// Tiempos
	fecha_apertura: { type: Date, default: Date.now },
	fecha_cierre: { type: Date },
	
	// Pago
	metodo_pago: { type: String, enum: ['efectivo', 'tarjeta', 'mixto', 'otro'], default: 'efectivo' },
	monto_efectivo: { type: Number, default: 0 },
	monto_tarjeta: { type: Number, default: 0 },
	cambio: { type: Number, default: 0 },
	
	// Usuario
	usuario_id: { type: Schema.Types.ObjectId, ref: 'User' },
	usuario_nombre: String,
	
	// Notas
	notas: { type: String, default: '' },
	
	// Auditoría
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Venta', VentaSchema);
