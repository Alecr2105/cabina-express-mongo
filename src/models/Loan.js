const { Schema, model } = require('mongoose');

const loanSchema = new Schema(
  {
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    equipment: { type: Schema.Types.ObjectId, ref: 'Equipment', required: true },
    units: { type: Number, required: true, min: 1, validate: Number.isInteger },
    status: { type: String, enum: ['prestado', 'devuelto'], default: 'prestado' },
  },
  { timestamps: true }
);

// Préstamos de una reserva
loanSchema.index({ booking: 1 });
// Préstamos activos/devueltos de un equipo
loanSchema.index({ equipment: 1, status: 1 });

module.exports = model('Loan', loanSchema);
