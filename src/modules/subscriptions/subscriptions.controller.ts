import type { Context } from "hono";
import type { z } from "zod";

import { AppError } from "../../core/errors/app-error.ts";
import {
  CONTENT_TYPE_HEADER,
  JSON_CONTENT_TYPE,
} from "../../shared/constants/http.ts";
import { STATUS_CODE } from "../../shared/constants/status-code.ts";
import { hasMediaType } from "../../shared/utils/http.ts";
import {
  emailQuerySchema,
  subscribeSchema,
  tokenParamSchema,
} from "./subscriptions.schemas.ts";
import { subscriptionsService } from "./subscriptions.service.ts";

const parseWithSchema = <TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown
) => {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw AppError.badRequest("Invalid request", {
      details: {
        issues: result.error.issues.map((issue) => ({
          message: issue.message,
          path: issue.path.join("."),
        })),
      },
    });
  }

  return result.data;
};

const readSubscribePayload = async (context: Context) => {
  const contentType = context.req.header(CONTENT_TYPE_HEADER) ?? "";

  if (hasMediaType(contentType, JSON_CONTENT_TYPE)) {
    try {
      return await context.req.json();
    } catch (error) {
      throw AppError.badRequest("Invalid JSON body", {
        cause: error,
      });
    }
  }

  return context.req.parseBody();
};

export const subscribe = async (context: Context) => {
  const payload = parseWithSchema(
    subscribeSchema,
    await readSubscribePayload(context)
  );

  const result = await subscriptionsService.subscribe(payload);

  return context.json(result, STATUS_CODE.OK);
};

export const confirm = async (context: Context) => {
  const { token } = parseWithSchema(tokenParamSchema, context.req.param());
  const result = await subscriptionsService.confirm(token);

  return context.json(result, STATUS_CODE.OK);
};

export const unsubscribe = async (context: Context) => {
  const { token } = parseWithSchema(tokenParamSchema, context.req.param());
  const result = await subscriptionsService.unsubscribe(token);

  return context.json(result, STATUS_CODE.OK);
};

export const getSubscriptions = async (context: Context) => {
  const { email } = parseWithSchema(emailQuerySchema, context.req.query());
  const result = await subscriptionsService.getSubscriptionsByEmail(email);

  return context.json(result, STATUS_CODE.OK);
};
