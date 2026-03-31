'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

const ORIGENES_MODELO_VALIDOS = ['ventas', 'compras', 'gastos', 'pagos', 'ingresos', 'nomina', 'manual', 'cierre_orange', 'deudasorange', 'gastosorange', 'retirosorange', 'gastosfamiliares', 'deudasfamiliares'];

var MovimientoOrangeSchema = Schema({
    cuentaId: { type: Schema.Types.ObjectId, ref: 'CuentaOrange', required: true },
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

module.exports = mongoose.model('MovimientoOrange', MovimientoOrangeSchema);