import type { Context, MiddlewareHandler } from "hono";
import { routePath } from "hono/route";

import {
  METRICS_ROUTE,
  WILDCARD_ROUTE,
} from "../../shared/constants/routes.ts";
import { AppError } from "../errors/app-error.ts";
import {
  httpErrorsTotal,
  httpRequestDurationSeconds,
  httpRequestsTotal,
} from "../metrics/metrics.ts";

const WILDCARD_ROUTES = new Set(["", WILDCARD_ROUTE, "/*"]);

const getRouteLabel = (context: Context) => {
  const currentRoute = routePath(context, -1);

  if (WILDCARD_ROUTES.has(currentRoute)) {
    return "unmatched";
  }

  return currentRoute;
};

export const metricsMiddleware: MiddlewareHandler = async (context, next) => {
  if (context.req.path === METRICS_ROUTE) {
    await next();
    return;
  }

  const endTimer = httpRequestDurationSeconds.startTimer();

  let statusCode = context.res.status;

  try {
    await next();
    statusCode = context.res.status;
  } catch (error) {
    const { statusCode: appStatusCode } = AppError.fromUnknown(error);
    statusCode = appStatusCode;
    throw error;
  } finally {
    const labels = {
      method: context.req.method,
      route: getRouteLabel(context),
      status_code: String(statusCode),
    };

    httpRequestsTotal.inc(labels);
    endTimer(labels);

    if (statusCode >= 500) {
      httpErrorsTotal.inc(labels);
    }
  }
};
