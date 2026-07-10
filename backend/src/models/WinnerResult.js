import mongoose from 'mongoose';

const winnerResultSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    room_id: { type: String, required: true },
    cartela_number: { type: Number, required: true },
    total_pool: { type: Number, required: true },
    winner_payout: { type: Number, required: true },
    house_profit: { type: Number, required: true },
    commission_rate: { type: Number, required: true },
    commission_tier_id: { type: String, default: null },
    commission_tier_label: { type: String, default: null },
    cards_sold: { type: Number, default: 0 },
    matched_pattern: { type: String, default: null },
    created_at: { type: String, default: () => new Date().toISOString() },
  },
  { collection: 'winner_results', versionKey: false },
);

winnerResultSchema.index({ created_at: -1 });

export default mongoose.models.WinnerResult
  || mongoose.model('WinnerResult', winnerResultSchema);
