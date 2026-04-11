export const ERROR_CODES = {
  CONFLICT: "conflict",
  INTERNAL_SERVER_ERROR: "internal_server_error",
  INVALID_REQUEST: "invalid_request",
  NOT_FOUND: "not_found",
  RATE_LIMITED: "rate_limited",
  SERVICE_UNAVAILABLE: "service_unavailable",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
