import { test } from 'node:test';
import assert from 'node:assert/strict';

import { calculatePlatformFees } from '../src/modules/order/platform-fee';

test('platform fee pricing adds customer and business fees without changing the customer total model', () => {
  const fees = calculatePlatformFees({
    subtotal: 2500,
    deliveryFee: 300,
    customerPlatformFee: 150,
    businessPlatformFee: 150,
  });

  assert.equal(fees.customerPlatformFee, 150);
  assert.equal(fees.businessPlatformFee, 150);
  assert.equal(fees.totalPlatformRevenue, 300);
  assert.equal(fees.customerTotal, 2500 + 300 + 150);
});
