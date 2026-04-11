import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";

import {
  errorMiddleware,
  notFoundMiddleware,
} from "./core/middlewares/error.middleware.ts";
import { metricsMiddleware } from "./core/middlewares/metrics.middleware.ts";
import { requestLoggerMiddleware } from "./core/middlewares/request-logger.middleware.ts";
import { appRoutes } from "./routes/app.routes.ts";
import { healthRoutes } from "./routes/health.routes.ts";
import { subscriptionsRoutes } from "./routes/subscriptions.routes.ts";
import {
  API_ROUTE,
  ASSETS_ROUTE,
  ROOT_ROUTE,
  WILDCARD_ROUTE,
} from "./shared/constants/routes.ts";

export const createApp = () => {
  const app = new Hono();

  app.use(WILDCARD_ROUTE, requestLoggerMiddleware);
  app.use(WILDCARD_ROUTE, cors());
  app.use(WILDCARD_ROUTE, metricsMiddleware);
  app.use(ASSETS_ROUTE, serveStatic({ root: "./public" }));

  app.route(ROOT_ROUTE, appRoutes);
  app.route(ROOT_ROUTE, healthRoutes);
  app.route(API_ROUTE, subscriptionsRoutes);

  app.notFound(notFoundMiddleware);
  app.onError(errorMiddleware);

  return app;
};

export const app = createApp();
