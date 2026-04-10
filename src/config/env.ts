import "dotenv/config";
import { z } from "zod";

import {
  DEFAULT_APP_URL,
  DEFAULT_CRON_SCHEDULE,
  DEFAULT_PORT,
  DEFAULT_RESEND_FROM_EMAIL,
} from "../shared/constants/app.ts";

const envSchema = z.object({
  APP_URL: z.url().default(DEFAULT_APP_URL),
  CRON_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  CRON_SCHEDULE: z.string().min(1).default(DEFAULT_CRON_SCHEDULE),
  DATABASE_URL: z.string().min(1),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.email().trim().default(DEFAULT_RESEND_FROM_EMAIL),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_URL: z.string().min(1).optional(),
});

const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
  throw new Error(
    `Invalid environment variables: ${parsedEnv.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ")}`
  );
}

export const env = parsedEnv.data;
