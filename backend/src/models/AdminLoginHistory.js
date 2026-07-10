import mongoose from 'mongoose';

const adminLoginHistorySchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    admin_id: { type: Number, default: null },
    username: { type: String, required: true },
    action: { type: String, required: true },
    ip_address: { type: String, default: null },
    user_agent: { type: String, default: null },
    success: { type: Number, default: 1 },
    details: { type: String, default: null },
    created_at: { type: String, default: () => new Date().toISOString() },
  },
  { collection: 'admin_login_history', versionKey: false },
);

adminLoginHistorySchema.index({ created_at: -1 });

export default mongoose.models.AdminLoginHistory
  || mongoose.model('AdminLoginHistory', adminLoginHistorySchema);
