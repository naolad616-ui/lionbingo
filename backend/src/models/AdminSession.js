import mongoose from 'mongoose';

const adminSessionSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true },
    admin_id: { type: Number, required: true, index: true },
    expires_at: { type: String, required: true },
    created_at: { type: String, default: () => new Date().toISOString() },
  },
  { collection: 'admin_sessions', versionKey: false },
);

export default mongoose.models.AdminSession
  || mongoose.model('AdminSession', adminSessionSchema);
