import mongoose from 'mongoose';
import { ADMIN_ROLES } from '../constants/adminRoles.js';

const adminUserSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, trim: true },
    password_hash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: Object.values(ADMIN_ROLES),
    },
    permissions: { type: [String], default: [] },
    is_active: { type: Number, default: 1 },
    created_at: { type: String, default: () => new Date().toISOString() },
    updated_at: { type: String, default: () => new Date().toISOString() },
  },
  { collection: 'admin_users', versionKey: false },
);

export default mongoose.models.AdminUser
  || mongoose.model('AdminUser', adminUserSchema);
