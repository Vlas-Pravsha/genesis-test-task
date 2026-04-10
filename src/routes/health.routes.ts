import { Hono } from "hono";

import {
  getDatabaseHealth,
  getHealth,
} from "../modules/health/health.controller.ts";

export const healthRoutes = new Hono();

healthRoutes.get("/health", getHealth);
healthRoutes.get("/health/db", getDatabaseHealth);
