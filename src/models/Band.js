const { Schema, model } = require('mongoose');

const bandSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, minlength: 2, maxlength: 50 },
    genre: { type: String, enum: ['rock', 'jazz', 'coral', 'otro'], default: 'otro' },
    active: { type: Boolean, default: true },
    contactName: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

module.exports = model('Band', bandSchema);
