import type { MiddlewareHandler } from "hono";

import { logger } from "../logger/logger.ts";

export const requestLoggerMiddleware: MiddlewareHandler = async (
  context,
  next
) => {
  const startedAt = performance.now();

  try {
    await next();
  } finally {
    logger.info(
      {
        durationMs: Number((performance.now() - startedAt).toFixed(1)),
        method: context.req.method,
        path: context.req.path,
        status: context.res.status,
      },
      "request completed"
    );
  }
};
