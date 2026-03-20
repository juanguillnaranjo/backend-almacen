'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * Subesquema de abono para facturas de ventas del almacén
 */
var AbonoVentaAlmacenSchema = Schema({
	fecha: { type: Date, required: true },
	monto: { type: Number, required: true, min: 0.01 },
	descripcion: { type: String, default: '' },
	cuentaDebeId: { type: Schema.Types.ObjectId, ref: 'Cuenta', required: true },
	cuentaHaberId: { type: Schema.Types.ObjectId, ref: 'Cuenta', required: true }
}, { _id: false });

/**
 * Subesquema de factura/venta de almacén
 */
var VentaAlmacenSchema = Schema({
	numeroFactura: { type: String, required: true, trim: true },
	tipoVenta: { type: String, required: true, trim: true, lowercase: true, default: 'venta' },
	fechaVenta: { type: Date, required: true },
	montoVenta: { type: Number, required: true, min: 0.01 },
	montoAbonado: { type: Number, required: true, default: 0, min: 0 },
	saldoPendiente: { type: Number, required: true, min: 0 },
	estado: { type: String, enum: ['pendiente', 'parcial', 'pagada'], default: 'pendiente' },
	cuentaDebeId: { type: Schema.Types.ObjectId, ref: 'Cuenta', required: true },
	cuentaHaberId: { type: Schema.Types.ObjectId, ref: 'Cuenta', required: true },
	abonos: { type: [AbonoVentaAlmacenSchema], default: [] }
});

/**
 * Esquema principal de cliente/deudor del almacén
 */
var CobroAlmacenSchema = Schema({
	nombreCliente: { type: String, required: true, trim: true, unique: true, index: true },
	idClienteExterno: { type: String, trim: true, default: '', index: true },
	tipoVenta: { type: String, trim: true, lowercase: true, default: 'venta' },
	nit: { type: String, trim: true, default: '' },
	telefono: { type: String, trim: true, default: '' },
	correo: { type: String, trim: true, default: '' },
	direccion: { type: String, trim: true, default: '' },
	observaciones: { type: String, trim: true, default: '' },

	totalVentas: { type: Number, default: 0, min: 0 },
	totalDeuda: { type: Number, default: 0, min: 0 },
	totalAbonado: { type: Number, default: 0, min: 0 },
	totalPendiente: { type: Number, default: 0, min: 0 },
	totalCreditosExternos: { type: Number, default: 0, min: 0 },
	totalAbonosExternos: { type: Number, default: 0, min: 0 },

	ventas: { type: [VentaAlmacenSchema], default: [] },

	clienteExternoData: { type: Schema.Types.Mixed, default: null },
	creditosExternosRaw: { type: [Schema.Types.Mixed], default: [] },
	abonosExternosRaw: { type: [Schema.Types.Mixed], default: [] },
	ultimaSincronizacionExterna: { type: Date, default: null }
}, {
	timestamps: true,
	collection: 'cobraalmacen'
});

module.exports = mongoose.model('CobroAlmacen', CobroAlmacenSchema);
