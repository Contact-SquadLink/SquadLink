import type { FastifyInstance } from "fastify";

import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse } from "../../utils/api-response";
import {
  deliveryIdParamsSchema,
  orderIdParamsSchema,
  paymentIdParamsSchema,
  pickupCredentialSchema,
  riderRegistrationSchema,
  riderLocationSchema,
  riderAssignmentDecisionSchema,
  providerPaymentSchema,
  sandboxPaymentSchema,
  deliveryOtpSchema
} from "./lifecycle.schemas";
import {
  acceptBusinessOrder,
  confirmDelivery,
  getRiderDelivery,
  getRiderProfile,
  issueDeliveryOtp,
  listBusinessOrders,
  listRiderDeliveries,
  markBusinessReady,
  retryRiderAssignment,
  processProviderPayment,
  processSandboxPayment,
  registerRider,
  setRiderAvailability,
  setRiderLocation,
  updateRiderDeliveryStatus,
  acceptRiderAssignment,
  rejectRiderAssignment,
  verifyPickup
} from "./lifecycle.service";

export async function lifecycleRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/business/orders",
    { preHandler: [authenticate, authorize("BUSINESS_USER")] },
    async (request) => successResponse(
      await listBusinessOrders(request.user.id),
      request.id
    )
  );

  app.post(
    "/business/orders/:orderId/accept",
    { preHandler: [authenticate, authorize("BUSINESS_USER")] },
    async (request) => {
      const { orderId } = orderIdParamsSchema.parse(request.params);
      return successResponse(
        await acceptBusinessOrder(request.user.id, orderId),
        request.id
      );
    }
  );

  app.post(
    "/business/orders/:orderId/ready",
    { preHandler: [authenticate, authorize("BUSINESS_USER")] },
    async (request) => {
      const { orderId } = orderIdParamsSchema.parse(request.params);
      return successResponse(
        await markBusinessReady(request.user.id, orderId),
        request.id
      );
    }
  );

  app.post(
    "/business/orders/:orderId/retry-rider",
    { preHandler: [authenticate, authorize("BUSINESS_USER")] },
    async (request) => {
      const { orderId } = orderIdParamsSchema.parse(request.params);
      return successResponse(
        await retryRiderAssignment(request.user.id, orderId),
        request.id
      );
    }
  );

  app.post(
    "/payments/:paymentId/provider-event",
    { preHandler: [authenticate, authorize("ADMIN")] },
    async (request) => {
      const { paymentId } = paymentIdParamsSchema.parse(request.params);
      const input = providerPaymentSchema.parse(request.body);
      return successResponse(
        await processProviderPayment(request.user.id, paymentId, input),
        request.id
      );
    }
  );

  app.post(
    "/payments/:paymentId/sandbox-complete",
    { preHandler: [authenticate, authorize("CUSTOMER", "BUSINESS_USER")] },
    async (request) => {
      const { paymentId } = paymentIdParamsSchema.parse(request.params);
      const input = sandboxPaymentSchema.parse(request.body);
      return successResponse(
        await processSandboxPayment(
          request.user.id,
          paymentId,
          input.paymentAttemptId,
          input.cardNumber
        ),
        request.id
      );
    }
  );

  app.post(
    "/rider/register",
    { preHandler: [authenticate, authorize("CUSTOMER")] },
    async (request, reply) => {
      const input = riderRegistrationSchema.parse(request.body);

      const rider = await registerRider(request.user.id, {
        vehicleType: input.vehicleType,
        vehicleRegistration: input.vehicleRegistration,
        phoneNumber: input.phoneNumber,
        firstName: input.firstName,
        lastName: input.lastName,
      });

      return reply.status(201).send(successResponse(rider, request.id));
    }
  );

  app.get(
    "/rider/me",
    { preHandler: [authenticate, authorize("RIDER")] },
    async (request) => successResponse(
      await getRiderProfile(request.user.id),
      request.id
    )
  );

  app.post(
    "/rider/availability",
    { preHandler: [authenticate, authorize("RIDER")] },
    async (request) => {
      const { available } = (request.body ?? {}) as { available?: boolean };
      if (typeof available !== "boolean") {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "available must be a boolean."
          },
          requestId: request.id
        };
      }

      return successResponse(
        await setRiderAvailability(request.user.id, available),
        request.id
      );
    }
  );

  app.post(
    "/rider/location",
    { preHandler: [authenticate, authorize("RIDER")] },
    async (request) => {
      const input = riderLocationSchema.parse(request.body);
      return successResponse(
        await setRiderLocation(request.user.id, input.latitude, input.longitude),
        request.id
      );
    }
  );

  app.get(
    "/rider/deliveries",
    { preHandler: [authenticate, authorize("RIDER")] },
    async (request) => successResponse(
      await listRiderDeliveries(request.user.id),
      request.id
    )
  );

  app.get(
    "/rider/deliveries/:deliveryId",
    { preHandler: [authenticate, authorize("RIDER")] },
    async (request) => {
      const { deliveryId } = deliveryIdParamsSchema.parse(request.params);
      return successResponse(
        await getRiderDelivery(request.user.id, deliveryId),
        request.id
      );
    }
  );

  app.post(
    "/rider/deliveries/:deliveryId/accept",
    { preHandler: [authenticate, authorize("RIDER")] },
    async (request) => {
      const { deliveryId } = deliveryIdParamsSchema.parse(request.params);
      return successResponse(
        await acceptRiderAssignment(request.user.id, deliveryId),
        request.id
      );
    }
  );

  app.post(
    "/rider/deliveries/:deliveryId/reject",
    { preHandler: [authenticate, authorize("RIDER")] },
    async (request) => {
      const { deliveryId } = deliveryIdParamsSchema.parse(request.params);
      const input = riderAssignmentDecisionSchema.parse(request.body ?? {});
      return successResponse(
        await rejectRiderAssignment(request.user.id, deliveryId, input.reason),
        request.id
      );
    }
  );

  app.post(
    "/deliveries/:deliveryId/pickup/verify",
    { preHandler: [authenticate, authorize("RIDER")] },
    async (request) => {
      const { deliveryId } = deliveryIdParamsSchema.parse(request.params);
      const { credential } = pickupCredentialSchema.parse(request.body);
      return successResponse(
        await verifyPickup(request.user.id, deliveryId, credential),
        request.id
      );
    }
  );

  app.post(
    "/deliveries/:deliveryId/in-transit",
    { preHandler: [authenticate, authorize("RIDER")] },
    async (request) => {
      const { deliveryId } = deliveryIdParamsSchema.parse(request.params);
      return successResponse(
        await updateRiderDeliveryStatus(request.user.id, deliveryId, "IN_TRANSIT"),
        request.id
      );
    }
  );

  app.post(
    "/deliveries/:deliveryId/arrived",
    { preHandler: [authenticate, authorize("RIDER")] },
    async (request) => {
      const { deliveryId } = deliveryIdParamsSchema.parse(request.params);
      return successResponse(
        await updateRiderDeliveryStatus(request.user.id, deliveryId, "ARRIVED"),
        request.id
      );
    }
  );

  app.post(
    "/deliveries/:deliveryId/otp",
    { preHandler: [authenticate, authorize("CUSTOMER")] },
    async (request) => {
      const { deliveryId } = deliveryIdParamsSchema.parse(request.params);
      return successResponse(
        await issueDeliveryOtp(request.user.id, deliveryId),
        request.id
      );
    }
  );

  app.post(
    "/deliveries/:deliveryId/confirm",
    { preHandler: [authenticate, authorize("RIDER")] },
    async (request) => {
      const { deliveryId } = deliveryIdParamsSchema.parse(request.params);
      const { otp } = deliveryOtpSchema.parse(request.body);
      return successResponse(
        await confirmDelivery(request.user.id, deliveryId, otp),
        request.id
      );
    }
  );
}
