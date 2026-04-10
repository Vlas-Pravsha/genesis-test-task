import { Hono } from "hono";

import {
  errorMiddleware,
  notFoundMiddleware,
} from "./core/middlewares/error.middleware.ts";
import { requestLoggerMiddleware } from "./core/middlewares/request-logger.middleware.ts";
import { healthRoutes } from "./routes/health.routes.ts";
import { apiRoutes } from "./routes/index.ts";
import { APP_NAME } from "./shared/constants/app.ts";
import { STATUS_CODE } from "./shared/utils/status-code.ts";

export const createApp = () => {
  const app = new Hono();

  app.use("*", requestLoggerMiddleware);

  app.get("/", (context) =>
    context.json(
      {
        name: APP_NAME,
        status: "ok",
      },
      STATUS_CODE.OK
    )
  );

  app.route("/", healthRoutes);
  app.route("/api", apiRoutes);

  app.notFound(notFoundMiddleware);
  app.onError(errorMiddleware);

  return app;
};

export const app = createApp();
