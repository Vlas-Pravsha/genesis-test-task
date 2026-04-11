import type { Context } from "hono";

import { REQUEST_ID_HEADER } from "../../shared/constants/http.ts";
import { AppError } from "../errors/app-error.ts";
import { logger } from "../logger/logger.ts";

const getRequestId = (context: Context) =>
  context.req.header(REQUEST_ID_HEADER);

export const notFoundMiddleware = (context: Context) => {
  const requestId = getRequestId(context);
  const appError = AppError.notFound("Not Found");

  return context.json(
    {
      code: appError.code,
      details: null,
      message: appError.message,
      ...(requestId ? { requestId } : {}),
    },
    appError.statusCode
  );
};

export const errorMiddleware = (error: unknown, context: Context) => {
  const appError = AppError.fromUnknown(error);
  const requestId = getRequestId(context);
  const isServerError = appError.statusCode >= 500;
  const shouldMaskError = appError.statusCode === 500;

  const logContext = {
    cause: appError.cause,
    code: appError.code,
    details: appError.details,
    err: error instanceof Error ? error : undefined,
    method: context.req.method,
    path: context.req.path,
    requestId,
    statusCode: appError.statusCode,
  };

  if (isServerError) {
    logger.error(logContext, "request failed");
  } else {
    logger.warn(logContext, "request failed");
  }

  return context.json(
    {
      code: appError.code,
      details: shouldMaskError ? null : (appError.details ?? null),
      message: shouldMaskError ? "Internal Server Error" : appError.message,
      ...(requestId ? { requestId } : {}),
    },
    appError.statusCode
  );
};
