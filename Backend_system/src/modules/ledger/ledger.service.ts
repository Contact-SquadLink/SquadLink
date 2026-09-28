import type { PoolClient } from "pg";
import { randomUUID } from "node:crypto";
import { db } from "../../db/database";

export interface UnitEconomics {
  orderId: string;
  deliveryId: string;
  gmv: number;
  customerPlatformFee: number;
  merchantCommission: number;
  deliveryFee: number;
  riderPayout: number;
  gatewayFee: number;
  merchantPayout: number;
  netContribution: number;
  totalCustomerPaid: number;
}

export interface SettlementParticipantContext {
  orderId: string;
  deliveryId: string;
  riderId: string | null;
  riderUserId: string | null;
  businessId: string | null;
  businessOwnerUserId: string | null;
}

/**
 * Calculates exact unit economics and records balanced double-entry financial ledger entries
 * for a completed delivery order, matching the S-VCG Business Plan and Unit Economics Model:
 * 
 * Contribution = (Customer Fee + Merchant Commission + Delivery Fee) - (Rider Payout + Gateway Fee)
 */
export async function calculateAndRecordOrderSettlement(
  client: PoolClient,
  context: SettlementParticipantContext
): Promise<UnitEconomics> {
  // Check if ledger entry group already exists for this order (idempotent settlement)
  const existingLedger = await client.query<{ metadata: UnitEconomics }>(
    `SELECT metadata FROM public.financial_ledger_entries WHERE order_id = $1 LIMIT 1`,
    [context.orderId]
  );
  if (existingLedger.rows.length > 0 && existingLedger.rows[0].metadata?.netContribution !== undefined) {
    return existingLedger.rows[0].metadata;
  }

  // Load order details
  const orderResult = await client.query<{
    id: string;
    subtotal_amount: number | string;
    delivery_fee_amount: number | string;
    platform_fee_amount: number | string;
    business_fee_amount: number | string;
    total_amount: number | string;
  }>(
    `SELECT id, subtotal_amount, delivery_fee_amount, platform_fee_amount, business_fee_amount, total_amount
     FROM public.orders
     WHERE id = $1
     FOR UPDATE`,
    [context.orderId]
  );

  const order = orderResult.rows[0];
  const gmv = Number(order?.subtotal_amount ?? 0);
  const deliveryFee = Number(order?.delivery_fee_amount ?? 0);
  const customerPlatformFee = Number(order?.platform_fee_amount ?? 120); // Pilot target: ₦100 - ₦150
  const businessFeeAmount = Number(order?.business_fee_amount ?? 0);
  const totalCustomerPaid = Number(order?.total_amount ?? (gmv + deliveryFee + customerPlatformFee));

  // Dynamic merchant commission: business_fee_amount or 10% of GMV
  const merchantCommission = businessFeeAmount > 0 ? businessFeeAmount : Math.round(gmv * 0.10);
  const merchantPayout = Math.max(0, gmv - merchantCommission);

  // Gateway cost: 1.5% of total payment processed
  const gatewayFee = Math.max(0, Math.round(totalCustomerPaid * 0.015));

  // Rider payout: 80% of delivery fee (min ₦300 or delivery fee)
  const riderPayout = deliveryFee > 0 ? Math.max(300, Math.round(deliveryFee * 0.8)) : Math.max(300, Math.round(gmv * 0.10));

  // Net Platform Contribution per Order:
  // Contribution = (Customer Fee + Merchant Commission + Delivery Fee) - (Rider Payout + Gateway Fee)
  const netContribution = (customerPlatformFee + merchantCommission + deliveryFee) - (riderPayout + gatewayFee);

  const unitEconomics: UnitEconomics = {
    orderId: context.orderId,
    deliveryId: context.deliveryId,
    gmv,
    customerPlatformFee,
    merchantCommission,
    deliveryFee,
    riderPayout,
    gatewayFee,
    merchantPayout,
    netContribution,
    totalCustomerPaid,
  };

  const entryGroupId = randomUUID();
  const metadataJson = JSON.stringify(unitEconomics);

  // Balanced Double-Entry System
  // Total Debits must equal Total Credits:
  // DEBITS:
  // 1. ASSET:GATEWAY_RECEIVABLE (totalCustomerPaid - gatewayFee)
  // 2. EXPENSE:GATEWAY_PROCESSING_FEE (gatewayFee)
  // Total Debits = totalCustomerPaid
  //
  // CREDITS:
  // 1. LIABILITY:MERCHANT_PAYABLE (merchantPayout)
  // 2. LIABILITY:RIDER_PAYABLE (riderPayout)
  // 3. REVENUE:CUSTOMER_SERVICE_FEE (customerPlatformFee)
  // 4. REVENUE:MERCHANT_COMMISSION (merchantCommission)
  // 5. REVENUE:DELIVERY_MARGIN (deliveryFee - riderPayout)
  // Total Credits = (gmv - commission) + riderPayout + customerFee + commission + (deliveryFee - riderPayout)
  //               = gmv + customerFee + deliveryFee = totalCustomerPaid

  const ledgerEntries = [
    // Debits
    {
      account: "ASSET:GATEWAY_RECEIVABLE",
      type: "DEBIT",
      amount: totalCustomerPaid - gatewayFee,
      desc: "Net funds receivable from payment gateway authorization",
    },
    {
      account: "EXPENSE:GATEWAY_PROCESSING_FEE",
      type: "DEBIT",
      amount: gatewayFee,
      desc: "Payment gateway transaction processing fee (1.5%)",
    },
    // Credits
    {
      account: "LIABILITY:MERCHANT_PAYABLE",
      type: "CREDIT",
      amount: merchantPayout,
      desc: "Net merchandise earnings owed to merchant",
    },
    {
      account: "LIABILITY:RIDER_PAYABLE",
      type: "CREDIT",
      amount: riderPayout,
      desc: "Net delivery fulfillment earnings owed to rider",
    },
    {
      account: "REVENUE:CUSTOMER_SERVICE_FEE",
      type: "CREDIT",
      amount: customerPlatformFee,
      desc: "Pilot platform customer service fee (₦100-₦150 target)",
    },
    {
      account: "REVENUE:MERCHANT_COMMISSION",
      type: "CREDIT",
      amount: merchantCommission,
      desc: "Platform merchant fulfillment commission",
    },
    {
      account: "REVENUE:DELIVERY_MARGIN",
      type: "CREDIT",
      amount: Math.max(0, deliveryFee - riderPayout),
      desc: "Platform delivery coordination margin retention",
    },
  ];

  for (const entry of ledgerEntries) {
    if (entry.amount >= 0) {
      await client.query(
        `INSERT INTO public.financial_ledger_entries (
          order_id, delivery_id, entry_group_id, account_name, entry_type, amount, currency, description, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, 'NGN', $7, $8::jsonb)`,
        [
          context.orderId,
          context.deliveryId,
          entryGroupId,
          entry.account,
          entry.type,
          entry.amount,
          entry.desc,
          metadataJson,
        ]
      );
    }
  }

  // Credit recipient wallets
  // 1. Rider wallet
  if (context.riderId && riderPayout > 0) {
    await client.query(
      `INSERT INTO public.rider_wallets (rider_id, current_balance_amount, currency)
       VALUES ($1, $2, 'NGN')
       ON CONFLICT (rider_id)
       DO UPDATE SET current_balance_amount = rider_wallets.current_balance_amount + $2, updated_at = NOW()`,
      [context.riderId, riderPayout]
    );

    if (context.riderUserId) {
      await client.query(
        `INSERT INTO public.earning_transactions (
          recipient_user_id, recipient_type, delivery_id, order_id, amount, description
        ) VALUES ($1, 'RIDER', $2, $3, $4, 'Delivery rider verified fulfillment earnings')
        ON CONFLICT DO NOTHING`,
        [context.riderUserId, context.deliveryId, context.orderId, riderPayout]
      );
    }
  }

  // 2. Business wallet
  if (context.businessId && merchantPayout > 0) {
    await client.query(
      `INSERT INTO public.business_wallets (business_id, current_balance_amount, currency)
       VALUES ($1, $2, 'NGN')
       ON CONFLICT (business_id)
       DO UPDATE SET current_balance_amount = business_wallets.current_balance_amount + $2, updated_at = NOW()`,
      [context.businessId, merchantPayout]
    );

    if (context.businessOwnerUserId) {
      await client.query(
        `INSERT INTO public.earning_transactions (
          recipient_user_id, recipient_type, delivery_id, order_id, amount, description
        ) VALUES ($1, 'BUSINESS', $2, $3, $4, 'Merchant verified order fulfillment earnings')
        ON CONFLICT DO NOTHING`,
        [context.businessOwnerUserId, context.deliveryId, context.orderId, merchantPayout]
      );
    }
  }

  return unitEconomics;
}

/**
 * Super Admin Financial Observability Query
 * Aggregates GMV, Total Platform Revenue, Net Contribution per Order, and active metrics
 */
export async function getFinancialObservabilitySummary() {
  const result = await db.query<{
    total_gmv: string;
    total_platform_revenue: string;
    total_net_contribution: string;
    completed_orders_count: string;
    total_gateway_fees: string;
    total_rider_payouts: string;
    total_merchant_payouts: string;
  }>(`
    SELECT
      COALESCE(SUM(o.subtotal_amount) FILTER (WHERE o.status = 'DELIVERED'), 0)::text AS total_gmv,
      COALESCE(SUM(o.platform_fee_amount + o.business_fee_amount) FILTER (WHERE o.status = 'DELIVERED'), 0)::text AS total_platform_revenue,
      COALESCE(SUM(
        (o.platform_fee_amount + o.business_fee_amount + o.delivery_fee_amount) - 
        (GREATEST(300, ROUND(o.delivery_fee_amount * 0.8)) + ROUND(o.total_amount * 0.015))
      ) FILTER (WHERE o.status = 'DELIVERED'), 0)::text AS total_net_contribution,
      COUNT(*) FILTER (WHERE o.status = 'DELIVERED')::text AS completed_orders_count,
      COALESCE(SUM(ROUND(o.total_amount * 0.015)) FILTER (WHERE o.status = 'DELIVERED'), 0)::text AS total_gateway_fees,
      COALESCE(SUM(GREATEST(300, ROUND(o.delivery_fee_amount * 0.8))) FILTER (WHERE o.status = 'DELIVERED'), 0)::text AS total_rider_payouts,
      COALESCE(SUM(GREATEST(0, o.subtotal_amount - o.business_fee_amount)) FILTER (WHERE o.status = 'DELIVERED'), 0)::text AS total_merchant_payouts
    FROM public.orders o
  `);

  const row = result.rows[0];
  const completedCount = Number(row.completed_orders_count) || 0;
  const netContribution = Number(row.total_net_contribution);
  const avgContributionPerOrder = completedCount > 0 ? Math.round((netContribution / completedCount) * 100) / 100 : 0;

  return {
    grossMerchandiseValue: Number(row.total_gmv),
    totalPlatformRevenue: Number(row.total_platform_revenue),
    totalNetContribution: netContribution,
    averageContributionPerOrder: avgContributionPerOrder,
    completedOrdersCount: completedCount,
    totalGatewayFees: Number(row.total_gateway_fees),
    totalRiderPayouts: Number(row.total_rider_payouts),
    totalMerchantPayouts: Number(row.total_merchant_payouts),
  };
}

/**
 * Super Admin query to inspect double-entry platform ledger entries
 */
export async function getFinancialLedgerEntries(options: {
  orderId?: string;
  accountName?: string;
  limit?: number;
  offset?: number;
}) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options.orderId) {
    params.push(options.orderId);
    conditions.push(`fle.order_id = $${params.length}`);
  }

  if (options.accountName) {
    params.push(options.accountName);
    conditions.push(`fle.account_name = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  params.push(limit, offset);

  const query = `
    SELECT
      fle.id,
      fle.order_id AS "orderId",
      fle.delivery_id AS "deliveryId",
      fle.entry_group_id AS "entryGroupId",
      fle.account_name AS "accountName",
      fle.entry_type AS "entryType",
      fle.amount,
      fle.currency,
      fle.description,
      fle.metadata,
      fle.created_at AS "createdAt"
    FROM public.financial_ledger_entries fle
    ${whereClause}
    ORDER BY fle.created_at DESC, fle.entry_group_id ASC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  const filterParams = params.slice(0, params.length - 2);
  const [entriesResult, balanceResult] = await Promise.all([
    db.query(query, params),
    db.query<{ total_debits: string; total_credits: string }>(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE entry_type = 'DEBIT'), 0)::text AS total_debits,
        COALESCE(SUM(amount) FILTER (WHERE entry_type = 'CREDIT'), 0)::text AS total_credits
      FROM public.financial_ledger_entries fle
      ${whereClause}
    `, filterParams),
  ]);

  const totalDebits = Number(balanceResult.rows[0].total_debits);
  const totalCredits = Number(balanceResult.rows[0].total_credits);
  const isBalanced = totalDebits === totalCredits;

  return {
    entries: entriesResult.rows.map((row) => ({
      ...row,
      amount: Number(row.amount),
    })),
    summary: {
      totalDebits,
      totalCredits,
      isBalanced,
      variance: Math.abs(totalDebits - totalCredits),
    },
  };
}
