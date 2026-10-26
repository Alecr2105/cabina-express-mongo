const { Schema, model } = require('mongoose');

const bookingSchema = new Schema(
  {
    room: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    band: { type: Schema.Types.ObjectId, ref: 'Band', required: true },
    date: { type: Date, required: true },
    startHour: { type: Number, required: true, min: 8, max: 21, validate: Number.isInteger },
    endHour: { type: Number, required: true, min: 9, max: 22, validate: Number.isInteger },
    status: { type: String, enum: ['apartada', 'confirmada', 'cancelada'], default: 'apartada' },
    notes: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

bookingSchema.virtual('durationHours').get(function () {
  return this.endHour - this.startHour;
});

// Horario del día de una sala (traslape y GET /rooms/:id/schedule)
bookingSchema.index({ room: 1, date: 1, startHour: 1 });

module.exports = model('Booking', bookingSchema);
