import dns from 'node:dns';
import 'dotenv/config';
import mongoose from 'mongoose';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const raw = process.env.MONGODB_URI || '';
const variants = [];

// original
variants.push(['as-is', raw]);

// ensure db name lionbingo
{
  const u = new URL(raw);
  if (!u.pathname || u.pathname === '/') u.pathname = '/lionbingo';
  if (!u.searchParams.has('retryWrites')) u.searchParams.set('retryWrites', 'true');
  if (!u.searchParams.has('w')) u.searchParams.set('w', 'majority');
  variants.push(['with-db-lionbingo', u.toString()]);
}

// authSource=admin
{
  const u = new URL(raw);
  if (!u.pathname || u.pathname === '/') u.pathname = '/lionbingo';
  u.searchParams.set('authSource', 'admin');
  variants.push(['authSource-admin', u.toString()]);
}

for (const [label, uri] of variants) {
  const safe = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
  process.stdout.write(`[try] ${label} -> ${safe} ... `);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 12000 });
    console.log('OK db=', mongoose.connection.name);
    await mongoose.disconnect();
    console.log('[try] SUCCESS with', label);
    process.exit(0);
  } catch (error) {
    console.log('FAIL', error.codeName || error.code || error.message);
    try { await mongoose.disconnect(); } catch {}
  }
}

console.log('[try] all variants failed');
process.exit(1);
