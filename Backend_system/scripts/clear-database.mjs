import 'dotenv/config';
import { Client } from 'pg';

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function clearDatabase() {
  console.log('Connecting to database...');
  await client.connect();

  console.log('Starting transaction to clear test data...');
  await client.query('BEGIN');

  const tablesToClear = [
    // 1. Financial & Ledger
    'financial_ledger_entries',
    'payment_attempts',
    'payments',
    'payment_provider_events',
    'payment_status_history',
    'earning_transactions',
    'withdrawal_requests',
    'refund_status_history',
    'refunds',

    // 2. Deliveries & Fulfillments
    'delivery_status_history',
    'delivery_assignment_decisions',
    'delivery_assignment_history',
    'delivery_otps',
    'deliveries',
    'fulfillment_status_history',
    'fulfillment_attempts',
    'fulfillments',

    // 3. Orders & Carts
    'order_cancellation_history',
    'order_status_history',
    'order_items',
    'orders',
    'cart_items',
    'carts',

    // 4. Products & Inventory
    'inventory_reservation_history',
    'inventory_reservations',
    'inventory_adjustments',
    'inventory',
    'business_products',
    'products',

    // 5. Riders
    'rider_wallets',
    'rider_verification_history',
    'rider_verifications',
    'vehicles',
    'riders',

    // 6. Businesses
    'business_wallets',
    'business_verification_requirement_history',
    'business_verification_history',
    'business_verifications',
    'business_operating_exceptions',
    'business_operating_hours',
    'business_order_acceptance_history',
    'business_readiness_history',
    'business_status_history',
    'business_deactivation_history',
    'business_users_legacy',
    'businesses',

    // 7. User Activity, Notifications & Support
    'customer_addresses',
    'customer_profiles',
    'user_verifications',
    'notifications',
    'notification_attempts',
    'notification_push_deliveries',
    'push_subscriptions',
    'contact_messages',
    'incidents',
    'operational_issues',
    'outbox_events',
    'idempotency_keys',
    'audit_logs',
    'admin_permissions'
  ];

  for (const table of tablesToClear) {
    await client.query(`TRUNCATE TABLE public."${table}" CASCADE`);
    console.log(`✓ Cleared table: ${table}`);
  }

  // Preserve Super Admin accounts
  const superAdminId = '03bf9d94-e71b-48eb-906c-489e4065c5a1'; // contact.squadlink@gmail.com
  const superAdminAppId = '88888888-8888-4888-8888-888888888888'; // superadmin@squadlink.app

  // Delete all test accounts
  const deleteResult = await client.query(`
    DELETE FROM public.users
    WHERE id NOT IN ($1, $2)
    RETURNING id, email, role;
  `, [superAdminId, superAdminAppId]);

  console.log(`✓ Deleted ${deleteResult.rowCount} test accounts:`);
  for (const u of deleteResult.rows) {
    console.log(`  - ${u.email} (${u.role})`);
  }

  // Update contact.squadlink@gmail.com with clean profile names
  await client.query(`
    UPDATE public.users
    SET first_name = 'SquadLink',
        last_name = 'Super Admin',
        role = 'SUPER_ADMIN',
        is_active = true,
        admin_approved = true,
        deleted_at = null,
        suspended_at = null
    WHERE id = $1;
  `, [superAdminId]);

  // Synchronize password hash on superadmin@squadlink.app to match contact.squadlink@gmail.com
  await client.query(`
    UPDATE public.users
    SET password_hash = (SELECT password_hash FROM public.users WHERE id = $1),
        role = 'SUPER_ADMIN',
        is_active = true,
        admin_approved = true,
        first_name = 'Super',
        last_name = 'Admin',
        deleted_at = null,
        suspended_at = null
    WHERE id = $2;
  `, [superAdminId, superAdminAppId]);

  // Commit transaction permanently
  await client.query('COMMIT');
  console.log('✓ Transaction committed successfully.');

  // Verify remaining accounts in users table
  const remainingUsers = await client.query(`
    SELECT id, email, role, first_name, last_name, phone_number, is_active, created_at
    FROM public.users;
  `);

  console.log('\n=== REMAINING ACCOUNTS IN DATABASE ===');
  console.table(remainingUsers.rows);

  await client.end();
  console.log('Database purge complete!');
}

clearDatabase().catch(async (err) => {
  console.error('Error clearing database:', err);
  try {
    await client.query('ROLLBACK');
  } catch (rbErr) {
    console.error('Rollback error:', rbErr);
  }
  process.exit(1);
});
