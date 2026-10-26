const { Schema, model } = require('mongoose');

const equipmentSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    category: { type: String, enum: ['audio', 'cuerdas', 'percusion'], required: true },
    totalUnits: { type: Number, required: true, min: 1, validate: Number.isInteger },
    availableUnits: {
      type: Number,
      min: 0,
      validate: [
        { validator: Number.isInteger, message: 'availableUnits debe ser entero' },
        {
          validator: function (v) {
            return this.totalUnits === undefined || v <= this.totalUnits;
          },
          message: 'availableUnits no puede superar totalUnits',
        },
      ],
      // Empieza igual a totalUnits
      default: function () {
        return this.totalUnits;
      },
    },
  },
  { timestamps: true }
);

module.exports = model('Equipment', equipmentSchema);
