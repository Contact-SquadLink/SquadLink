import { Client } from 'pg';
const client = new Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  const result = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'platform_fee_amount'
  `);
  const migration = await client.query("SELECT version, name FROM public.schema_migrations WHERE version = '095'");
  const constraints = await client.query("SELECT conname, convalidated FROM pg_constraint WHERE conname = 'chk_orders_platform_fee'");
  console.log(JSON.stringify({ column: result.rows, migration: migration.rows, constraints: constraints.rows }, null, 2));
} finally {
  await client.end();
}
