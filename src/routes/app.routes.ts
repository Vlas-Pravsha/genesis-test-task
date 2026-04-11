import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { Hono } from "hono";

import { metricsRegistry } from "../core/metrics/metrics.ts";
import { APP_NAME } from "../shared/constants/app.ts";
import {
  ACCEPT_HEADER,
  CONTENT_TYPE_HEADER,
  HTML_CONTENT_TYPE,
} from "../shared/constants/http.ts";
import { METRICS_ROUTE, ROOT_ROUTE } from "../shared/constants/routes.ts";
import { STATUS_CODE } from "../shared/constants/status-code.ts";
import { hasMediaType } from "../shared/utils/http.ts";

const LANDING_PAGE_PATH = resolve(process.cwd(), "public/index.html");

export const appRoutes = new Hono();

appRoutes.get(ROOT_ROUTE, async (context) => {
  const accept = context.req.header(ACCEPT_HEADER) ?? "";

  if (hasMediaType(accept, HTML_CONTENT_TYPE)) {
    const html = await readFile(LANDING_PAGE_PATH, "utf-8");
    return context.html(html);
  }

  return context.json(
    {
      name: APP_NAME,
      status: "ok",
    },
    STATUS_CODE.OK
  );
});

appRoutes.get(METRICS_ROUTE, async (context) => {
  context.header(CONTENT_TYPE_HEADER, metricsRegistry.contentType);

  const metrics = await metricsRegistry.metrics();

  return context.body(metrics);
});
