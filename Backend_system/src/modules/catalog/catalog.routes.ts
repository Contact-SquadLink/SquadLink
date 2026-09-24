import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest
} from "fastify";

import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse } from "../../utils/api-response";

import {
  createCategorySchema,
  createProductSchema,
  updateCategorySchema,
  updateProductSchema
} from "./catalog.schemas";

import {
  getCategories,
  getProducts,
  getPublicProductById,
  getPlatformProducts,
  modifyCategory,
  modifyProduct,
  registerCategory,
  registerProduct
} from "./catalog.service";

export async function catalogRoutes(
  app: FastifyInstance
): Promise<void> {
  /**
   * Get platform categories.
   */
  app.get(
    "/categories",
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const categories =
        await getCategories();

      return reply.status(200).send(
        successResponse(
          categories,
          request.id
        )
      );
    }
  );

  app.get(
    "/templates",
    {
      preHandler: [authenticate, authorize("BUSINESS_USER", "ADMIN")]
    },
    async (request) => {
      const query = request.query as { search?: string };

      return successResponse(
        await getPlatformProducts(query.search),
        request.id
      );
    }
  );

  /**
   * Create a platform category.
   */
  app.post(
    "/categories",
    {
      preHandler: [
        authenticate,
        authorize("ADMIN")
      ]
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const parsed =
        createCategorySchema.safeParse(
          request.body
        );

      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Invalid category data.",
            details:
              parsed.error.flatten()
          },
          requestId: request.id
        });
      }

      const category =
        await registerCategory(
          parsed.data
        );

      return reply.status(201).send(
        successResponse(
          category,
          request.id
        )
      );
    }
  );

  /**
   * Update a platform category.
   */
  app.put(
    "/categories/:categoryId",
    {
      preHandler: [
        authenticate,
        authorize("ADMIN")
      ]
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const params =
        request.params as {
          categoryId?: string;
        };

      if (!params.categoryId) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Category ID is required."
          },
          requestId: request.id
        });
      }

      const parsed =
        updateCategorySchema.safeParse(
          request.body
        );

      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Invalid category data.",
            details:
              parsed.error.flatten()
          },
          requestId: request.id
        });
      }

      const category =
        await modifyCategory(
          params.categoryId,
          parsed.data
        );

      return reply.status(200).send(
        successResponse(
          category,
          request.id
        )
      );
    }
  );

  /**
   * Get platform products.
   */
  app.get(
    "/products",
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const products =
        await getProducts();

      return reply.status(200).send(
        successResponse(
          products,
          request.id
        )
      );
    }
  );

  app.get(
    "/products/:productId",
    async (request, reply) => {
      const params = request.params as { productId?: string };
      const product = params.productId
        ? await getPublicProductById(params.productId)
        : null;

      if (!product) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "PRODUCT_NOT_FOUND",
            message: "Product not found."
          },
          requestId: request.id
        });
      }

      return reply.status(200).send(
        successResponse(product, request.id)
      );
    }
  );

  /**
   * Create a platform product.
   */
  app.post(
    "/products",
    {
      preHandler: [
        authenticate,
        authorize("ADMIN")
      ]
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const parsed =
        createProductSchema.safeParse(
          request.body
        );

      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Invalid product data.",
            details:
              parsed.error.flatten()
          },
          requestId: request.id
        });
      }

      const product =
        await registerProduct(
          parsed.data
        );

      return reply.status(201).send(
        successResponse(
          product,
          request.id
        )
      );
    }
  );

  /**
   * Update a platform product.
   */
  app.put(
    "/products/:productId",
    {
      preHandler: [
        authenticate,
        authorize("ADMIN")
      ]
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const params =
        request.params as {
          productId?: string;
        };

      if (!params.productId) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Product ID is required."
          },
          requestId: request.id
        });
      }

      const parsed =
        updateProductSchema.safeParse(
          request.body
        );

      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Invalid product data.",
            details:
              parsed.error.flatten()
          },
          requestId: request.id
        });
      }

      const product =
        await modifyProduct(
          params.productId,
          parsed.data
        );

      return reply.status(200).send(
        successResponse(
          product,
          request.id
        )
      );
    }
  );
}