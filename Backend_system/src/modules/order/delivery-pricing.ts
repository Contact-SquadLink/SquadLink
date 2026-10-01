/**
 * SquadLink — Rider-Realistic Delivery Pricing Correction & Economics Hardening
 * 
 * Core Business Principles:
 * 1. Delivery jobs represent operational service (pickup travel, merchant wait, customer contact,
 *    location search, handoff, vehicle wear, fuel, opportunity cost) — distinct from passenger fares.
 * 2. Customer delivery distance (Business -> Customer) governs customer delivery fee.
 * 3. Rider operational distance (Rider -> Business + Business -> Customer) governs rider compensation.
 *    Customers are never charged directly for rider deadhead distance.
 * 4. Payout floor: Replaces obsolete ₦400 assumption with configurable RIDER_MINIMUM_PAYOUT (₦600)
 *    and RIDER_ACCEPTANCE_FLOOR (₦650).
 * 5. Fuel & maintenance aware: Petrol price, fuel efficiency (km/L), maintenance per km.
 * 6. Waiting time compensation: Explicit tracking of merchant wait, customer wait, and total wait.
 * 7. Economic Viability States: ECONOMICALLY_VIABLE (>= ₦0), PILOT_TOLERANCE (>= -₦100), ECONOMICALLY_UNVIABLE (< -₦100).
 * 8. Historical Pricing Snapshot: Preserves all pricing, fuel, and unit economic parameters per order.
 */

export const PRICING_VERSION = 2;
export const PRICING_VERSION_LABEL = "2.0-bauchi-pilot-economics";

/** Circuity factor to convert straight-line radial distance to estimated road distance */
export const CIRCUITY_FACTOR = 1.35;

/** Maximum allowable road distance for city serviceability (Bauchi perimeter) */
export const MAX_SERVICE_DISTANCE_KM = 20.0;

/** Default customer platform/service fee in NGN */
export const DEFAULT_PLATFORM_SERVICE_FEE = 150;

/** Guaranteed absolute minimum rider payout (pilot baseline assumption requiring validation) */
export const RIDER_MINIMUM_PAYOUT = 600;
/** Backward-compatible alias */
export const MINIMUM_RIDER_PAYOUT = RIDER_MINIMUM_PAYOUT;

/** Commercial acceptance floor for rider dispatch attractiveness */
export const RIDER_ACCEPTANCE_FLOOR = 650;

/** Base trip/show-up compensation in NGN */
export const RIDER_BASE_COMPENSATION = 250;

/** Pickup & merchant packaging coordination allowance in NGN */
export const RIDER_PICKUP_COMPENSATION = 150;

/** Customer location search & phone communication allowance in NGN */
export const RIDER_TIME_COMMUNICATION_COMPENSATION = 100;

/** Petrol pump price per litre in NGN (configurable assumption, not live API) */
export const RIDER_FUEL_PRICE_PER_LITRE = 1150;

/** Motorcycle fuel efficiency in km per litre (commercial 100cc/125cc boxer bike) */
export const RIDER_FUEL_EFFICIENCY_KM_PER_LITRE = 35;

/** Maintenance wear & tear cost per km in NGN (oil, tires, chain, brakes) */
export const RIDER_MAINTENANCE_COST_PER_KM = 25;

/** Waiting time compensation per minute in NGN */
export const RIDER_WAITING_COMPENSATION_PER_MINUTE = 15;

/** Standard rider delivery revenue share floor (80%) */
export const RIDER_REVENUE_SHARE_FLOOR = 0.80;
/** Backward-compatible alias */
export const RIDER_SHARE_RATIO = RIDER_REVENUE_SHARE_FLOOR;

/** Controlled temporary pilot tolerance floor for platform net contribution (NGN) */
export const PILOT_MINIMUM_CONTRIBUTION = -100;

/** Payment gateway processing fee assumption (1.5%) */
export const GATEWAY_FEE_RATE = 0.015;

/** Standard merchant commission rate assumption (10%) */
export const DEFAULT_MERCHANT_COMMISSION_RATE = 0.10;

/** Baseline assumed pickup deadhead distance in km when rider is not yet assigned */
export const BASELINE_RIDER_PICKUP_KM = 1.5;

/** Baseline assumed waiting duration in minutes at preview/checkout */
export const BASELINE_WAITING_MINUTES = 5;

/**
 * Economic Viability States
 */
export type EconomicViabilityState =
  | "ECONOMICALLY_VIABLE"
  | "PILOT_TOLERANCE"
  | "ECONOMICALLY_UNVIABLE";

/**
 * Customer Delivery Distance Pricing Tiers (Bauchi Pilot Test Configuration)
 * Derived from operational-cost modelling and preliminary rider feedback.
 */
export interface CustomerPricingTier {
  minKm: number;
  maxKm: number;
  fee: number;
  label?: string;
}

export const PILOT_CUSTOMER_TIERS: CustomerPricingTier[] = [
  { minKm: 0.0, maxKm: 2.0, fee: 550, label: "0–2 km (Short corridor)" },
  { minKm: 2.0, maxKm: 4.0, fee: 750, label: "2–4 km (Standard corridor)" },
  { minKm: 4.0, maxKm: 6.0, fee: 950, label: "4–6 km (Extended corridor)" },
  { minKm: 6.0, maxKm: 8.0, fee: 1200, label: "6–8 km (Cross-zone corridor)" },
  { minKm: 8.0, maxKm: 10.0, fee: 1500, label: "8–10 km (Outer-ring corridor)" },
  { minKm: 10.0, maxKm: 13.0, fee: 1850, label: "10–13 km (Deep perimeter)" },
  { minKm: 13.0, maxKm: 16.0, fee: 2250, label: "13–16 km (Regional bounds)" },
  { minKm: 16.0, maxKm: 20.0, fee: 2750, label: "16–20 km (Maximum radius)" },
];

/**
 * Centralized Configurable Rider Economics Parameters
 */
export interface RiderEconomicsConfig {
  riderMinimumPayout: number;
  riderAcceptanceFloor: number;
  riderBaseCompensation: number;
  riderPickupCompensation: number;
  riderTimeCommunicationCompensation: number;
  riderFuelPricePerLitre: number;
  riderFuelEfficiencyKmPerLitre: number;
  riderMaintenanceCostPerKm: number;
  riderWaitingCompensationPerMinute: number;
  riderRevenueShareFloor: number;
  pilotMinimumContribution: number;
  baselinePickupKm?: number;
  baselineWaitingMinutes?: number;
}

export const DEFAULT_RIDER_ECONOMICS: RiderEconomicsConfig = {
  riderMinimumPayout: RIDER_MINIMUM_PAYOUT,
  riderAcceptanceFloor: RIDER_ACCEPTANCE_FLOOR,
  riderBaseCompensation: RIDER_BASE_COMPENSATION,
  riderPickupCompensation: RIDER_PICKUP_COMPENSATION,
  riderTimeCommunicationCompensation: RIDER_TIME_COMMUNICATION_COMPENSATION,
  riderFuelPricePerLitre: RIDER_FUEL_PRICE_PER_LITRE,
  riderFuelEfficiencyKmPerLitre: RIDER_FUEL_EFFICIENCY_KM_PER_LITRE,
  riderMaintenanceCostPerKm: RIDER_MAINTENANCE_COST_PER_KM,
  riderWaitingCompensationPerMinute: RIDER_WAITING_COMPENSATION_PER_MINUTE,
  riderRevenueShareFloor: RIDER_REVENUE_SHARE_FLOOR,
  pilotMinimumContribution: PILOT_MINIMUM_CONTRIBUTION,
  baselinePickupKm: BASELINE_RIDER_PICKUP_KM,
  baselineWaitingMinutes: BASELINE_WAITING_MINUTES,
};

export interface DeliveryPricingBreakdown {
  pricingVersion: number;
  pricingVersionLabel: string;
  radialKm: number;
  roadKm: number;
  roadDistanceMeters: number;
  estimatedDurationSeconds: number;
  deliveryFee: number;
  customerServiceFee: number;
  riderPayout: number;
  riderPickupKm: number;
  totalRiderOperationalKm: number;
  fuelCost: number;
  maintenanceCost: number;
  waitingMinutes: number;
  waitingCompensation: number;
  operationalCompensation: number;
  operatingCost: number;
  platformShare: number;
  isWithinServiceLimit: boolean;
  distanceModelNote: string;
}

export interface EconomicFeasibilityResult {
  isFeasible: boolean;
  viabilityState: EconomicViabilityState;
  orderSubtotal: number;
  deliveryFee: number;
  customerServiceFee: number;
  merchantCommission: number;
  merchantCommissionRate: number;
  totalCustomerPayment: number;
  totalPlatformRevenue: number;
  riderPayout: number;
  gatewayFee: number;
  totalVariableCosts: number;
  estimatedContribution: number;
  pilotMinimumContribution: number;
  reason?: string;
}

/**
 * Immutable Historical Order Economic Snapshot
 * Captured at order creation to preserve transaction unit economics forever.
 */
export interface OrderEconomicSnapshot {
  pricing_version: number;
  pricing_version_label: string;
  delivery_fee: number;
  platform_fee: number;
  merchant_commission: number;
  merchant_commission_rate: number;
  rider_payout: number;
  rider_minimum_payout: number;
  rider_acceptance_floor: number;
  fuel_price: number;
  fuel_efficiency: number;
  maintenance_cost_per_km: number;
  waiting_compensation_per_minute: number;
  operational_distance: number;
  business_to_customer_distance: number;
  rider_to_business_distance: number;
  circuity_factor: number;
  estimated_fuel_cost: number;
  estimated_maintenance_cost: number;
  estimated_waiting_minutes: number;
  estimated_waiting_compensation: number;
  gateway_cost: number;
  estimated_contribution: number;
  contribution_state: EconomicViabilityState;
  assumptions_note: string;
  created_at: string;
}

/**
 * Calculate Customer Delivery Fee based on road distance (Business -> Customer)
 * 
 * Note: Customer delivery fee strictly depends on Business -> Customer distance.
 * Customers are never charged for rider deadhead distance.
 */
export function calculateCustomerDeliveryFee(
  roadKm: number,
  tiers: CustomerPricingTier[] = PILOT_CUSTOMER_TIERS
): { fee: number; isWithinServiceLimit: boolean; tierLabel?: string } {
  if (roadKm <= 0) {
    return {
      fee: tiers[0]?.fee ?? 550,
      isWithinServiceLimit: true,
      tierLabel: tiers[0]?.label ?? "0–2 km (Short corridor)",
    };
  }

  if (roadKm > MAX_SERVICE_DISTANCE_KM) {
    const lastTier = tiers[tiers.length - 1];
    return {
      fee: lastTier ? lastTier.fee + 300 : 3050,
      isWithinServiceLimit: false,
      tierLabel: "Beyond 20 km city perimeter limit",
    };
  }

  for (const tier of tiers) {
    if (roadKm > tier.minKm && roadKm <= tier.maxKm) {
      return { fee: tier.fee, isWithinServiceLimit: true, tierLabel: tier.label };
    }
  }

  // Fallback to initial tier
  if (roadKm <= (tiers[0]?.maxKm ?? 2.0)) {
    return { fee: tiers[0]?.fee ?? 550, isWithinServiceLimit: true, tierLabel: tiers[0]?.label };
  }

  const lastTier = tiers[tiers.length - 1];
  return { fee: lastTier ? lastTier.fee : 2750, isWithinServiceLimit: true, tierLabel: lastTier?.label };
}

/**
 * Calculate Rider Payout Model
 * 
 * Formula:
 * OperationalKm = RiderToBusinessKm + BusinessToCustomerKm
 * FuelCost = (OperationalKm / FuelEfficiencyKmPerLitre) * FuelPricePerLitre
 * MaintenanceCost = OperationalKm * MaintenanceCostPerKm
 * WaitingCompensation = WaitingMinutes * WaitingCompensationPerMinute
 * OperationalCompensation = BaseCompensation + PickupCompensation + WaitingCompensation + TimeCommunicationCompensation + FuelCost + MaintenanceCost
 * RiderPayout = MAX(RiderMinimumPayout, OperationalCompensation, DeliveryFee * RevenueShareFloor)
 */
export function calculateRiderPayout(
  deliveryRoadKm: number,
  options?: {
    riderPickupKm?: number;
    deliveryFee?: number;
    waitingMinutes?: number;
    config?: Partial<RiderEconomicsConfig>;
  }
): {
  riderPayout: number;
  riderPickupKm: number;
  totalOperationalKm: number;
  fuelCost: number;
  maintenanceCost: number;
  waitingMinutes: number;
  waitingCompensation: number;
  operationalCompensation: number;
  operatingCost: number;
  isAboveAcceptanceFloor: boolean;
} {
  const cfg: RiderEconomicsConfig = {
    ...DEFAULT_RIDER_ECONOMICS,
    ...options?.config,
  };

  // Operational distance: Rider -> Business deadhead + Business -> Customer delivery
  const riderPickupKm = options?.riderPickupKm != null && options.riderPickupKm >= 0
    ? options.riderPickupKm
    : (cfg.baselinePickupKm ?? BASELINE_RIDER_PICKUP_KM);

  const totalOperationalKm = Math.round((riderPickupKm + deliveryRoadKm) * 100) / 100;

  // Fuel Cost: (OperationalKm / FuelEfficiency) * FuelPrice
  const fuelCost = Math.round(
    (totalOperationalKm / cfg.riderFuelEfficiencyKmPerLitre) * cfg.riderFuelPricePerLitre
  );

  // Maintenance Cost: Wear and tear (engine oil, tyres, chains)
  const maintenanceCost = Math.round(totalOperationalKm * cfg.riderMaintenanceCostPerKm);

  const operatingCost = fuelCost + maintenanceCost;

  // Waiting Compensation
  const waitingMinutes = options?.waitingMinutes != null && options.waitingMinutes >= 0
    ? options.waitingMinutes
    : (cfg.baselineWaitingMinutes ?? BASELINE_WAITING_MINUTES);
  const waitingCompensation = Math.round(waitingMinutes * cfg.riderWaitingCompensationPerMinute);

  // Operational Compensation Floor:
  // Base + Pickup + Waiting + Time/Communication + Fuel + Maintenance
  const operationalCompensation =
    cfg.riderBaseCompensation +
    cfg.riderPickupCompensation +
    waitingCompensation +
    cfg.riderTimeCommunicationCompensation +
    fuelCost +
    maintenanceCost;

  // Delivery fee revenue share floor (e.g. 80%)
  const revenueShareCompensation = options?.deliveryFee != null
    ? Math.round(options.deliveryFee * cfg.riderRevenueShareFloor)
    : 0;

  // Final payout is MAX(RiderMinimumPayout, OperationalCompensation, DeliveryFee * RevenueShareFloor)
  const riderPayout = Math.max(
    cfg.riderMinimumPayout,
    operationalCompensation,
    revenueShareCompensation
  );

  return {
    riderPayout,
    riderPickupKm,
    totalOperationalKm,
    fuelCost,
    maintenanceCost,
    waitingMinutes,
    waitingCompensation,
    operationalCompensation,
    operatingCost,
    isAboveAcceptanceFloor: riderPayout >= cfg.riderAcceptanceFloor,
  };
}

/**
 * Unified Delivery Pricing Engine
 * Computes customer delivery fee, fuel-aware rider payout, and platform economics.
 */
export function calculateDeliveryPricing(
  distanceMeters: number | null | undefined,
  options?: {
    riderPickupMeters?: number;
    fuelPricePerLitre?: number;
    platformServiceFee?: number;
    waitingMinutes?: number;
    config?: Partial<RiderEconomicsConfig>;
    tiers?: CustomerPricingTier[];
  }
): DeliveryPricingBreakdown {
  const safeMeters = typeof distanceMeters === "number" && !isNaN(distanceMeters) && distanceMeters > 0
    ? distanceMeters
    : 0;

  const radialKm = Math.round((safeMeters / 1000) * 1000) / 1000;
  // Circuity-factored road distance estimation (1.35x PostGIS radial distance)
  const roadKm = Math.round((radialKm * CIRCUITY_FACTOR) * 100) / 100;
  const roadDistanceMeters = Math.round(roadKm * 1000);

  // Average city transit speed ~30 km/h -> duration in seconds
  const estimatedDurationSeconds = Math.round((roadKm / 30) * 3600);

  // Customer delivery fee strictly based on Business -> Customer distance
  const { fee: deliveryFee, isWithinServiceLimit } = calculateCustomerDeliveryFee(roadKm, options?.tiers);

  // Rider pickup distance: If rider coordinates are provided, convert to circuity road distance
  const riderPickupKm = options?.riderPickupMeters != null
    ? Math.round((options.riderPickupMeters / 1000) * CIRCUITY_FACTOR * 100) / 100
    : (options?.config?.baselinePickupKm ?? BASELINE_RIDER_PICKUP_KM);

  const riderEconomics = calculateRiderPayout(roadKm, {
    riderPickupKm,
    deliveryFee,
    waitingMinutes: options?.waitingMinutes,
    config: {
      ...options?.config,
      ...(options?.fuelPricePerLitre ? { riderFuelPricePerLitre: options.fuelPricePerLitre } : {}),
    },
  });

  const customerServiceFee = options?.platformServiceFee ?? DEFAULT_PLATFORM_SERVICE_FEE;

  // Platform share of retained fulfilment revenue
  const platformShare = (deliveryFee + customerServiceFee) - riderEconomics.riderPayout;

  return {
    pricingVersion: PRICING_VERSION,
    pricingVersionLabel: PRICING_VERSION_LABEL,
    radialKm,
    roadKm,
    roadDistanceMeters,
    estimatedDurationSeconds,
    deliveryFee,
    customerServiceFee,
    riderPayout: riderEconomics.riderPayout,
    riderPickupKm: riderEconomics.riderPickupKm,
    totalRiderOperationalKm: riderEconomics.totalOperationalKm,
    fuelCost: riderEconomics.fuelCost,
    maintenanceCost: riderEconomics.maintenanceCost,
    waitingMinutes: riderEconomics.waitingMinutes,
    waitingCompensation: riderEconomics.waitingCompensation,
    operationalCompensation: riderEconomics.operationalCompensation,
    operatingCost: riderEconomics.operatingCost,
    platformShare,
    isWithinServiceLimit,
    distanceModelNote: "Estimated road distance calculated via 1.35 circuity factor over PostGIS radial distance.",
  };
}

/**
 * Economic Feasibility Evaluation
 * Evaluates whether an order's fulfilment economics yield an acceptable platform contribution.
 * 
 * Economic Viability States:
 * - ECONOMICALLY_VIABLE: contribution >= 0
 * - PILOT_TOLERANCE: contribution < 0 but >= pilotMinimumContribution (-₦100 default)
 * - ECONOMICALLY_UNVIABLE: contribution < pilotMinimumContribution
 */
export function evaluateEconomicFeasibility(params: {
  subtotal: number;
  deliveryFee: number;
  customerServiceFee?: number;
  merchantCommissionRate?: number;
  riderPayout: number;
  pilotMinimumContribution?: number;
}): EconomicFeasibilityResult {
  const customerServiceFee = params.customerServiceFee ?? DEFAULT_PLATFORM_SERVICE_FEE;
  const commissionRate = params.merchantCommissionRate ?? DEFAULT_MERCHANT_COMMISSION_RATE;
  const merchantCommission = Math.round(params.subtotal * commissionRate);

  const totalCustomerPayment = params.subtotal + params.deliveryFee + customerServiceFee;
  const gatewayFee = Math.round(totalCustomerPayment * GATEWAY_FEE_RATE);

  const totalPlatformRevenue = customerServiceFee + merchantCommission + params.deliveryFee;
  const totalVariableCosts = params.riderPayout + gatewayFee;
  const estimatedContribution = totalPlatformRevenue - totalVariableCosts;

  const pilotMinContribution = params.pilotMinimumContribution ?? PILOT_MINIMUM_CONTRIBUTION;

  let viabilityState: EconomicViabilityState;
  if (estimatedContribution >= 0) {
    viabilityState = "ECONOMICALLY_VIABLE";
  } else if (estimatedContribution >= pilotMinContribution) {
    viabilityState = "PILOT_TOLERANCE";
  } else {
    viabilityState = "ECONOMICALLY_UNVIABLE";
  }

  const isFeasible = viabilityState !== "ECONOMICALLY_UNVIABLE";

  return {
    isFeasible,
    viabilityState,
    orderSubtotal: params.subtotal,
    deliveryFee: params.deliveryFee,
    customerServiceFee,
    merchantCommission,
    merchantCommissionRate: commissionRate,
    totalCustomerPayment,
    totalPlatformRevenue,
    riderPayout: params.riderPayout,
    gatewayFee,
    totalVariableCosts,
    estimatedContribution,
    pilotMinimumContribution: pilotMinContribution,
    reason: isFeasible
      ? undefined
      : `Order fulfilment economics (contribution: ₦${estimatedContribution}) exceed pilot tolerance floor of ₦${pilotMinContribution}.`,
  };
}

/**
 * Build Immutable Order Economic Snapshot
 * Captured when an order is created or confirmed.
 */
export function buildOrderEconomicSnapshot(params: {
  pricing: DeliveryPricingBreakdown;
  orderSubtotal: number;
  merchantCommissionRate?: number;
  config?: Partial<RiderEconomicsConfig>;
}): OrderEconomicSnapshot {
  const cfg: RiderEconomicsConfig = {
    ...DEFAULT_RIDER_ECONOMICS,
    ...params.config,
  };

  const feasibility = evaluateEconomicFeasibility({
    subtotal: params.orderSubtotal,
    deliveryFee: params.pricing.deliveryFee,
    customerServiceFee: params.pricing.customerServiceFee,
    merchantCommissionRate: params.merchantCommissionRate ?? DEFAULT_MERCHANT_COMMISSION_RATE,
    riderPayout: params.pricing.riderPayout,
    pilotMinimumContribution: cfg.pilotMinimumContribution,
  });

  return {
    pricing_version: PRICING_VERSION,
    pricing_version_label: PRICING_VERSION_LABEL,
    delivery_fee: params.pricing.deliveryFee,
    platform_fee: params.pricing.customerServiceFee,
    merchant_commission: feasibility.merchantCommission,
    merchant_commission_rate: feasibility.merchantCommissionRate,
    rider_payout: params.pricing.riderPayout,
    rider_minimum_payout: cfg.riderMinimumPayout,
    rider_acceptance_floor: cfg.riderAcceptanceFloor,
    fuel_price: cfg.riderFuelPricePerLitre,
    fuel_efficiency: cfg.riderFuelEfficiencyKmPerLitre,
    maintenance_cost_per_km: cfg.riderMaintenanceCostPerKm,
    waiting_compensation_per_minute: cfg.riderWaitingCompensationPerMinute,
    operational_distance: params.pricing.totalRiderOperationalKm,
    business_to_customer_distance: params.pricing.roadKm,
    rider_to_business_distance: params.pricing.riderPickupKm,
    circuity_factor: CIRCUITY_FACTOR,
    estimated_fuel_cost: params.pricing.fuelCost,
    estimated_maintenance_cost: params.pricing.maintenanceCost,
    estimated_waiting_minutes: params.pricing.waitingMinutes,
    estimated_waiting_compensation: params.pricing.waitingCompensation,
    gateway_cost: feasibility.gatewayFee,
    estimated_contribution: feasibility.estimatedContribution,
    contribution_state: feasibility.viabilityState,
    assumptions_note: "Pilot pricing assumptions derived from preliminary rider feedback and operational-cost modelling.",
    created_at: new Date().toISOString(),
  };
}

/**
 * Calculate actual delivery waiting times from lifecycle timestamps
 */
export function calculateDeliveryWaitMinutes(params: {
  assignedAt?: Date | string | null;
  pickedUpAt?: Date | string | null;
  arrivedAt?: Date | string | null;
  deliveredAt?: Date | string | null;
}): {
  businessWaitMinutes: number;
  customerWaitMinutes: number;
  totalWaitMinutes: number;
} {
  let businessWaitMinutes = 0;
  if (params.assignedAt && params.pickedUpAt) {
    const diffMs = new Date(params.pickedUpAt).getTime() - new Date(params.assignedAt).getTime();
    if (diffMs > 0) {
      businessWaitMinutes = Math.round((diffMs / 60000) * 10) / 10;
    }
  }

  let customerWaitMinutes = 0;
  if (params.arrivedAt && params.deliveredAt) {
    const diffMs = new Date(params.deliveredAt).getTime() - new Date(params.arrivedAt).getTime();
    if (diffMs > 0) {
      customerWaitMinutes = Math.round((diffMs / 60000) * 10) / 10;
    }
  } else if (params.pickedUpAt && params.deliveredAt) {
    // If arrivedAt wasn't separately captured, assume a portion (e.g. 5 min handoff)
    customerWaitMinutes = BASELINE_WAITING_MINUTES;
  }

  const totalWaitMinutes = Math.round((businessWaitMinutes + customerWaitMinutes) * 10) / 10;

  return {
    businessWaitMinutes,
    customerWaitMinutes,
    totalWaitMinutes,
  };
}
