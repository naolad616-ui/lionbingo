import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, default: 1 },
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, trim: true },
    password_hash: { type: String, required: true },
    avatar_path: { type: String, default: null },
    password_set_by_user: { type: Number, default: 0 },
    created_at: { type: String, default: () => new Date().toISOString() },
    updated_at: { type: String, default: () => new Date().toISOString() },
  },
  { collection: 'users', versionKey: false },
);

export default mongoose.models.User || mongoose.model('User', userSchema);
