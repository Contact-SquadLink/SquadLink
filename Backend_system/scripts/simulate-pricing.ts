/**
 * SquadLink Internal Pricing Simulation Engine
 * Generates 25–35 representative delivery scenarios across Bauchi
 * evaluating economics, customer fees, rider payouts, fuel/maintenance, and platform contribution.
 */

import {
  calculateDeliveryPricing,
  evaluateEconomicFeasibility,
  DEFAULT_PLATFORM_SERVICE_FEE,
  CIRCUITY_FACTOR,
} from '../src/modules/order/delivery-pricing';

interface ScenarioSpec {
  name: string;
  bizToCustomerRadialM: number;
  riderToBizRadialM: number;
  orderSubtotal: number;
  waitingMinutes: number;
}

const SCENARIOS: ScenarioSpec[] = [
  // 1. Very Short Corridors (0-2 km road)
  { name: "Yelwa Market -> Yelwa Tudu (Short)", bizToCustomerRadialM: 800, riderToBizRadialM: 400, orderSubtotal: 1200, waitingMinutes: 3 },
  { name: "ATBU Gate -> Gwallameji Junction", bizToCustomerRadialM: 1100, riderToBizRadialM: 600, orderSubtotal: 2000, waitingMinutes: 4 },
  { name: "Wunti Market -> Roundabout", bizToCustomerRadialM: 1400, riderToBizRadialM: 500, orderSubtotal: 800, waitingMinutes: 5 },
  { name: "Federal Lowcost -> Lowcost Market", bizToCustomerRadialM: 1300, riderToBizRadialM: 800, orderSubtotal: 3500, waitingMinutes: 5 },

  // 2. Standard Corridors (>2-4 km road)
  { name: "Gwallameji -> Yelwa Market", bizToCustomerRadialM: 2600, riderToBizRadialM: 1100, orderSubtotal: 2500, waitingMinutes: 5 },
  { name: "Dass Road -> Rafin Zurfi", bizToCustomerRadialM: 2800, riderToBizRadialM: 1200, orderSubtotal: 1800, waitingMinutes: 6 },
  { name: "Wunti Market -> Railway", bizToCustomerRadialM: 2200, riderToBizRadialM: 900, orderSubtotal: 4200, waitingMinutes: 5 },
  { name: "Yelwa -> Dass Road Junction", bizToCustomerRadialM: 2500, riderToBizRadialM: 1500, orderSubtotal: 1500, waitingMinutes: 7 },
  { name: "Central Market -> Gombe Road", bizToCustomerRadialM: 2900, riderToBizRadialM: 1000, orderSubtotal: 3000, waitingMinutes: 5 },

  // 3. Extended Corridors (>4-6 km road)
  { name: "Yelwa -> Wunti Market", bizToCustomerRadialM: 4100, riderToBizRadialM: 1500, orderSubtotal: 3500, waitingMinutes: 6 },
  { name: "Gwallameji -> Dass Park", bizToCustomerRadialM: 3800, riderToBizRadialM: 1200, orderSubtotal: 2200, waitingMinutes: 8 },
  { name: "Federal Lowcost -> Yelwa", bizToCustomerRadialM: 4300, riderToBizRadialM: 1800, orderSubtotal: 5000, waitingMinutes: 5 },
  { name: "ATBU Gate -> Railway Station", bizToCustomerRadialM: 4200, riderToBizRadialM: 1300, orderSubtotal: 1900, waitingMinutes: 6 },

  // 4. Cross-Zone Corridors (>6-8 km road)
  { name: "Gwallameji -> Central Market", bizToCustomerRadialM: 5200, riderToBizRadialM: 1500, orderSubtotal: 4500, waitingMinutes: 7 },
  { name: "Rafin Zurfi -> Wunti Market", bizToCustomerRadialM: 5500, riderToBizRadialM: 1400, orderSubtotal: 2800, waitingMinutes: 6 },
  { name: "Yelwa -> GRA Bauchi", bizToCustomerRadialM: 5000, riderToBizRadialM: 1600, orderSubtotal: 6500, waitingMinutes: 5 },

  // 5. Outer-Ring Corridors (>8-10 km road)
  { name: "Gwallameji -> Wunti Market (Direct)", bizToCustomerRadialM: 6500, riderToBizRadialM: 1500, orderSubtotal: 4000, waitingMinutes: 8 },
  { name: "Dass Road -> Bauchi Club GRA", bizToCustomerRadialM: 6800, riderToBizRadialM: 1800, orderSubtotal: 5500, waitingMinutes: 7 },
  { name: "Inkil -> Yelwa Tudu", bizToCustomerRadialM: 7100, riderToBizRadialM: 2000, orderSubtotal: 3200, waitingMinutes: 8 },

  // 6. Deep Perimeter Corridors (>10-13 km road)
  { name: "Gwallameji -> Inkil Outreach", bizToCustomerRadialM: 8500, riderToBizRadialM: 2000, orderSubtotal: 4500, waitingMinutes: 10 },
  { name: "Tafawa Balewa Way -> Kangere Road", bizToCustomerRadialM: 9200, riderToBizRadialM: 2200, orderSubtotal: 7000, waitingMinutes: 8 },
  { name: "Federal Lowcost -> Birshi Gandu", bizToCustomerRadialM: 8800, riderToBizRadialM: 1800, orderSubtotal: 3000, waitingMinutes: 9 },

  // 7. Regional Bounds (>13-16 km road)
  { name: "Bauchi Central -> Bayara Hospital", bizToCustomerRadialM: 10500, riderToBizRadialM: 2500, orderSubtotal: 6000, waitingMinutes: 10 },
  { name: "Gwallameji -> Dungal Perimeter", bizToCustomerRadialM: 11200, riderToBizRadialM: 2200, orderSubtotal: 5200, waitingMinutes: 12 },

  // 8. Maximum Radius Corridors (>16-20 km road)
  { name: "ATBU Gwallameji -> Bauchi Airstrip", bizToCustomerRadialM: 13500, riderToBizRadialM: 2800, orderSubtotal: 8000, waitingMinutes: 12 },
  { name: "Yelwa -> Shadawanka Barracks Outer", bizToCustomerRadialM: 14200, riderToBizRadialM: 2500, orderSubtotal: 4500, waitingMinutes: 10 },

  // 9. Asymmetric Scenarios: Far Rider, Long Wait, Low Order Subtotal
  { name: "Far Rider Deadhead (5km Rider -> Biz)", bizToCustomerRadialM: 2200, riderToBizRadialM: 3700, orderSubtotal: 3000, waitingMinutes: 5 },
  { name: "Merchant Prep Delay (25 min wait)", bizToCustomerRadialM: 2500, riderToBizRadialM: 1100, orderSubtotal: 3200, waitingMinutes: 25 },
  { name: "Low-Value Snack Delivery (₦600 GMV)", bizToCustomerRadialM: 1100, riderToBizRadialM: 700, orderSubtotal: 600, waitingMinutes: 4 },
  { name: "Low GMV + Medium Distance", bizToCustomerRadialM: 3000, riderToBizRadialM: 1200, orderSubtotal: 1000, waitingMinutes: 5 },
];

export function runSimulation() {
  const rows = SCENARIOS.map((sc, idx) => {
    const pricing = calculateDeliveryPricing(sc.bizToCustomerRadialM, {
      riderPickupMeters: sc.riderToBizRadialM,
      waitingMinutes: sc.waitingMinutes,
    });

    const feasibility = evaluateEconomicFeasibility({
      subtotal: sc.orderSubtotal,
      deliveryFee: pricing.deliveryFee,
      customerServiceFee: pricing.customerServiceFee,
      riderPayout: pricing.riderPayout,
      merchantCommissionRate: 0.10,
    });

    return {
      index: idx + 1,
      route: sc.name,
      bizToCustKm: pricing.roadKm,
      riderToBizKm: pricing.riderPickupKm,
      totalOpKm: pricing.totalRiderOperationalKm,
      fuelCost: pricing.fuelCost,
      maintenanceCost: pricing.maintenanceCost,
      riderPayout: pricing.riderPayout,
      customerDeliveryFee: pricing.deliveryFee,
      platformFee: pricing.customerServiceFee,
      merchantCommission: feasibility.merchantCommission,
      totalCustomerPaid: feasibility.totalCustomerPayment,
      squadLinkRevenue: feasibility.totalPlatformRevenue,
      estimatedContribution: feasibility.estimatedContribution,
      state: feasibility.viabilityState,
    };
  });

  return rows;
}

// If run directly via node
const results = runSimulation();
console.log(`\n===========================================================================================================================================`);
console.log(`SquadLink — Bauchi Pilot Delivery Pricing & Economics Simulation (${results.length} Representative Scenarios)`);
console.log(`===========================================================================================================================================`);
console.log(
  `#  | Scenario Route                       | Delivery Km | Op Km | Fuel | Maint | Rider Pay | Cust Fee | Plat Fee | Comm | Cust Pay | SQ Revenue | Net Contrib | State`
);
console.log(`---+--------------------------------------+-------------+-------+------+-------+-----------+----------+----------+------+----------+------------+-------------+-------------------`);

for (const r of results) {
  const num = String(r.index).padStart(2, ' ');
  const route = r.route.padEnd(36, ' ').slice(0, 36);
  const delKm = r.bizToCustKm.toFixed(2).padStart(11, ' ');
  const opKm = r.totalOpKm.toFixed(2).padStart(5, ' ');
  const fuel = `₦${r.fuelCost}`.padStart(6, ' ');
  const maint = `₦${r.maintenanceCost}`.padStart(7, ' ');
  const payout = `₦${r.riderPayout}`.padStart(9, ' ');
  const fee = `₦${r.customerDeliveryFee}`.padStart(8, ' ');
  const plat = `₦${r.platformFee}`.padStart(8, ' ');
  const comm = `₦${r.merchantCommission}`.padStart(6, ' ');
  const custPay = `₦${r.totalCustomerPaid}`.padStart(8, ' ');
  const rev = `₦${r.squadLinkRevenue}`.padStart(10, ' ');
  const contrib = `₦${r.estimatedContribution}`.padStart(11, ' ');
  const st = r.state.padEnd(19, ' ');
  console.log(`${num} | ${route} | ${delKm} | ${opKm} | ${fuel} | ${maint} | ${payout} | ${fee} | ${plat} | ${comm} | ${custPay} | ${rev} | ${contrib} | ${st}`);
}

console.log(`===========================================================================================================================================\n`);
