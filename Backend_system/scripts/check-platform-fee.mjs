import 'dotenv/config';
import { Client } from 'pg';
const client = new Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  const result = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name IN ('platform_fee_amount', 'business_fee_amount')
    ORDER BY column_name
  `);
  const migration = await client.query("SELECT version, name FROM public.schema_migrations WHERE version IN ('095', '096') ORDER BY version");
  const constraints = await client.query("SELECT conname, convalidated FROM pg_constraint WHERE conname IN ('chk_orders_platform_fee', 'chk_orders_business_fee') ORDER BY conname");
  console.log(JSON.stringify({ column: result.rows, migration: migration.rows, constraints: constraints.rows }, null, 2));
} finally {
  await client.end();
}
