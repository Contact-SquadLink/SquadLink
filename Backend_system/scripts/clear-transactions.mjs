import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function clearTransactions() {
  const client = await pool.connect();
  try {
    console.log('[CLEANUP] Starting transactional records cleanup...');
    await client.query('BEGIN');

    // List of exact transactional tables to clear completely
    const tables = [
      'order_items',
      'order_status_history',
      'order_cancellation_history',
      'pickup_verification_history',
      'pickup_verifications',
      'delivery_assignment_history',
      'delivery_assignment_decisions',
      'delivery_status_history',
      'delivery_otps',
      'deliveries',
      'fulfillment_attempts',
      'fulfillment_status_history',
      'fulfillments',
      'payment_attempt_status_history',
      'payment_status_history',
      'payment_provider_events',
      'payment_attempts',
      'payments',
      'refund_status_history',
      'refunds',
      'financial_ledger_entries',
      'earning_transactions',
      'orders',
      'inventory_reservation_history',
      'inventory_reservations',
      'cart_items',
      'carts',
      'withdrawal_requests',
      'incidents',
      'outbox_events',
      'notification_attempts',
      'notifications'
    ];

    for (const table of tables) {
      await client.query(`TRUNCATE TABLE public.${table} CASCADE`);
      console.log(`[CLEANUP] Cleared table: ${table}`);
    }

    // Reset reserved inventory quantities back to 0 without deleting products or available stock
    await client.query(`
      UPDATE public.inventory
      SET quantity_reserved = 0,
          updated_at = NOW(),
          last_updated_at = NOW()
      WHERE quantity_reserved > 0
    `);
    console.log('[CLEANUP] Reset all inventory quantity_reserved to 0');

    // Reset business wallets balance to 0
    try {
      await client.query(`
        UPDATE public.business_wallets
        SET current_balance_amount = 0,
            updated_at = NOW()
      `);
      console.log('[CLEANUP] Reset all business wallets balance to 0');
    } catch {
      // non-blocking
    }

    // Clean up transaction-specific audit logs
    try {
      await client.query(`
        DELETE FROM public.audit_logs
        WHERE entity_type IN ('ORDER', 'PAYMENT', 'DELIVERY', 'FULFILLMENT', 'LEDGER', 'WITHDRAWAL')
      `);
      console.log('[CLEANUP] Cleared transaction audit logs');
    } catch {
      // non-blocking
    }

    await client.query('COMMIT');
    console.log('[CLEANUP] SUCCESS: All transactions, orders, deliveries, payments, earnings, and ledger records have been cleared!');
    console.log('[CLEANUP] User accounts, business profiles, catalog products, and rider profiles remain 100% untouched.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[CLEANUP] ERROR during cleanup:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

clearTransactions();
