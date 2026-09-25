export interface PlatformFeeInputs {
  subtotal: number;
  deliveryFee: number;
  customerPlatformFee: number;
  businessPlatformFee: number;
}

export interface PlatformFeeBreakdown {
  subtotal: number;
  deliveryFee: number;
  customerPlatformFee: number;
  businessPlatformFee: number;
  customerTotal: number;
  totalPlatformRevenue: number;
}

export function calculatePlatformFees({
  subtotal,
  deliveryFee,
  customerPlatformFee,
  businessPlatformFee,
}: PlatformFeeInputs): PlatformFeeBreakdown {
  const safeSubtotal = Number(subtotal) || 0;
  const safeDeliveryFee = Number(deliveryFee) || 0;
  const safeCustomerFee = Number(customerPlatformFee) || 0;
  const safeBusinessFee = Number(businessPlatformFee) || 0;

  return {
    subtotal: safeSubtotal,
    deliveryFee: safeDeliveryFee,
    customerPlatformFee: safeCustomerFee,
    businessPlatformFee: safeBusinessFee,
    customerTotal: safeSubtotal + safeDeliveryFee + safeCustomerFee,
    totalPlatformRevenue: safeCustomerFee + safeBusinessFee,
  };
}