import { buildApp } from "./app";
import { env } from "./config/env";
import { db } from "./db/database";

async function start() {
  console.log("[STARTUP] Before buildApp");
  const app = await buildApp();
  console.log("[STARTUP] After buildApp");

  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}. Shutting down...`);

    try {
      await app.close();
      await db.end();

      app.log.info("Delivery System API shut down cleanly.");
      process.exit(0);
    } catch (error) {
      app.log.error(error, "Error during shutdown.");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  try {
    console.log("[STARTUP] Before app.listen");
    await app.listen({
      port: env.PORT,
      host: "0.0.0.0"
    });
    console.log("[STARTUP] After app.listen");

    console.log(
      `Delivery System API running on http://localhost:${env.PORT}`
    );
  } catch (error) {
    app.log.error(error);
    await db.end();
    process.exit(1);
  }
}

void start();