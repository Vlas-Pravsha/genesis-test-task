import { STATUS_CODE } from "../../shared/utils/status-code.ts";
import type { AppContentfulStatusCode } from "../../shared/utils/status-code.ts";
import type { JsonValue } from "../types/common.ts";
import { ERROR_CODES } from "./error-codes.ts";
import type { ErrorCode } from "./error-codes.ts";

interface AppErrorOptions {
  cause?: unknown;
  code: ErrorCode;
  details?: JsonValue;
  statusCode: AppContentfulStatusCode;
}

type AppErrorDetailsOptions = Pick<AppErrorOptions, "cause" | "details">;

export class AppError extends Error {
  readonly cause?: unknown;
  readonly code: ErrorCode;
  readonly details?: JsonValue;
  readonly statusCode: AppContentfulStatusCode;

  constructor(message: string, options: AppErrorOptions) {
    super(message, { cause: options.cause });

    this.name = "AppError";
    this.cause = options.cause;
    this.code = options.code;
    this.details = options.details;
    this.statusCode = options.statusCode;
  }

  static badRequest(message: string, options: AppErrorDetailsOptions = {}) {
    return new AppError(message, {
      ...options,
      code: ERROR_CODES.INVALID_REQUEST,
      statusCode: STATUS_CODE.BAD_REQUEST,
    });
  }

  static notFound(message: string, options: AppErrorDetailsOptions = {}) {
    return new AppError(message, {
      ...options,
      code: ERROR_CODES.NOT_FOUND,
      statusCode: STATUS_CODE.NOT_FOUND,
    });
  }

  static conflict(message: string, options: AppErrorDetailsOptions = {}) {
    return new AppError(message, {
      ...options,
      code: ERROR_CODES.CONFLICT,
      statusCode: STATUS_CODE.CONFLICT,
    });
  }

  static rateLimited(message: string, options: AppErrorDetailsOptions = {}) {
    return new AppError(message, {
      ...options,
      code: ERROR_CODES.RATE_LIMITED,
      statusCode: STATUS_CODE.TOO_MANY_REQUESTS,
    });
  }

  static serviceUnavailable(
    message: string,
    options: AppErrorDetailsOptions = {}
  ) {
    return new AppError(message, {
      ...options,
      code: ERROR_CODES.SERVICE_UNAVAILABLE,
      statusCode: STATUS_CODE.SERVICE_UNAVAILABLE,
    });
  }

  static internal(
    message = "Internal Server Error",
    options: AppErrorDetailsOptions = {}
  ) {
    return new AppError(message, {
      ...options,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      statusCode: STATUS_CODE.INTERNAL_SERVER_ERROR,
    });
  }

  static fromUnknown(error: unknown) {
    if (error instanceof AppError) {
      return error;
    }

    return AppError.internal("Internal Server Error", {
      cause: error,
    });
  }

  static normalize(error: unknown) {
    return AppError.fromUnknown(error);
  }

  toResponseBody(): {
    code: ErrorCode;
    details: JsonValue | null;
    message: string;
  } {
    return {
      code: this.code,
      details: this.details ?? null,
      message: this.message,
    };
  }
}
