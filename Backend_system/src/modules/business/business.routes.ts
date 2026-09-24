import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest
} from "fastify";

import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse } from "../../utils/api-response";

import {
  createBusinessSchema,
  createOperatingExceptionSchema,
  operatingExceptionParamsSchema,
  businessProductParamsSchema,
  updateOperatingExceptionSchema,
  updateOperatingHoursSchema
} from "./business.schemas";

import {
  createBusinessCatalogItemSchema,
  updateBusinessCatalogItemSchema
} from "./business-catalog.schemas";

import {
  createOperatingExceptionForOwner,
  deleteOperatingExceptionForOwner,
  getBusinessForOwner,
  getBusinessApplicationForCustomer,
  getBusinessReadinessForOwner,
  getBusinessReadinessHistoryForOwner,
  getOperatingExceptionsForOwner,
  getOperatingHoursForOwner,
  registerBusiness,
  updateOperatingExceptionForOwner,
  updateOperatingHoursForOwner,
  getBusinessCatalogForOwner,
  addProductToBusinessCatalog,
  updateBusinessCatalogForOwner,
  deleteBusinessCatalogForOwner
} from "./business.service";

export async function businessRoutes(
  app: FastifyInstance
): Promise<void> {
  const businessOwnerPreHandler = [
    authenticate,
    authorize("BUSINESS_USER")
  ];

  /**
   * Register a business.
   */
  app.post(
    "/",
    {
      preHandler: [
        authenticate,
        authorize("CUSTOMER")
      ]
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const parsed =
        createBusinessSchema.safeParse(
          request.body
        );

      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid business data.",
            details: parsed.error.flatten()
          },
          requestId: request.id
        });
      }

      const business =
        await registerBusiness(
          parsed.data,
          request.user.id
        );

      return reply.status(201).send(
        successResponse(
          business,
          request.id
        )
      );
    }
  );

  /**
   * Get the authenticated owner's business.
   */
  app.get(
    "/me",
    {
      preHandler: businessOwnerPreHandler
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const business =
        await getBusinessForOwner(
          request.user.id
        );

      return reply.status(200).send(
        successResponse(
          business,
          request.id
        )
      );
    }
  );

  app.get(
    "/application",
    { preHandler: [authenticate, authorize("CUSTOMER", "BUSINESS_USER")] },
    async (request) => successResponse(
      await getBusinessApplicationForCustomer(request.user.id),
      request.id
    )
  );

  /**
   * Get the business's weekly operating hours.
   */
  app.get(
    "/me/operating-hours",
    {
      preHandler: businessOwnerPreHandler
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const hours =
        await getOperatingHoursForOwner(
          request.user.id
        );

      return reply.status(200).send(
        successResponse(
          hours,
          request.id
        )
      );
    }
  );

  /**
   * Replace the complete weekly operating schedule.
   *
   * Exactly seven entries are required:
   * one for each day of the week.
   */
  app.put(
    "/me/operating-hours",
    {
      preHandler: businessOwnerPreHandler
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const parsed =
        updateOperatingHoursSchema.safeParse(
          request.body
        );

      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Invalid operating-hours data.",
            details: parsed.error.flatten()
          },
          requestId: request.id
        });
      }

      const hours =
        await updateOperatingHoursForOwner(
          request.user.id,
          parsed.data
        );

      return reply.status(200).send(
        successResponse(
          hours,
          request.id
        )
      );
    }
  );

  /**
   * Get all date-specific operating exceptions.
   */
  app.get(
    "/me/operating-exceptions",
    {
      preHandler: businessOwnerPreHandler
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const exceptions =
        await getOperatingExceptionsForOwner(
          request.user.id
        );

      return reply.status(200).send(
        successResponse(
          exceptions,
          request.id
        )
      );
    }
  );

  /**
   * Create an operating exception.
   */
  app.post(
    "/me/operating-exceptions",
    {
      preHandler: businessOwnerPreHandler
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const parsed =
        createOperatingExceptionSchema.safeParse(
          request.body
        );

      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Invalid operating-exception data.",
            details: parsed.error.flatten()
          },
          requestId: request.id
        });
      }

      const exception =
        await createOperatingExceptionForOwner(
          request.user.id,
          parsed.data
        );

      return reply.status(201).send(
        successResponse(
          exception,
          request.id
        )
      );
    }
  );

  /**
   * Update an existing operating exception.
   */
  app.put(
    "/me/operating-exceptions/:exceptionId",
    {
      preHandler: businessOwnerPreHandler
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const parsedParams =
        operatingExceptionParamsSchema.safeParse(
          request.params
        );

      if (!parsedParams.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid exception ID.",
            details: parsedParams.error.flatten()
          },
          requestId: request.id
        });
      }

      const parsed =
        updateOperatingExceptionSchema.safeParse(
          request.body
        );

      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Invalid operating-exception data.",
            details: parsed.error.flatten()
          },
          requestId: request.id
        });
      }

      const exception =
        await updateOperatingExceptionForOwner(
          request.user.id,
          parsedParams.data.exceptionId,
          parsed.data
        );

      return reply.status(200).send(
        successResponse(
          exception,
          request.id
        )
      );
    }
  );

  /**
   * Delete an operating exception.
   */
  app.delete(
    "/me/operating-exceptions/:exceptionId",
    {
      preHandler: businessOwnerPreHandler
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const parsedParams =
        operatingExceptionParamsSchema.safeParse(
          request.params
        );

      if (!parsedParams.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid exception ID.",
            details: parsedParams.error.flatten()
          },
          requestId: request.id
        });
      }

      await deleteOperatingExceptionForOwner(
        request.user.id,
        parsedParams.data.exceptionId
      );

      return reply.status(200).send(
        successResponse(
          {
            message:
              "Operating exception deleted successfully."
          },
          request.id
        )
      );
    }
  );

  /**
   * Get the business catalog.
   *
   * Returns the canonical platform products
   * enrolled by this business together with
   * the business-specific price and availability.
   */
  app.get(
    "/me/catalog",
    {
      preHandler: businessOwnerPreHandler
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const catalog =
        await getBusinessCatalogForOwner(
          request.user.id
        );

      return reply.status(200).send(
        successResponse(
          catalog,
          request.id
        )
      );
    }
  );

  /**
   * Add a platform product to the business catalog.
   *
   * The business chooses its own price for
   * the canonical platform product.
   */
  app.post(
    "/me/catalog",
    {
      preHandler: businessOwnerPreHandler
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const parsed =
        createBusinessCatalogItemSchema.safeParse(
          request.body
        );

      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Invalid business catalog data.",
            details: parsed.error.flatten()
          },
          requestId: request.id
        });
      }

      const catalogItem =
        await addProductToBusinessCatalog(
          request.user.id,
          parsed.data
        );

      return reply.status(201).send(
        successResponse(
          catalogItem,
          request.id
        )
      );
    }
  );

  /**
   * Update a business catalog item.
   *
   * This allows the business to change its
   * own price, currency, or availability.
   */
  app.put(
    "/me/catalog/:businessProductId",
    {
      preHandler: businessOwnerPreHandler
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const parsedParams =
        businessProductParamsSchema.safeParse(
          request.params
        );

      if (!parsedParams.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid business product ID.",
            details: parsedParams.error.flatten()
          },
          requestId: request.id
        });
      }

      const parsed =
        updateBusinessCatalogItemSchema.safeParse(
          request.body
        );

      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Invalid business catalog data.",
            details: parsed.error.flatten()
          },
          requestId: request.id
        });
      }

      const catalogItem =
        await updateBusinessCatalogForOwner(
          request.user.id,
          parsedParams.data.businessProductId,
          parsed.data
        );

      return reply.status(200).send(
        successResponse(
          catalogItem,
          request.id
        )
      );
    }
  );

  /**
   * Remove a product from the business catalog.
   *
   * Removal is blocked when inventory already
   * exists for the product. In that case the
   * business should mark the product unavailable.
   */
  app.delete(
    "/me/catalog/:businessProductId",
    {
      preHandler: businessOwnerPreHandler
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const parsedParams =
        businessProductParamsSchema.safeParse(
          request.params
        );

      if (!parsedParams.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid business product ID.",
            details: parsedParams.error.flatten()
          },
          requestId: request.id
        });
      }

      await deleteBusinessCatalogForOwner(
        request.user.id,
        parsedParams.data.businessProductId
      );

      return reply.status(200).send(
        successResponse(
          {
            message:
              "Business catalog item deleted successfully."
          },
          request.id
        )
      );
    }
  );

  /**
   * Get current business onboarding readiness.
   */
  app.get(
    "/me/readiness",
    {
      preHandler: businessOwnerPreHandler
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const readiness =
        await getBusinessReadinessForOwner(
          request.user.id
        );

      return reply.status(200).send(
        successResponse(
          readiness,
          request.id
        )
      );
    }
  );

  /**
   * Get historical configuration-readiness changes.
   */
  app.get(
    "/me/readiness/history",
    {
      preHandler: businessOwnerPreHandler
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const history =
        await getBusinessReadinessHistoryForOwner(
          request.user.id
        );

      return reply.status(200).send(
        successResponse(
          history,
          request.id
        )
      );
    }
  );
}