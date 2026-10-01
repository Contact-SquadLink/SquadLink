import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateDeliveryPricing,
  calculateCustomerDeliveryFee,
  calculateRiderPayout,
  evaluateEconomicFeasibility,
  CIRCUITY_FACTOR,
  MAX_SERVICE_DISTANCE_KM,
  DEFAULT_PLATFORM_SERVICE_FEE,
  MINIMUM_RIDER_PAYOUT,
  PRICING_VERSION,
} from '../src/modules/order/delivery-pricing';

describe('Bauchi Pilot Customer Pricing Tiers, Fuel-Aware Rider Economics & Fee Invariants', () => {
  it('has pricing version 1 and 1.35x circuity factor', () => {
    assert.equal(PRICING_VERSION, 1);
    assert.equal(CIRCUITY_FACTOR, 1.35);
  });

  it('correctly maps road distance to pilot customer delivery pricing tiers', () => {
    // 0-2 km -> ₦250
    assert.equal(calculateCustomerDeliveryFee(1.5).fee, 250);
    assert.equal(calculateCustomerDeliveryFee(2.0).fee, 250);

    // >2-4 km -> ₦300
    assert.equal(calculateCustomerDeliveryFee(2.1).fee, 300);
    assert.equal(calculateCustomerDeliveryFee(4.0).fee, 300);

    // >4-6 km -> ₦400
    assert.equal(calculateCustomerDeliveryFee(5.0).fee, 400);
    assert.equal(calculateCustomerDeliveryFee(6.0).fee, 400);

    // >6-8 km -> ₦500
    assert.equal(calculateCustomerDeliveryFee(7.5).fee, 500);

    // >8-10 km -> ₦600
    assert.equal(calculateCustomerDeliveryFee(9.0).fee, 600);

    // >10-13 km -> ₦700
    assert.equal(calculateCustomerDeliveryFee(12.0).fee, 700);

    // >13-16 km -> ₦800
    assert.equal(calculateCustomerDeliveryFee(15.0).fee, 800);

    // >16-20 km -> ₦950
    assert.equal(calculateCustomerDeliveryFee(18.0).fee, 950);
    assert.equal(calculateCustomerDeliveryFee(20.0).fee, 950);
  });

  it('enforces the 20 km road service limit', () => {
    const withinLimit = calculateCustomerDeliveryFee(19.5);
    assert.equal(withinLimit.isWithinServiceLimit, true);

    const outsideLimit = calculateCustomerDeliveryFee(21.5);
    assert.equal(outsideLimit.isWithinServiceLimit, false);
  });

  it('guarantees minimum ₦400 rider payout on short trips', () => {
    const shortTrip = calculateRiderPayout(1.5, { riderPickupKm: 1.0, deliveryFee: 250 });
    assert.ok(shortTrip.riderPayout >= MINIMUM_RIDER_PAYOUT);
  });

  it('increases rider payout dynamically for long operational distances based on fuel and maintenance', () => {
    // 15 km delivery road distance + 3 km deadhead pickup = 18 km total operational
    const longTrip = calculateRiderPayout(15.0, { riderPickupKm: 3.0, deliveryFee: 800 });
    assert.equal(longTrip.totalOperationalKm, 18.0);
    assert.ok(longTrip.operatingCost > 0);
    // Calculated compensation floor must exceed basic ₦400 minimum
    assert.ok(longTrip.riderPayout >= 800);
  });

  it('includes mandatory ₦150 customer platform fee in unified delivery pricing breakdown', () => {
    // 3000 radial meters -> 3.0 * 1.35 = 4.05 road km -> tier 4-6km: ₦400
    const pricing = calculateDeliveryPricing(3000);
    assert.equal(pricing.customerServiceFee, DEFAULT_PLATFORM_SERVICE_FEE);
    assert.equal(pricing.customerServiceFee, 150);
    assert.equal(pricing.isWithinServiceLimit, true);
    assert.equal(pricing.deliveryFee, 400);
    assert.ok(pricing.riderPayout >= 400);
  });

  it('evaluates economic feasibility and maintains positive platform contribution', () => {
    // Order subtotal: ₦3,500, Delivery fee: ₦300, Platform fee: ₦150, Rider payout: ₦400
    const feasibility = evaluateEconomicFeasibility({
      subtotal: 3500,
      deliveryFee: 300,
      riderPayout: 400,
      customerServiceFee: 150,
      merchantCommissionRate: 0.10, // ₦350
    });

    // Total Platform Revenue: 150 + 350 + 300 = ₦800
    assert.equal(feasibility.totalPlatformRevenue, 800);
    // Variable costs: 400 + gateway (1.5% of 3950 = ₦59) = ₦459
    assert.equal(feasibility.totalVariableCosts, 459);
    // Net contribution: 800 - 459 = ₦341 (positive contribution!)
    assert.equal(feasibility.estimatedContribution, 341);
    assert.equal(feasibility.isFeasible, true);
  });

  it('verifies final payable total equals subtotal + deliveryFee + platformFee (with zero VAT)', () => {
    const subtotal = 4000;
    const pricing = calculateDeliveryPricing(2500); // ~3.38 road km -> ₦300 delivery fee
    const deliveryFee = pricing.deliveryFee;
    const platformFee = pricing.customerServiceFee; // ₦150
    const vat = 0; // VAT globally removed

    const total = subtotal + deliveryFee + platformFee + vat;
    assert.equal(deliveryFee, 300);
    assert.equal(platformFee, 150);
    assert.equal(total, 4450);
    assert.equal(vat, 0);
  });
});
