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
import { businessVerificationRoutes} from "./modules/business-verification/business-verification.routes";
import { lifecycleRoutes } from "./modules/lifecycle/lifecycle.routes";
import { ensureRiderRuntimeTables } from "./modules/lifecycle/lifecycle.service";
import { adminAccessRoutes } from "./modules/admin-access/admin-access.routes";

export async function buildApp() {
  const app = Fastify({
    logger: true
  });

  await ensureRiderRuntimeTables();

  await app.register(helmet);

  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    // @fastify/cors defaults to GET,HEAD,POST only. The cart API uses
    // PUT/DELETE (update item, remove item, clear cart), so those methods must
    // be allowed or browser preflights from the frontend origin will be
    // rejected. Transport configuration only — no API contract changes.
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute"
  });

  app.addHook("onRequest", requestIdMiddleware);

  registerErrorHandler(app);
  registerNotFoundHandler(app);

  await app.register(authRoutes, {
    prefix: "/api/v1/auth"
  });

  await app.register(businessRoutes, {
    prefix: "/api/v1/businesses"
  });

  await app.register(adminAccessRoutes, {
    prefix: "/api/v1/admin"
  });

  await app.register(
  businessVerificationRoutes,
  {
    prefix:
      "/api/v1/admin/business-verifications"
  });

  await app.register(catalogRoutes, {
    prefix: "/api/v1/catalog"
  });

  await app.register(inventoryRoutes, {
  prefix: "/api/v1/inventory"
});

await app.register(cartRoutes, {
  prefix: "/api/v1/cart"
});

await app.register(checkoutRoutes, {
  prefix: "/api/v1/checkout"
});

await app.register(orderRoutes, {
  prefix: "/api/v1/orders"
});

await app.register(lifecycleRoutes, {
  prefix: "/api/v1"
});

  app.get("/health", async () => {
    const result = await db.query(
      "SELECT NOW() AS database_time"
    );

    return {
      status: "ok",
      service: "delivery-system-api",
      database: "connected",
      databaseTime: result.rows[0].database_time
    };
  });

  return app;
}