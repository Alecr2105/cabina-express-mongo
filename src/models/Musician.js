const { Schema, model } = require('mongoose');

const musicianSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    instrument: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    band: { type: Schema.Types.ObjectId, ref: 'Band', required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

musicianSchema.index({ band: 1 });

module.exports = model('Musician', musicianSchema);
