import { Hono } from "hono";

import {
  confirm,
  getSubscriptions,
  subscribe,
  unsubscribe,
} from "../modules/subscriptions/subscriptions.controller.ts";

export const subscriptionsRoutes = new Hono();

subscriptionsRoutes.post("/subscribe", subscribe);
subscriptionsRoutes.get("/confirm/:token", confirm);
subscriptionsRoutes.get("/unsubscribe/:token", unsubscribe);
subscriptionsRoutes.get("/subscriptions", getSubscriptions);
