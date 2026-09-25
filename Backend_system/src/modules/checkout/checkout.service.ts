import { AppError } from "../../utils/app-error";

import {
  findActiveCartItems,
  findBusinessProducts,
  findCandidateBusinesses,
  isBusinessCurrentlyOpen
} from "./checkout.repository";

import type {
  CheckoutPreviewInput
} from "./checkout.schemas";
import { expireInventoryReservations } from "../inventory/inventory.maintenance";

const SEARCH_RADIUS_BANDS_METERS = [
  2000,
  5000,
  10000,
  20000
];

const MAX_SEARCH_RADIUS_METERS = 20000;

interface EvaluatedItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceAmount: number;
  subtotalAmount: number;
}

interface EvaluatedBusiness {
  businessId: string;
  businessName: string;
  distanceMeters: number;
  items: EvaluatedItem[];
  subtotalAmount: number;
}

export async function previewCheckout(
  userId: string,
  input: CheckoutPreviewInput
) {
  await expireInventoryReservations();
  const cartItems =
    await findActiveCartItems(userId);

  if (cartItems.length === 0) {
    throw new AppError(
      "Your cart is empty.",
      400,
      "CART_EMPTY",
      true
    );
  }

  const productIds =
    cartItems.map(
      (item) => item.productId
    );

  const businessesChecked: string[] = [];

  let qualifyingBusiness:
    EvaluatedBusiness | null = null;

  let selectedRadius: number | null = null;

  for (
    const radiusMeters
    of SEARCH_RADIUS_BANDS_METERS
  ) {
    const candidates =
      await findCandidateBusinesses(
        input.latitude,
        input.longitude,
        radiusMeters
      );

    for (const candidate of candidates) {
      if (
        businessesChecked.includes(
          candidate.businessId
        )
      ) {
        continue;
      }

      businessesChecked.push(
        candidate.businessId
      );

      const isOpen =
        await isBusinessCurrentlyOpen(
          candidate.businessId
        );

      if (!isOpen) {
        continue;
      }

      const businessProducts =
        await findBusinessProducts(
          candidate.businessId,
          productIds
        );

      if (
        businessProducts.length !==
        cartItems.length
      ) {
        continue;
      }

      const productMap =
        new Map(
          businessProducts.map(
            (product) => [
              product.productId,
              product
            ]
          )
        );

      const evaluatedItems:
        EvaluatedItem[] = [];

      let canFulfill = true;

      for (const cartItem of cartItems) {
        const businessProduct =
          productMap.get(
            cartItem.productId
          );

        if (!businessProduct) {
          canFulfill = false;
          break;
        }

        if (
          !businessProduct.isAvailable
        ) {
          canFulfill = false;
          break;
        }

        const availableQuantity =
          businessProduct.quantityOnHand -
          businessProduct.quantityReserved;

        if (
          availableQuantity <
          cartItem.quantity
        ) {
          canFulfill = false;
          break;
        }

        const subtotalAmount =
          businessProduct.priceAmount *
          cartItem.quantity;

        evaluatedItems.push({
          productId:
            cartItem.productId,
          productName:
            cartItem.productName,
          quantity:
            cartItem.quantity,
          unitPriceAmount:
            businessProduct.priceAmount,
          subtotalAmount
        });
      }

      if (!canFulfill) {
        continue;
      }

      const subtotalAmount =
        evaluatedItems.reduce(
          (total, item) =>
            total + item.subtotalAmount,
          0
        );

      qualifyingBusiness = {
        businessId:
          candidate.businessId,
        businessName:
          candidate.businessName,
        distanceMeters:
          candidate.distanceMeters,
        items:
          evaluatedItems,
        subtotalAmount
      };

      selectedRadius =
        radiusMeters;

      break;
    }

    if (qualifyingBusiness) {
      break;
    }
  }

  if (!qualifyingBusiness) {
    throw new AppError(
      `No single business can fulfill your entire order within ${MAX_SEARCH_RADIUS_METERS / 1000} km.`,
      409,
      "NO_FULFILLING_BUSINESS",
      true
    );
  }

  const platformFeeAmount = 150;
  const totalAmount = qualifyingBusiness.subtotalAmount + platformFeeAmount;

  return {
    subtotal: qualifyingBusiness.subtotalAmount,
    deliveryFee: 0,
    platformFee: platformFeeAmount,
    vat: 0,
    total: totalAmount,
    cart: {
      itemCount: cartItems.length
    },

    fulfillment: {
      businessId:
        qualifyingBusiness.businessId,
      businessName:
        qualifyingBusiness.businessName,
      distanceMeters:
        qualifyingBusiness.distanceMeters,
      searchRadiusMeters:
        selectedRadius
    },

    delivery: {
      addressLine:
        input.deliveryAddressLine,
      city:
        input.deliveryCity,
      state:
        input.deliveryState,
      latitude:
        input.latitude,
      longitude:
        input.longitude
    },

    pricing: {
      currency: "NGN",
      subtotalAmount:
        qualifyingBusiness.subtotalAmount,
      deliveryFeeAmount: 0,
      platformFeeAmount,
      totalAmount
    },

    items:
      qualifyingBusiness.items
  };
}