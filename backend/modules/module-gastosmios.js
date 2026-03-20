const mongoose = require('mongoose');

const GastoMioSchema = new mongoose.Schema(
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
    cuentaDebeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CuentaMia',
      required: true
    },
    cuentaHaberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CuentaMia',
      required: true
    }
  },
  { timestamps: true }
);

GastoMioSchema.pre('findOne', function() {
  this.populate('cuentaDebeId').populate('cuentaHaberId');
});

GastoMioSchema.pre('find', function() {
  this.populate('cuentaDebeId').populate('cuentaHaberId');
});

module.exports = mongoose.model('GastoMio', GastoMioSchema);
