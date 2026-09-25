
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";

import { env } from "./config/env";
import { db } from "./db/database";
import { requestIdMiddleware } from "./utils/request-id";
import { registerErrorHandler } from "./middleware/error-handler";
import { registerNotFoundHandler } from "./middleware/not-found";
import { authRoutes } from "./modules/auth/auth.routes";
import { businessRoutes } from "./modules/business/business.routes";
import { catalogRoutes } from "./modules/catalog/catalog.routes";
import { inventoryRoutes } from "./modules/inventory/inventory.routes";
import { cartRoutes } from "./modules/cart/cart.routes";
import { checkoutRoutes } from "./modules/checkout/checkout.routes";
import { orderRoutes } from "./modules/order/order.routes";
import { businessVerificationRoutes } from "./modules/business-verification/business-verification.routes";
import { riderVerificationRoutes } from "./modules/rider-verification/rider-verification.routes";
import { lifecycleRoutes } from "./modules/lifecycle/lifecycle.routes";
import { adminAccessRoutes } from "./modules/admin-access/admin-access.routes";
import { notificationRoutes } from "./modules/notification/notification.routes";
import { platformAdminRoutes } from "./modules/platform-admin/platform-admin.routes";
import { earningsRoutes } from "./modules/earnings/earnings.routes";
import { contactRoutes } from "./modules/contact/contact.routes";

export async function buildApp() {
  console.log("[STARTUP] buildApp entered");

  const app = Fastify({
    logger: true
  });

  await app.register(helmet);
  console.log("[STARTUP] Helmet registered");

  await app.register(cors, {
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  });
  
  console.log("[STARTUP] CORS registered");

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute"
  });
  console.log("[STARTUP] Rate limit registered");

  app.addHook("onRequest", requestIdMiddleware);

  registerErrorHandler(app);
  registerNotFoundHandler(app);

  await app.register(authRoutes, {
    prefix: "/api/v1/auth"
  });
  console.log("[STARTUP] Auth routes registered");

  await app.register(businessRoutes, {
    prefix: "/api/v1/businesses"
  });
  console.log("[STARTUP] Business routes registered");

  await app.register(adminAccessRoutes, {
    prefix: "/api/v1/admin"
  });
  console.log("[STARTUP] Admin routes registered");

  await app.register(platformAdminRoutes, {
    prefix: "/api/v1/admin/platform"
  });

  await app.register(businessVerificationRoutes, {
    prefix: "/api/v1/admin/business-verifications"
  });
  console.log("[STARTUP] Business verification routes registered");

  await app.register(riderVerificationRoutes, {
    prefix: "/api/v1/admin/rider-verifications"
  });
  console.log("[STARTUP] Rider verification routes registered");

  await app.register(catalogRoutes, {
    prefix: "/api/v1/catalog"
  });
  console.log("[STARTUP] Catalog routes registered");

  await app.register(inventoryRoutes, {
    prefix: "/api/v1/inventory"
  });
  console.log("[STARTUP] Inventory routes registered");

  await app.register(cartRoutes, {
    prefix: "/api/v1/cart"
  });
  console.log("[STARTUP] Cart routes registered");

  await app.register(checkoutRoutes, {
    prefix: "/api/v1/checkout"
  });
  console.log("[STARTUP] Checkout routes registered");

  await app.register(orderRoutes, {
    prefix: "/api/v1/orders"
  });
  console.log("[STARTUP] Order routes registered");

  await app.register(lifecycleRoutes, {
    prefix: "/api/v1"
  });
  console.log("[STARTUP] Lifecycle routes registered");

  await app.register(notificationRoutes, {
    prefix: "/api/v1/notifications"
  });
  console.log("[STARTUP] Notification routes registered");

  await app.register(earningsRoutes, {
    prefix: "/api/v1/earnings"
  });

  await app.register(contactRoutes, {
    prefix: "/api/v1/contact"
  });

  app.get("/health", async (_request, reply) => {
    app.log.info("[HEALTH] handler entered");

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    try {
      app.log.info("[HEALTH] before database query");

      const queryTimeout = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(
          () => reject(new Error("Health database query timed out after 5000ms")),
          5000
        );
      });

      const result = await Promise.race([
        db.query("SELECT NOW() AS database_time"),
        queryTimeout
      ]);

      app.log.info("[HEALTH] database query resolved successfully");

      const response = {
        status: "ok",
        service: "delivery-system-api",
        database: "connected",
        databaseTime: result.rows[0].database_time
      };

      app.log.info("[HEALTH] before sending response");
      return reply.send(response);
    } catch (error) {
      app.log.error(error, "[HEALTH] database query failed");
      app.log.info("[HEALTH] before sending error response");

      return reply.status(500).send({
        status: "error",
        service: "delivery-system-api",
        database: "unavailable",
        message: "Database health check failed."
      });
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  });

  console.log("[STARTUP] Health route registered");
  console.log("[STARTUP] Fastify setup complete");

  return app;
}

export default buildApp;