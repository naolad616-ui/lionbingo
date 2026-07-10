import mongoose from 'mongoose';

const authSessionSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true },
    user_id: { type: Number, required: true },
    expires_at: { type: String, required: true },
    created_at: { type: String, default: () => new Date().toISOString() },
  },
  { collection: 'auth_sessions', versionKey: false },
);

authSessionSchema.index({ expires_at: 1 });

export default mongoose.models.AuthSession
  || mongoose.model('AuthSession', authSessionSchema);
