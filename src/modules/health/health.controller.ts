import type { Context } from "hono";

import { STATUS_CODE } from "../../shared/utils/status-code.ts";
import { getDatabaseHealthStatus, getHealthStatus } from "./health.service.ts";

export const getHealth = (context: Context) =>
  context.json(getHealthStatus(), STATUS_CODE.OK);

export const getDatabaseHealth = async (context: Context) =>
  context.json(await getDatabaseHealthStatus(), STATUS_CODE.OK);
