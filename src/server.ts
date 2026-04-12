import { serve } from "@hono/node-server";

import { app } from "./app.ts";
import { env } from "./config/env.ts";
import { logger } from "./core/logger/logger.ts";
import { registerScannerScheduler } from "./modules/scanner/scanner.scheduler.ts";

registerScannerScheduler();

serve(
  {
    fetch: app.fetch,
    port: env.PORT || 3000,
  },
  (info) => {
    logger.info(
      {
        port: info.port,
        url: `http://localhost:${info.port}`,
      },
      "server started"
    );
  }
);
