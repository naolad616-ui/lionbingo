import dns from 'node:dns';
import 'dotenv/config';

// Some Windows/local resolvers refuse MongoDB SRV lookups.
dns.setServers(['8.8.8.8', '1.1.1.1']);

await import('./migrate-sqlite-to-mongo.js');
