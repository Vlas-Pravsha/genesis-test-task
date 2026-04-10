import { Hono } from "hono";

import { subscriptionsRoutes } from "./subscriptions.routes.ts";

export const apiRoutes = new Hono();

apiRoutes.route("/", subscriptionsRoutes);
