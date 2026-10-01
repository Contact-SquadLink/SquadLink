/**
 * SquadLink Advanced Delivery Pricing & Operational Economics Engine
 * 
 * Implements:
 * 1. Road distance calculation with circuity factor (1.35x PostGIS radial distance).
 * 2. 20 km road service limit.
 * 3. Customer Pilot Test Delivery Pricing Tiers (0-2km: ₦250, 2-4km: ₦300, 4-6km: ₦400,
 *    6-8km: ₦500, 8-10km: ₦600, 10-13km: ₦700, 13-16km: ₦800, 16-20km: ₦950).
 * 4. Separate SquadLink platform/service fee (₦150).
 * 5. Fuel-aware rider operational economics (Rider -> Business -> Customer distance,
 *    fuel price, vehicle efficiency, maintenance, waiting & communication compensation,
 *    with guaranteed ₦400 minimum and 80% share floor).
 * 6. Economic feasibility & net contribution analysis.
 * 7. Pricing versioning (version: 1) and historical snapshotting.
 */

export const PRICING_VERSION = 1;

/** Circuity factor to convert straight-line radial distance to estimated road distance */
export const CIRCUITY_FACTOR = 1.35;

/** Maximum allowable road distance for city serviceability */
export const MAX_SERVICE_DISTANCE_KM = 20.0;

/** Default customer platform/service fee in NGN */
export const DEFAULT_PLATFORM_SERVICE_FEE = 150;

/** Guaranteed minimum rider payout in NGN */
export const MINIMUM_RIDER_PAYOUT = 400;

/** Standard rider delivery revenue share floor (80%) */
export const RIDER_SHARE_RATIO = 0.80;

/** Payment gateway processing fee assumption (1.5%) */
export const GATEWAY_FEE_RATE = 0.015;

/**
 * Customer Delivery Distance Pricing Tiers (Bauchi Pilot Test Configuration)
 */
export interface CustomerPricingTier {
  minKm: number;
  maxKm: number;
  fee: number;
}

export const PILOT_CUSTOMER_TIERS: CustomerPricingTier[] = [
  { minKm: 0.0, maxKm: 2.0, fee: 250 },
  { minKm: 2.0, maxKm: 4.0, fee: 300 },
  { minKm: 4.0, maxKm: 6.0, fee: 400 },
  { minKm: 6.0, maxKm: 8.0, fee: 500 },
  { minKm: 8.0, maxKm: 10.0, fee: 600 },
  { minKm: 10.0, maxKm: 13.0, fee: 700 },
  { minKm: 13.0, maxKm: 16.0, fee: 800 },
  { minKm: 16.0, maxKm: 20.0, fee: 950 },
];

/**
 * Configurable Fuel-Aware Rider Economics Parameters
 */
export interface RiderEconomicsConfig {
  fuelPricePerLitre: number;             // NGN per litre of petrol
  vehicleEfficiencyKmPerLitre: number;   // km travelled per litre
  maintenanceCostPerKm: number;          // maintenance wear & tear cost per km
  baseTripCompensation: number;         // base show-up trip fee
  pickupCompensation: number;           // pickup & packaging coordination compensation
  riderTimeValue: number;               // waiting time & customer communication allowance
  minimumRiderPayout: number;           // guaranteed absolute minimum payout
  riderShareRatio: number;              // revenue share floor (e.g. 0.80)
}

export const DEFAULT_RIDER_ECONOMICS: RiderEconomicsConfig = {
  fuelPricePerLitre: 1150,
  vehicleEfficiencyKmPerLitre: 35,
  maintenanceCostPerKm: 25,
  baseTripCompensation: 250,
  pickupCompensation: 150,
  riderTimeValue: 100,
  minimumRiderPayout: 400,
  riderShareRatio: 0.80,
};

export interface DeliveryPricingBreakdown {
  pricingVersion: number;
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
  operatingCost: number;
  platformShare: number;
  isWithinServiceLimit: boolean;
}

export interface EconomicFeasibilityResult {
  isFeasible: boolean;
  orderSubtotal: number;
  deliveryFee: number;
  customerServiceFee: number;
  merchantCommission: number;
  totalPlatformRevenue: number;
  riderPayout: number;
  gatewayFee: number;
  totalVariableCosts: number;
  estimatedContribution: number;
  reason?: string;
}

/**
 * Calculate Customer Delivery Fee based on road distance
 */
export function calculateCustomerDeliveryFee(
  roadKm: number,
  tiers: CustomerPricingTier[] = PILOT_CUSTOMER_TIERS
): { fee: number; isWithinServiceLimit: boolean } {
  if (roadKm <= 0) {
    return { fee: tiers[0]?.fee ?? 250, isWithinServiceLimit: true };
  }

  if (roadKm > MAX_SERVICE_DISTANCE_KM) {
    // Beyond 20 km service limit
    const lastTier = tiers[tiers.length - 1];
    return { fee: lastTier ? lastTier.fee + 150 : 1100, isWithinServiceLimit: false };
  }

  for (const tier of tiers) {
    if (roadKm > tier.minKm && roadKm <= tier.maxKm) {
      return { fee: tier.fee, isWithinServiceLimit: true };
    }
  }

  // Fallback to closest tier or base
  if (roadKm <= (tiers[0]?.maxKm ?? 2.0)) {
    return { fee: tiers[0]?.fee ?? 250, isWithinServiceLimit: true };
  }

  const lastTier = tiers[tiers.length - 1];
  return { fee: lastTier ? lastTier.fee : 950, isWithinServiceLimit: true };
}

/**
 * Calculate fair, fuel-aware rider payout accounting for full operational distance
 * (Rider -> Business pickup + Business -> Customer delivery)
 */
export function calculateRiderPayout(
  deliveryRoadKm: number,
  options?: {
    riderPickupKm?: number;
    deliveryFee?: number;
    config?: Partial<RiderEconomicsConfig>;
  }
): {
  riderPayout: number;
  riderPickupKm: number;
  totalOperationalKm: number;
  fuelCost: number;
  maintenanceCost: number;
  operatingCost: number;
} {
  const cfg: RiderEconomicsConfig = {
    ...DEFAULT_RIDER_ECONOMICS,
    ...options?.config,
  };

  // Operational distance: Deadhead to business (preferred ~1.5 - 2.0 km) + Delivery to customer
  const riderPickupKm = options?.riderPickupKm != null && options.riderPickupKm >= 0
    ? options.riderPickupKm
    : 1.5; // standard preferred pickup deadhead estimate

  const totalOperationalKm = Math.round((riderPickupKm + deliveryRoadKm) * 100) / 100;

  // Fuel economics
  const fuelCost = Math.round(
    (totalOperationalKm / cfg.vehicleEfficiencyKmPerLitre) * cfg.fuelPricePerLitre
  );

  // Maintenance cost (tires, oil, engine wear)
  const maintenanceCost = Math.round(totalOperationalKm * cfg.maintenanceCostPerKm);

  const operatingCost = fuelCost + maintenanceCost;

  // Operational compensation floor (Base + Pickup + Operating Costs + Waiting/Communication Allowance)
  const costBasedCompensation =
    cfg.baseTripCompensation +
    cfg.pickupCompensation +
    operatingCost +
    cfg.riderTimeValue;

  // 80% revenue share of the delivery fee if available
  const revenueShareCompensation = options?.deliveryFee != null
    ? Math.round(options.deliveryFee * cfg.riderShareRatio)
    : 0;

  // Rider receives whichever is highest: Guaranteed minimum (₦400), Cost-based floor, or 80% split
  const riderPayout = Math.max(
    cfg.minimumRiderPayout,
    costBasedCompensation,
    revenueShareCompensation
  );

  return {
    riderPayout,
    riderPickupKm,
    totalOperationalKm,
    fuelCost,
    maintenanceCost,
    operatingCost,
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
  }
): DeliveryPricingBreakdown {
  const safeMeters = typeof distanceMeters === "number" && !isNaN(distanceMeters) && distanceMeters > 0
    ? distanceMeters
    : 0;

  const radialKm = Math.round((safeMeters / 1000) * 1000) / 1000;
  const roadKm = Math.round((radialKm * CIRCUITY_FACTOR) * 100) / 100;
  const roadDistanceMeters = Math.round(roadKm * 1000);

  // Average city speed ~30 km/h -> duration in seconds
  const estimatedDurationSeconds = Math.round((roadKm / 30) * 3600);

  // Customer delivery fee from pilot test tiers
  const { fee: deliveryFee, isWithinServiceLimit } = calculateCustomerDeliveryFee(roadKm);

  // Rider pickup distance
  const riderPickupKm = options?.riderPickupMeters != null
    ? Math.round((options.riderPickupMeters / 1000) * CIRCUITY_FACTOR * 100) / 100
    : 1.5;

  const riderEconomics = calculateRiderPayout(roadKm, {
    riderPickupKm,
    deliveryFee,
    config: options?.fuelPricePerLitre ? { fuelPricePerLitre: options.fuelPricePerLitre } : undefined,
  });

  const customerServiceFee = options?.platformServiceFee ?? DEFAULT_PLATFORM_SERVICE_FEE;

  // Platform share of retained fulfilment revenue
  const platformShare = Math.max(0, (deliveryFee + customerServiceFee) - riderEconomics.riderPayout);

  return {
    pricingVersion: PRICING_VERSION,
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
    operatingCost: riderEconomics.operatingCost,
    platformShare,
    isWithinServiceLimit,
  };
}

/**
 * Economic Feasibility Evaluation
 * Evaluates whether an order's fulfilment economics yield an acceptable platform contribution.
 */
export function evaluateEconomicFeasibility(params: {
  subtotal: number;
  deliveryFee: number;
  customerServiceFee?: number;
  merchantCommissionRate?: number;
  riderPayout: number;
  minAcceptableContribution?: number;
}): EconomicFeasibilityResult {
  const customerServiceFee = params.customerServiceFee ?? DEFAULT_PLATFORM_SERVICE_FEE;
  const commissionRate = params.merchantCommissionRate ?? 0.10; // 10% standard merchant commission
  const merchantCommission = Math.round(params.subtotal * commissionRate);

  const totalCustomerPaid = params.subtotal + params.deliveryFee + customerServiceFee;
  const gatewayFee = Math.round(totalCustomerPaid * GATEWAY_FEE_RATE);

  const totalPlatformRevenue = customerServiceFee + merchantCommission + params.deliveryFee;
  const totalVariableCosts = params.riderPayout + gatewayFee;
  const estimatedContribution = totalPlatformRevenue - totalVariableCosts;

  const minAcceptableContribution = params.minAcceptableContribution ?? -100; // allow small pilot margin
  const isFeasible = estimatedContribution >= minAcceptableContribution;

  return {
    isFeasible,
    orderSubtotal: params.subtotal,
    deliveryFee: params.deliveryFee,
    customerServiceFee,
    merchantCommission,
    totalPlatformRevenue,
    riderPayout: params.riderPayout,
    gatewayFee,
    totalVariableCosts,
    estimatedContribution,
    reason: isFeasible ? undefined : "Order fulfilment economics exceed minimum acceptable contribution threshold.",
  };
}
