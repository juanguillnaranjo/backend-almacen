'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var AbonoFacturaMiaSchema = Schema({
	fecha: { type: Date, required: true },
	monto: { type: Number, required: true, min: 0.01 },
	descripcion: { type: String, default: '' },
	cuentaDebeId: { type: Schema.Types.ObjectId, ref: 'CuentaMia', required: true },
	cuentaHaberId: { type: Schema.Types.ObjectId, ref: 'CuentaMia', required: true }
}, { _id: false });

var FacturaMiaSchema = Schema({
	numeroFactura: { type: String, required: true, trim: true },
	tipoCobro: { type: String, required: true, trim: true, lowercase: true, default: 'otros' },
	fechaFactura: { type: Date, required: true },
	montoFactura: { type: Number, required: true, min: 0.01 },
	montoAbonado: { type: Number, required: true, default: 0, min: 0 },
	saldoPendiente: { type: Number, required: true, min: 0 },
	estado: { type: String, enum: ['pendiente', 'parcial', 'pagada'], default: 'pendiente' },
	cuentaDebeId: { type: Schema.Types.ObjectId, ref: 'CuentaMia', required: true },
	cuentaHaberId: { type: Schema.Types.ObjectId, ref: 'CuentaMia', required: true },
	abonos: { type: [AbonoFacturaMiaSchema], default: [] }
});

var CobroMioSchema = Schema({
	nombreDeudor: { type: String, required: true, trim: true, unique: true, index: true },
	tipoCobro: { type: String, trim: true, lowercase: true, default: 'otros' },
	nit: { type: String, trim: true, default: '' },
	telefono: { type: String, trim: true, default: '' },
	correo: { type: String, trim: true, default: '' },
	direccion: { type: String, trim: true, default: '' },
	observaciones: { type: String, trim: true, default: '' },

	totalFacturas: { type: Number, default: 0, min: 0 },
	totalDeuda: { type: Number, default: 0, min: 0 },
	totalAbonado: { type: Number, default: 0, min: 0 },
	totalPendiente: { type: Number, default: 0, min: 0 },

	facturas: { type: [FacturaMiaSchema], default: [] }
}, {
	timestamps: true,
	collection: 'cobrarmias'
});

module.exports = mongoose.model('CobroMio', CobroMioSchema);
