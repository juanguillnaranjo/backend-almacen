const mongoose = require('mongoose');

const TipoDeudaMiaSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('TipoDeudaMia', TipoDeudaMiaSchema);
