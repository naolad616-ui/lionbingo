import dns from 'node:dns';
import 'dotenv/config';
import fs from 'node:fs';
import mongoose from 'mongoose';

dns.setServers(['8.8.8.8', '1.1.1.1']);

function splitUri(raw) {
  const prefix = 'mongodb+srv://';
  if (!raw.startsWith(prefix)) {
    throw new Error('MONGODB_URI must start with mongodb+srv://');
  }
  const rest = raw.slice(prefix.length);
  const at = rest.lastIndexOf('@');
  if (at < 0) throw new Error('MONGODB_URI missing host @');
  const creds = rest.slice(0, at);
  const hostAndQuery = rest.slice(at + 1);
  const colon = creds.indexOf(':');
  if (colon < 0) throw new Error('MONGODB_URI missing username:password');
  return {
    user: decodeURIComponent(creds.slice(0, colon)),
    passRaw: creds.slice(colon + 1),
    hostAndQuery,
  };
}

function safeUri(uri) {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}

async function tryConnect(label, uri) {
  process.stdout.write(`[verify] ${label} ... `);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
    console.log('OK db=', mongoose.connection.name || '(default)');
    const cols = await mongoose.connection.db.listCollections().toArray();
    console.log('[verify] collections=', cols.map((c) => c.name).sort().join(', ') || '(none)');
    await mongoose.disconnect();
    return true;
  } catch (error) {
    console.log('FAIL', error.codeName || error.code || error.message);
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
    return false;
  }
}

const raw = String(process.env.MONGODB_URI || '').trim().replace(/^["']|["']$/g, '');
if (!raw) {
  console.error('[verify] MONGODB_URI is empty');
  process.exit(1);
}

console.log('[verify] uri=', safeUri(raw));
console.log('[verify] uri_len=', raw.length);

const { user, passRaw, hostAndQuery } = splitUri(raw);
const looksEncoded = /%[0-9A-Fa-f]{2}/.test(passRaw);
let decodedPass = passRaw;
if (looksEncoded) {
  try {
    decodedPass = decodeURIComponent(passRaw);
  } catch {
    decodedPass = passRaw;
  }
}

console.log('[verify] user=', user);
console.log('[verify] pass_len=', decodedPass.length);
console.log('[verify] pass_encoded_in_env=', looksEncoded);

const encodedUri = `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(decodedPass)}@${hostAndQuery}`;
const withDb = (() => {
  const u = new URL(encodedUri);
  if (!u.pathname || u.pathname === '/') u.pathname = '/lionbingo';
  if (!u.searchParams.has('retryWrites')) u.searchParams.set('retryWrites', 'true');
  if (!u.searchParams.has('w')) u.searchParams.set('w', 'majority');
  return u.toString();
})();

const candidates = [
  ['as-is', raw],
  ['encoded-password', encodedUri],
  ['encoded+lionbingo-db', withDb],
];

let successUri = null;
for (const [label, uri] of candidates) {
  if (await tryConnect(label, uri)) {
    successUri = uri;
    break;
  }
}

if (!successUri) {
  console.error('[verify] authentication failed for all candidates');
  process.exit(1);
}

let env = fs.readFileSync('.env', 'utf8');
env = env.replace(/^MONGODB_URI=.*$/m, `MONGODB_URI=${successUri}`);
fs.writeFileSync('.env', env);
console.log('[verify] SUCCESS — working URI saved to .env');
console.log('[verify] working=', safeUri(successUri));
