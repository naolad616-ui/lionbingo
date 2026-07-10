import mongoose from 'mongoose';

const cartelaSchema = new mongoose.Schema(
  {
    card_id: { type: Number, required: true, unique: true },
    grid: { type: [[Number]], required: true },
    updated_at: { type: String, default: () => new Date().toISOString() },
  },
  { collection: 'cartelas', versionKey: false },
);

export default mongoose.models.Cartela || mongoose.model('Cartela', cartelaSchema);
