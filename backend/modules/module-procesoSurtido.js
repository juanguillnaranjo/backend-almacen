'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var FacturaContadoSchema = Schema({
	numeroFactura: { type: String, required: true, trim: true },
	proveedor: { type: String, default: '', trim: true },
	descripcion: { type: String, default: '', trim: true },
	monto: { type: Number, required: true, min: 0.01 }
}, { _id: true });

var ViaticoSchema = Schema({
	concepto: { type: String, required: true, trim: true },
	descripcion: { type: String, default: '', trim: true },
	monto: { type: Number, required: true, min: 0.01 }
}, { _id: true });

var ProcesoSurtidoSchema = Schema({
	fecha: { type: Date, required: true, unique: true, index: true },
	facturasContado: { type: [FacturaContadoSchema], default: [] },
	viaticos: { type: [ViaticoSchema], default: [] },
	totalFacturas: { type: Number, default: 0, min: 0 },
	totalViaticos: { type: Number, default: 0, min: 0 },
	totalProceso: { type: Number, default: 0, min: 0 },
	observaciones: { type: String, default: '', trim: true },
	cuentaSalida: { type: String, default: '', trim: true },
	origen: { type: String, default: 'manual', trim: true }
}, {
	timestamps: true,
	collection: 'procesossurtido'
});

module.exports = mongoose.model('ProcesoSurtido', ProcesoSurtidoSchema);
