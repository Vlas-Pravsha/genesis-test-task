import type { ContentfulStatusCode, StatusCode } from "hono/utils/http-status";

export const STATUS_CODE = {
  OK: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const satisfies Record<string, StatusCode>;

export type AppStatusCode = (typeof STATUS_CODE)[keyof typeof STATUS_CODE];
export type AppContentfulStatusCode = Extract<
  AppStatusCode,
  ContentfulStatusCode
>;
