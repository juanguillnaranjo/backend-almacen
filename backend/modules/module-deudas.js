'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var AbonoFacturaSchema = Schema({
	fecha: { type: Date, required: true },
	monto: { type: Number, required: true, min: 0.01 },
	descripcion: { type: String, default: '' },
	cuentaSalida: { type: String, default: '' }
}, { _id: false });

var FacturaReferenciaSchema = Schema({
	numeroFactura: { type: String, required: true, trim: true },
	fechaFactura: { type: Date, required: true },
	montoFactura: { type: Number, required: true, min: 0.01 },
	montoAbonado: { type: Number, required: true, default: 0, min: 0 },
	saldoPendiente: { type: Number, required: true, min: 0 },
	estado: { type: String, enum: ['pendiente', 'parcial', 'pagada'], default: 'pendiente' },
	abonos: { type: [AbonoFacturaSchema], default: [] }
});

var DeudaProveedorSchema = Schema({
	nombreProveedor: { type: String, required: true, trim: true, unique: true, index: true },
	nit: { type: String, trim: true, default: '' },
	telefono: { type: String, trim: true, default: '' },
	correo: { type: String, trim: true, default: '' },
	direccion: { type: String, trim: true, default: '' },
	observaciones: { type: String, trim: true, default: '' },

	totalFacturas: { type: Number, default: 0, min: 0 },
	totalDeuda: { type: Number, default: 0, min: 0 },
	totalAbonado: { type: Number, default: 0, min: 0 },
	totalPendiente: { type: Number, default: 0, min: 0 },

	facturas: { type: [FacturaReferenciaSchema], default: [] }
}, {
	timestamps: true,
	collection: 'deudasproveedores'
});

module.exports = mongoose.model('DeudaProveedor', DeudaProveedorSchema);
