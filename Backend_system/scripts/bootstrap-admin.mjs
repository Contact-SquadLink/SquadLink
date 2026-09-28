import { Client } from 'pg';
import 'dotenv/config';

const email = 'contact.squadlink@gmail.com';
const passwordHash = '$2b$12$d/6BnZY4VsEPBKVIADtcb.KwX61C.1T5TMIZt3CEVgDR/vR3zJVTa';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

try {
  await client.connect();

  const result = await client.query(
    `
      INSERT INTO public.users (
        email,
        password_hash,
        role,
        is_active,
        admin_approved,
        approved_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, 'SUPER_ADMIN', TRUE, TRUE, NOW(), NOW(), NOW())
      ON CONFLICT (email) DO UPDATE
      SET
        password_hash = EXCLUDED.password_hash,
        role = 'SUPER_ADMIN',
        is_active = TRUE,
        admin_approved = TRUE,
        approved_at = NOW(),
        updated_at = NOW()
      RETURNING id, email, role, is_active, admin_approved;
    `,
    [email, passwordHash]
  );

  console.log('Admin account ready:', JSON.stringify(result.rows[0], null, 2));
} catch (error) {
  console.error('Failed to create admin account:', error);
  process.exit(1);
} finally {
  await client.end();
}
