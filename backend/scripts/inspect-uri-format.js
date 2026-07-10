import 'dotenv/config';

const raw = process.env.MONGODB_URI || '';
console.log('uri_len', raw.length);
console.log('has_quotes', raw.includes('"') || raw.includes("'"));
console.log('has_space', /\s/.test(raw));
console.log('ends_with', JSON.stringify(raw.slice(-20)));
console.log('has_authSource', raw.includes('authSource'));
console.log('has_db_path', /mongodb\.net\/[^?]/.test(raw));
