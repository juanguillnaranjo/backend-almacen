'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

const ORIGENES_MODELO_VALIDOS = ['gastofamilias', 'pagos', 'salidascaja', 'adicionbase', 'cierresdiarios', 'deudasproveedores', 'deudasmias', 'cobrarmias', 'procesossurtido', 'ingresosmios', 'gastosmios', 'manual'];

var MovimientoMioSchema = Schema({
	cuentaId: { type: Schema.Types.ObjectId, ref: 'CuentaMia', required: true },
	origenModelo: {
		type: String,
		required: true,
		trim: true,
		lowercase: true,
		enum: ORIGENES_MODELO_VALIDOS,
		index: true
	},
	_idOrigen: { type: Schema.Types.ObjectId, required: true, index: true },
	debe: { type: Number, default: 0 },
	haber: { type: Number, default: 0 },
	descripcion: { type: String, required: true },
	fecha: { type: Date, required: true }
});

module.exports = mongoose.model('MovimientoMio', MovimientoMioSchema);
