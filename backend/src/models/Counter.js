import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

export async function getNextSequence(name) {
  const updated = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return updated.seq;
}

export async function ensureSequenceAtLeast(name, minValue) {
  const current = await Counter.findById(name).lean();
  const seq = Number(current?.seq ?? 0);
  if (seq >= minValue) {
    return seq;
  }

  await Counter.findByIdAndUpdate(
    name,
    { $set: { seq: minValue } },
    { upsert: true },
  );
  return minValue;
}

export default Counter;
