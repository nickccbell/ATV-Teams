import postgres from 'postgres';
const sql = postgres('postgres://paperclip:paperclip@127.0.0.1:54329/paperclip', { connect_timeout: 5 });
try {
  const r = await sql`SELECT 1 as ok`;
  console.log('pg ok:', JSON.stringify(r));
} catch(e) { console.error('pg err:', e.message); }
await sql.end({ timeout: 1 });
