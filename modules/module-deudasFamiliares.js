'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var AbonoFacturaFamiliarSchema = Schema({
	fecha: { type: Date, required: true },
	monto: { type: Number, required: true, min: 0.01 },
	descripcion: { type: String, default: '' },
	cuentaSalidaIdCuenta: { type: String, required: true, trim: true },
	cuentaSalidaNombre: { type: String, default: '' }
}, { _id: false });

var FacturaReferenciaFamiliarSchema = Schema({
	numeroFactura: { type: String, required: true, trim: true },
	tipoDeuda: { type: String, required: true, trim: true, lowercase: true, default: 'otros' },
	cuentaDebeId: { type: mongoose.Schema.Types.ObjectId, ref: 'CuentaOrange', required: false },
	cuentaDebeIdCuenta: { type: String, trim: true, default: '' },
	cuentaDebeNombre: { type: String, trim: true, default: '' },
	cuentaHaberId: { type: mongoose.Schema.Types.ObjectId, ref: 'CuentaOrange', required: false },
	cuentaHaberIdCuenta: { type: String, trim: true, default: '' },
	cuentaHaberNombre: { type: String, trim: true, default: '' },
	fechaFactura: { type: Date, required: true },
	montoFactura: { type: Number, required: true, min: 0.01 },
	montoAbonado: { type: Number, required: true, default: 0, min: 0 },
	saldoPendiente: { type: Number, required: true, min: 0 },
	estado: { type: String, enum: ['pendiente', 'parcial', 'pagada'], default: 'pendiente' },
	abonos: { type: [AbonoFacturaFamiliarSchema], default: [] }
});

var DeudaFamiliarSchema = Schema({
	nombreProveedor: { type: String, required: true, trim: true, unique: true, index: true },
	tipoDeuda: { type: String, trim: true, lowercase: true, default: '' },
	tiposRelacionados: { type: [String], default: [] },
	datoContacto: { type: String, trim: true, default: '' },
	nit: { type: String, trim: true, default: '' },
	telefono: { type: String, trim: true, default: '' },
	correo: { type: String, trim: true, default: '' },
	direccion: { type: String, trim: true, default: '' },
	observaciones: { type: String, trim: true, default: '' },

	totalFacturas: { type: Number, default: 0, min: 0 },
	totalDeuda: { type: Number, default: 0, min: 0 },
	totalAbonado: { type: Number, default: 0, min: 0 },
	totalPendiente: { type: Number, default: 0, min: 0 },

	facturas: { type: [FacturaReferenciaFamiliarSchema], default: [] }
}, {
	timestamps: true,
	collection: 'deudasfamiliares'
});

module.exports = mongoose.model('DeudaFamiliar', DeudaFamiliarSchema);
