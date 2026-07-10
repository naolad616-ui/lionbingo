import mongoose from 'mongoose';

const gameSalesHistorySchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    session_id: { type: String, required: true, unique: true },
    room_id: { type: String, default: 'default' },
    game_started_at: { type: String, required: true },
    game_ended_at: { type: String, required: true },
    final_winning_number: { type: Number, default: null },
    cards_sold: { type: Number, default: 0 },
    bet_amount: { type: Number, default: 0 },
    total_collected: { type: Number, default: 0 },
    commission: { type: Number, default: 0 },
    winner_payout: { type: Number, default: 0 },
    cartela_number: { type: Number, default: null },
    matched_pattern: { type: String, default: null },
    called_count: { type: Number, default: 0 },
    completion_reason: { type: String, default: 'reset' },
    operator_name: { type: String, default: null },
    created_at: { type: String, default: () => new Date().toISOString() },
  },
  { collection: 'game_sales_history', versionKey: false },
);

gameSalesHistorySchema.index({ game_ended_at: 1 });
gameSalesHistorySchema.index({ game_started_at: 1 });

export default mongoose.models.GameSalesHistory
  || mongoose.model('GameSalesHistory', gameSalesHistorySchema);
