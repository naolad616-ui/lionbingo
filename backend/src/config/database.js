import dns from 'node:dns';
import mongoose from 'mongoose';

// Local/ISP resolvers often refuse MongoDB SRV lookups (querySrv ECONNREFUSED).
// Use public DNS — same workaround as the migration scripts.
dns.setServers(['8.8.8.8', '1.1.1.1']);

let connectionPromise = null;

export function getMongoUri() {
  const uri = String(process.env.MONGODB_URI || '').trim();
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. Add your MongoDB Atlas connection string to the environment.',
    );
  }
  return uri;
}

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const uri = getMongoUri();

  connectionPromise = mongoose
    .connect(uri, {
      serverSelectionTimeoutMS: 15000,
    })
    .then((connection) => {
      console.log('[db] Connected to MongoDB Atlas');
      return connection;
    })
    .catch((error) => {
      connectionPromise = null;
      throw error;
    });

  return connectionPromise;
}

export async function initializeDatabase() {
  await connectDatabase();
  return mongoose.connection;
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

export default mongoose;
