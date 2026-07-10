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
  if (at < 0) throw new Error('MONGODB_URI missing host separator @');
  const creds = rest.slice(0, at);
  const hostAndQuery = rest.slice(at + 1);
  const colon = creds.indexOf(':');
  if (colon < 0) throw new Error('MONGODB_URI missing username:password');
  return {
    user: creds.slice(0, colon),
    pass: creds.slice(colon + 1),
    hostAndQuery,
  };
}

function buildUri(user, pass, hostAndQuery) {
  return `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${hostAndQuery}`;
}

function safeUri(uri) {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}

async function tryConnect(label, uri) {
  process.stdout.write(`[try] ${label} ... `);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    console.log('OK db=', mongoose.connection.name);
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

const raw = String(process.env.MONGODB_URI || '').trim();
if (!raw) {
  console.error('MONGODB_URI is empty');
  process.exit(1);
}

const { user, pass, hostAndQuery } = splitUri(raw);
const looksEncoded = /%[0-9A-Fa-f]{2}/.test(pass);
let decodedPass = pass;
if (looksEncoded) {
  try {
    decodedPass = decodeURIComponent(pass);
  } catch {
    decodedPass = pass;
  }
}

console.log('user', user);
console.log('pass_len_raw', pass.length);
console.log('pass_looks_encoded', looksEncoded);
console.log('pass_len_decoded', decodedPass.length);
console.log('host', hostAndQuery.slice(0, 50));

const candidates = [
  ['as-is', raw],
  ['encode-decoded-pass', buildUri(user, decodedPass, hostAndQuery)],
];

// Prefer lionbingo db path
{
  const u = new URL(candidates[1][1]);
  if (!u.pathname || u.pathname === '/') u.pathname = '/lionbingo';
  if (!u.searchParams.has('retryWrites')) u.searchParams.set('retryWrites', 'true');
  if (!u.searchParams.has('w')) u.searchParams.set('w', 'majority');
  candidates.push(['encoded+lionbingo-db', u.toString()]);
}

let successUri = null;
for (const [label, uri] of candidates) {
  console.log('candidate', label, safeUri(uri));
  if (await tryConnect(label, uri)) {
    successUri = uri;
    break;
  }
}

if (!successUri) {
  console.error('[result] authentication still failing');
  process.exit(1);
}

// Persist working URI
let env = fs.readFileSync('.env', 'utf8');
if (!/^MONGODB_URI=/m.test(env)) {
  env += `\nMONGODB_URI=${successUri}\n`;
} else {
  env = env.replace(/^MONGODB_URI=.*$/m, `MONGODB_URI=${successUri}`);
}
fs.writeFileSync('.env', env);
console.log('[result] saved working MONGODB_URI to .env');
