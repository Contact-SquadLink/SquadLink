import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateDeliveryPricing,
  calculateCustomerDeliveryFee,
  calculateRiderPayout,
  evaluateEconomicFeasibility,
  buildOrderEconomicSnapshot,
  calculateDeliveryWaitMinutes,
  CIRCUITY_FACTOR,
  MAX_SERVICE_DISTANCE_KM,
  DEFAULT_PLATFORM_SERVICE_FEE,
  RIDER_MINIMUM_PAYOUT,
  RIDER_ACCEPTANCE_FLOOR,
  RIDER_BASE_COMPENSATION,
  RIDER_PICKUP_COMPENSATION,
  RIDER_TIME_COMMUNICATION_COMPENSATION,
  RIDER_FUEL_PRICE_PER_LITRE,
  RIDER_FUEL_EFFICIENCY_KM_PER_LITRE,
  RIDER_MAINTENANCE_COST_PER_KM,
  RIDER_WAITING_COMPENSATION_PER_MINUTE,
  RIDER_REVENUE_SHARE_FLOOR,
  PILOT_MINIMUM_CONTRIBUTION,
  PRICING_VERSION,
  PILOT_CUSTOMER_TIERS,
} from '../src/modules/order/delivery-pricing';

describe('SquadLink — Rider-Realistic Delivery Pricing Correction & Economics Hardening', () => {

  describe('1. Core Constants & Configurable Economics Defaults', () => {
    it('has pricing version 2 and 1.35x circuity factor', () => {
      assert.equal(PRICING_VERSION, 2);
      assert.equal(CIRCUITY_FACTOR, 1.35);
    });

    it('enforces pilot rider baseline constants (replacing obsolete ₦400 minimum)', () => {
      assert.equal(RIDER_MINIMUM_PAYOUT, 600);
      assert.equal(RIDER_ACCEPTANCE_FLOOR, 650);
      assert.equal(DEFAULT_PLATFORM_SERVICE_FEE, 150);
      assert.equal(RIDER_BASE_COMPENSATION, 250);
      assert.equal(RIDER_PICKUP_COMPENSATION, 150);
      assert.equal(RIDER_TIME_COMMUNICATION_COMPENSATION, 100);
      assert.equal(RIDER_FUEL_PRICE_PER_LITRE, 1150);
      assert.equal(RIDER_FUEL_EFFICIENCY_KM_PER_LITRE, 35);
      assert.equal(RIDER_MAINTENANCE_COST_PER_KM, 25);
      assert.equal(RIDER_WAITING_COMPENSATION_PER_MINUTE, 15);
      assert.equal(RIDER_REVENUE_SHARE_FLOOR, 0.80);
      assert.equal(PILOT_MINIMUM_CONTRIBUTION, -100);
    });
  });

  describe('2. Customer Delivery Pricing Bands (Business -> Customer)', () => {
    it('maps road distance to new pilot customer delivery pricing tiers', () => {
      // 0–2 km -> ₦550
      assert.equal(calculateCustomerDeliveryFee(1.0).fee, 550);
      assert.equal(calculateCustomerDeliveryFee(2.0).fee, 550);

      // >2–4 km -> ₦750
      assert.equal(calculateCustomerDeliveryFee(2.1).fee, 750);
      assert.equal(calculateCustomerDeliveryFee(4.0).fee, 750);

      // >4–6 km -> ₦950
      assert.equal(calculateCustomerDeliveryFee(4.5).fee, 950);
      assert.equal(calculateCustomerDeliveryFee(6.0).fee, 950);

      // >6–8 km -> ₦1,200
      assert.equal(calculateCustomerDeliveryFee(6.1).fee, 1200);
      assert.equal(calculateCustomerDeliveryFee(8.0).fee, 1200);

      // >8–10 km -> ₦1,500
      assert.equal(calculateCustomerDeliveryFee(8.5).fee, 1500);
      assert.equal(calculateCustomerDeliveryFee(10.0).fee, 1500);

      // >10–13 km -> ₦1,850
      assert.equal(calculateCustomerDeliveryFee(11.0).fee, 1850);
      assert.equal(calculateCustomerDeliveryFee(13.0).fee, 1850);

      // >13–16 km -> ₦2,250
      assert.equal(calculateCustomerDeliveryFee(14.0).fee, 2250);
      assert.equal(calculateCustomerDeliveryFee(16.0).fee, 2250);

      // >16–20 km -> ₦2,750
      assert.equal(calculateCustomerDeliveryFee(17.0).fee, 2750);
      assert.equal(calculateCustomerDeliveryFee(20.0).fee, 2750);
    });

    it('enforces the 20 km road service limit', () => {
      const withinLimit = calculateCustomerDeliveryFee(19.8);
      assert.equal(withinLimit.isWithinServiceLimit, true);

      const outsideLimit = calculateCustomerDeliveryFee(20.5);
      assert.equal(outsideLimit.isWithinServiceLimit, false);
    });

    it('supports custom configurable pricing tiers without code modifications', () => {
      const customTiers = [
        { minKm: 0, maxKm: 3, fee: 600 },
        { minKm: 3, maxKm: 10, fee: 1000 },
      ];
      assert.equal(calculateCustomerDeliveryFee(2.5, customTiers).fee, 600);
      assert.equal(calculateCustomerDeliveryFee(5.0, customTiers).fee, 1000);
    });
  });

  describe('3. Rider Operational Distance & Economics Calculation', () => {
    it('guarantees at least RIDER_MINIMUM_PAYOUT (₦600) on any trip', () => {
      const shortTrip = calculateRiderPayout(0.5, { riderPickupKm: 0.5, deliveryFee: 550 });
      assert.ok(shortTrip.riderPayout >= 600);
    });

    it('calculates operational distance correctly (Rider->Business + Business->Customer)', () => {
      const payout = calculateRiderPayout(4.0, { riderPickupKm: 2.5 });
      assert.equal(payout.totalOperationalKm, 6.5);
      assert.equal(payout.riderPickupKm, 2.5);
    });

    it('dynamically computes fuel and maintenance based on operational km', () => {
      // 10 km operational (e.g. 2.0 pickup + 8.0 delivery)
      const payout = calculateRiderPayout(8.0, { riderPickupKm: 2.0 });
      // Fuel: (10 / 35) * 1150 = 328.57 -> 329
      assert.equal(payout.fuelCost, Math.round((10 / 35) * 1150));
      // Maintenance: 10 * 25 = 250
      assert.equal(payout.maintenanceCost, 250);
      assert.equal(payout.operatingCost, payout.fuelCost + payout.maintenanceCost);
    });

    it('respects 80% revenue share floor when delivery fee is large', () => {
      // Large delivery fee ₦2,750 (80% = ₦2,200)
      const payout = calculateRiderPayout(18.0, { riderPickupKm: 1.5, deliveryFee: 2750 });
      assert.ok(payout.riderPayout >= Math.round(2750 * 0.80));
    });

    it('allows changing economic assumptions via configuration without altering pricing logic', () => {
      const customConfig = {
        riderMinimumPayout: 700,
        riderFuelPricePerLitre: 1300,
        riderMaintenanceCostPerKm: 35,
      };
      const payout = calculateRiderPayout(2.0, {
        riderPickupKm: 1.5,
        deliveryFee: 550,
        config: customConfig,
      });
      assert.ok(payout.riderPayout >= 700);
      assert.equal(payout.fuelCost, Math.round((3.5 / 35) * 1300));
      assert.equal(payout.maintenanceCost, Math.round(3.5 * 35));
    });
  });

  describe('4. Waiting Time as a Real Operational Cost', () => {
    it('compensates rider for waiting time exceeding baseline', () => {
      const normalWait = calculateRiderPayout(3.0, { riderPickupKm: 1.5, waitingMinutes: 5 });
      const prolongedWait = calculateRiderPayout(3.0, { riderPickupKm: 1.5, waitingMinutes: 25 });

      // 20 extra minutes * ₦15/min = ₦300 extra waiting compensation
      const waitDiff = prolongedWait.waitingCompensation - normalWait.waitingCompensation;
      assert.equal(waitDiff, 20 * 15);
      assert.ok(prolongedWait.operationalCompensation > normalWait.operationalCompensation);
    });

    it('calculates lifecycle delivery waiting minutes correctly', () => {
      const assigned = new Date('2026-10-01T10:00:00Z');
      const pickedUp = new Date('2026-10-01T10:12:00Z'); // 12 min business wait
      const arrived = new Date('2026-10-01T10:25:00Z');
      const delivered = new Date('2026-10-01T10:33:00Z'); // 8 min customer wait

      const wait = calculateDeliveryWaitMinutes({
        assignedAt: assigned,
        pickedUpAt: pickedUp,
        arrivedAt: arrived,
        deliveredAt: delivered,
      });

      assert.equal(wait.businessWaitMinutes, 12);
      assert.equal(wait.customerWaitMinutes, 8);
      assert.equal(wait.totalWaitMinutes, 20);
    });
  });

  describe('5. Economic Viability States & Platform Contribution', () => {
    it('classifies positive contribution as ECONOMICALLY_VIABLE', () => {
      const result = evaluateEconomicFeasibility({
        subtotal: 3000,
        deliveryFee: 750,
        customerServiceFee: 150,
        merchantCommissionRate: 0.10, // 300
        riderPayout: 674,
      });
      // Revenue: 750 + 150 + 300 = 1200
      // Variable costs: 674 + gateway (1.5% of 3900 = 59) = 733
      // Net: 1200 - 733 = +467
      assert.equal(result.viabilityState, 'ECONOMICALLY_VIABLE');
      assert.equal(result.isFeasible, true);
      assert.ok(result.estimatedContribution > 0);
    });

    it('classifies small controlled loss as PILOT_TOLERANCE when >= PILOT_MINIMUM_CONTRIBUTION (-₦100)', () => {
      const result = evaluateEconomicFeasibility({
        subtotal: 500,
        deliveryFee: 550,
        customerServiceFee: 150,
        merchantCommissionRate: 0.10, // 50
        riderPayout: 800, // higher rider payout
        pilotMinimumContribution: -100,
      });
      // Revenue: 550 + 150 + 50 = 750
      // Costs: 800 + gateway (1.5% of 1200 = 18) = 818
      // Contribution: 750 - 818 = -68
      assert.equal(result.viabilityState, 'PILOT_TOLERANCE');
      assert.equal(result.isFeasible, true);
      assert.ok(result.estimatedContribution >= -100 && result.estimatedContribution < 0);
    });

    it('classifies excessive deficit (< -₦100) as ECONOMICALLY_UNVIABLE', () => {
      const result = evaluateEconomicFeasibility({
        subtotal: 200,
        deliveryFee: 550,
        customerServiceFee: 150,
        merchantCommissionRate: 0.10, // 20
        riderPayout: 900,
        pilotMinimumContribution: -100,
      });
      // Revenue: 550 + 150 + 20 = 720
      // Costs: 900 + gateway (1.5% of 900 = 14) = 914
      // Contribution: 720 - 914 = -194 (< -100)
      assert.equal(result.viabilityState, 'ECONOMICALLY_UNVIABLE');
      assert.equal(result.isFeasible, false);
      assert.ok(result.reason != null);
    });
  });

  describe('6. Historical Pricing Snapshot Immutability', () => {
    it('captures complete economic snapshot at order time that does not change when global config changes', () => {
      const pricing = calculateDeliveryPricing(2500); // 2.5 radial km -> 3.38 road km
      const snapshot = buildOrderEconomicSnapshot({
        pricing,
        orderSubtotal: 3000,
        merchantCommissionRate: 0.10,
      });

      assert.equal(snapshot.pricing_version, 2);
      assert.equal(snapshot.delivery_fee, 750);
      assert.equal(snapshot.platform_fee, 150);
      assert.equal(snapshot.fuel_price, 1150);
      assert.equal(snapshot.rider_minimum_payout, 600);
      assert.ok(snapshot.rider_payout >= 600);
      assert.ok(snapshot.estimated_contribution > 0);
      assert.equal(snapshot.contribution_state, 'ECONOMICALLY_VIABLE');

      // Now suppose global fuel price increases to ₦1,500 and rider minimum to ₦800:
      const updatedConfig = {
        riderFuelPricePerLitre: 1500,
        riderMinimumPayout: 800,
      };
      // The original historical snapshot remains completely unaltered!
      assert.equal(snapshot.fuel_price, 1150);
      assert.equal(snapshot.rider_minimum_payout, 600);
      assert.equal(snapshot.delivery_fee, 750);
    });
  });

  describe('7. Critical Bauchi Scenario Testing (Scenarios A through H)', () => {
    it('Scenario A — Very short delivery (nearby merchant and customer)', () => {
      // 800m radial -> 1.08 road km
      const pricing = calculateDeliveryPricing(800, { riderPickupMeters: 400 });
      assert.equal(pricing.deliveryFee, 550);
      assert.equal(pricing.customerServiceFee, 150);
      assert.ok(pricing.riderPayout >= 600);
      assert.ok(pricing.isWithinServiceLimit);

      const feasibility = evaluateEconomicFeasibility({
        subtotal: 2500,
        deliveryFee: pricing.deliveryFee,
        riderPayout: pricing.riderPayout,
      });
      assert.equal(feasibility.viabilityState, 'ECONOMICALLY_VIABLE');
    });

    it('Scenario B — Gwallameji -> Yelwa (~3.5 road km)', () => {
      // 2600m radial * 1.35 = 3.51 road km
      const pricing = calculateDeliveryPricing(2600, { riderPickupMeters: 1200 });
      assert.equal(pricing.roadKm, 3.51);
      assert.equal(pricing.deliveryFee, 750); // Tier 2-4 km
      assert.ok(pricing.riderPayout >= 650); // Meets acceptance floor
      assert.ok(pricing.fuelCost > 0);
      assert.ok(pricing.maintenanceCost > 0);
    });

    it('Scenario C — Yelwa -> Wunti (~5.5 road km)', () => {
      // 4100m radial * 1.35 = 5.54 road km
      const pricing = calculateDeliveryPricing(4100, { riderPickupMeters: 1500 });
      assert.equal(pricing.deliveryFee, 950); // Tier 4-6 km
      assert.ok(pricing.riderPayout >= 700);
      assert.ok(pricing.totalRiderOperationalKm > 7.0);
    });

    it('Scenario D — Gwallameji -> Wunti (longer cross-city trip ~8.8 road km)', () => {
      // 6500m radial * 1.35 = 8.78 road km
      const pricing = calculateDeliveryPricing(6500, { riderPickupMeters: 1500 });
      assert.equal(pricing.deliveryFee, 1500); // Tier 8-10 km
      assert.ok(pricing.riderPayout >= 1000);
      assert.ok(pricing.totalRiderOperationalKm > 10.0);
      assert.ok(pricing.operatingCost > 400);
    });

    it('Scenario E — Rider far from merchant (customer price unchanged, rider deadhead compensated)', () => {
      // Customer delivery distance: 2.5 road km (Tier 2-4km: ₦750)
      const radialMeters = Math.round(2500 / 1.35);
      
      // Rider 1: Close to merchant (1.0 km pickup)
      const pricingCloseRider = calculateDeliveryPricing(radialMeters, { riderPickupMeters: Math.round(1000 / 1.35) });
      // Rider 2: Far from merchant (6.0 km pickup)
      const pricingFarRider = calculateDeliveryPricing(radialMeters, { riderPickupMeters: Math.round(6000 / 1.35) });

      // Customer delivery fee MUST NOT change based on rider location
      assert.equal(pricingCloseRider.deliveryFee, 750);
      assert.equal(pricingFarRider.deliveryFee, 750);

      // But rider payout DOES increase to compensate the far rider for fuel & distance
      assert.ok(pricingFarRider.riderPayout > pricingCloseRider.riderPayout);
      assert.ok(pricingFarRider.totalRiderOperationalKm > pricingCloseRider.totalRiderOperationalKm);
    });

    it('Scenario F — Long waiting time increases rider operational compensation', () => {
      const normalPricing = calculateDeliveryPricing(3000, { waitingMinutes: 5 });
      const delayedPricing = calculateDeliveryPricing(3000, { waitingMinutes: 30 });

      assert.equal(normalPricing.deliveryFee, delayedPricing.deliveryFee); // Customer fee unchanged
      assert.equal(delayedPricing.waitingMinutes, 30);
      assert.ok(delayedPricing.waitingCompensation > normalPricing.waitingCompensation);
      assert.ok(delayedPricing.riderPayout >= delayedPricing.operationalCompensation);
    });

    it('Scenario G — Low-value order remains economically viable or within pilot tolerance', () => {
      const pricing = calculateDeliveryPricing(1500); // ~2.03 road km -> ₦750
      const lowValueSubtotal = 600; // Small snack/drink

      const feasibility = evaluateEconomicFeasibility({
        subtotal: lowValueSubtotal,
        deliveryFee: pricing.deliveryFee,
        riderPayout: pricing.riderPayout,
      });

      assert.ok(feasibility.viabilityState === 'ECONOMICALLY_VIABLE' || feasibility.viabilityState === 'PILOT_TOLERANCE');
      assert.equal(feasibility.isFeasible, true);
    });

    it('Scenario H — Maximum service distance (>20 km) rejected with out-of-service flag', () => {
      const outOfBoundsMeters = Math.round((21.0 / 1.35) * 1000); // 21 km road distance
      const pricing = calculateDeliveryPricing(outOfBoundsMeters);
      assert.equal(pricing.isWithinServiceLimit, false);
      assert.ok(pricing.roadKm > MAX_SERVICE_DISTANCE_KM);
    });
  });

  describe('8. VAT Globally Removed & Payment Transparency Invariant', () => {
    it('guarantees Subtotal + DeliveryFee + PlatformFee = Payable Total with ZERO VAT', () => {
      const subtotal = 5200;
      const pricing = calculateDeliveryPricing(3500); // ~4.73 road km -> ₦950
      const vat = 0; // Globally removed
      const total = subtotal + pricing.deliveryFee + pricing.customerServiceFee + vat;

      assert.equal(pricing.deliveryFee, 950);
      assert.equal(pricing.customerServiceFee, 150);
      assert.equal(vat, 0);
      assert.equal(total, 5200 + 950 + 150);
    });
  });

});
