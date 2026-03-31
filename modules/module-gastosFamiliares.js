const mongoose = require('mongoose');

const GastoFamiliarSchema = new mongoose.Schema(
  {
    fecha: {
      type: Date,
      required: true,
      index: true,
      default: new Date()
    },
    monto: {
      type: Number,
      required: true,
      min: 0.01
    },
    tipoGasto: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    categoriaGasto: {
      type: String,
      required: false
    },
    descripcion: {
      type: String,
      required: true
    },
    observaciones: {
      type: String,
      required: false
    },
    medioPago: {
      type: String,
      required: true,
      enum: ['efectivo', 'banco'],
      lowercase: true,
      trim: true,
      default: 'efectivo'
    },
    cuentaDebeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CuentaOrange',
      required: true
    },
    cuentaHaberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CuentaOrange',
      required: true
    }
  },
  { timestamps: true }
);

GastoFamiliarSchema.pre('findOne', function() {
  this.populate('cuentaDebeId').populate('cuentaHaberId');
});

GastoFamiliarSchema.pre('find', function() {
  this.populate('cuentaDebeId').populate('cuentaHaberId');
});

module.exports = mongoose.model('GastoFamiliar', GastoFamiliarSchema);
