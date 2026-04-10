import pino from "pino";

import { env } from "../../config/env.ts";

export const logger = pino({
  base: undefined,
  enabled: env.NODE_ENV !== "test",
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV === "development"
      ? {
        options: {
          colorize: true,
          ignore: "pid,hostname",
          translateTime: "SYS:standard",
        },
        target: "pino-pretty",
      }
      : undefined,
});
