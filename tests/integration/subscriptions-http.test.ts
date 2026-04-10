import { faker } from "@faker-js/faker";
import { jest } from "@jest/globals";
import { mock, mockReset } from "jest-mock-extended";

import { AppError } from "../../src/core/errors/app-error.ts";
import { ERROR_CODES } from "../../src/core/errors/error-codes.ts";
import type { SubscriptionResponse } from "../../src/modules/subscriptions/subscriptions.types.ts";
import { STATUS_CODE } from "../../src/shared/utils/status-code.ts";

interface SubscribePayload {
  email: string;
  repo: string;
}

interface MessageResponse {
  message: string;
}

interface SubscriptionsServiceContract {
  confirm(token: string): Promise<MessageResponse>;
  getSubscriptionsByEmail(email: string): Promise<SubscriptionResponse[]>;
  subscribe(payload: SubscribePayload): Promise<MessageResponse>;
  unsubscribe(token: string): Promise<MessageResponse>;
}

const ROUTES = {
  CONFIRM: "/api/confirm",
  SUBSCRIBE: "/api/subscribe",
  SUBSCRIPTIONS: "/api/subscriptions",
  UNSUBSCRIBE: "/api/unsubscribe",
} as const;

const HEADERS = {
  CONTENT_TYPE: "content-type",
  JSON: "application/json",
  REQUEST_ID: "x-request-id",
} as const;

const FIXTURES = {
  EMAIL: faker.internet.email().toLowerCase(),
  INVALID_EMAIL: faker.string.alpha(12),
  REPO: "octocat/hello-world",
  REQUEST_ID: "request-123",
  TOKEN: "token-123",
} as const;

const RESPONSES = {
  CONFIRM_SUCCESS: "Subscription confirmed successfully",
  SUBSCRIBE_SUCCESS: "Subscription created successfully.",
  UNSUBSCRIBE_SUCCESS: "Unsubscribed successfully",
} as const;

const subscriptionsServiceMock = mock<SubscriptionsServiceContract>();

jest.unstable_mockModule(
  "../../src/modules/subscriptions/subscriptions.service.ts",
  () => ({
    subscriptionsService: subscriptionsServiceMock,
  })
);

const { createApp } = await import("../../src/app.ts");

const createMalformedSubscribeBody = (email: string) => `{"email":"${email}"`;

const createJsonRequest = (
  payload: unknown,
  headers: Record<string, string> = {}
) => ({
  body: JSON.stringify(payload),
  headers: {
    [HEADERS.CONTENT_TYPE]: HEADERS.JSON,
    ...headers,
  },
  method: "POST" as const,
});

describe("Subscriptions HTTP integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReset(subscriptionsServiceMock);
  });

  it("subscribes with a valid JSON payload", async () => {
    const app = createApp();

    subscriptionsServiceMock.subscribe.mockResolvedValue({
      message: RESPONSES.SUBSCRIBE_SUCCESS,
    });

    const response = await app.request(
      ROUTES.SUBSCRIBE,
      createJsonRequest({
        email: FIXTURES.EMAIL,
        repo: FIXTURES.REPO,
      })
    );

    expect(response.status).toBe(STATUS_CODE.OK);
    await expect(response.json()).resolves.toEqual({
      message: RESPONSES.SUBSCRIBE_SUCCESS,
    });
    expect(subscriptionsServiceMock.subscribe).toHaveBeenCalledWith({
      email: FIXTURES.EMAIL,
      repo: FIXTURES.REPO,
    });
  });

  it("returns bad request for malformed JSON payload", async () => {
    const app = createApp();

    const response = await app.request(ROUTES.SUBSCRIBE, {
      body: createMalformedSubscribeBody(FIXTURES.EMAIL),
      headers: {
        [HEADERS.CONTENT_TYPE]: HEADERS.JSON,
        [HEADERS.REQUEST_ID]: FIXTURES.REQUEST_ID,
      },
      method: "POST",
    });

    expect(response.status).toBe(STATUS_CODE.BAD_REQUEST);
    await expect(response.json()).resolves.toEqual({
      code: ERROR_CODES.INVALID_REQUEST,
      details: null,
      message: "Invalid JSON body",
      requestId: FIXTURES.REQUEST_ID,
    });
    expect(subscriptionsServiceMock.subscribe).not.toHaveBeenCalled();
  });

  it("validates the subscribe payload before calling the service", async () => {
    const app = createApp();

    const response = await app.request(
      ROUTES.SUBSCRIBE,
      createJsonRequest({
        email: FIXTURES.INVALID_EMAIL,
        repo: FIXTURES.REPO,
      })
    );

    const body = await response.json();

    expect(response.status).toBe(STATUS_CODE.BAD_REQUEST);
    expect(body).toMatchObject({
      code: ERROR_CODES.INVALID_REQUEST,
      details: {
        issues: [{ path: "email" }],
      },
      message: "Invalid request",
    });
    expect(subscriptionsServiceMock.subscribe).not.toHaveBeenCalled();
  });

  it("confirms a subscription by token", async () => {
    const app = createApp();

    subscriptionsServiceMock.confirm.mockResolvedValue({
      message: RESPONSES.CONFIRM_SUCCESS,
    });

    const response = await app.request(`${ROUTES.CONFIRM}/${FIXTURES.TOKEN}`);

    expect(response.status).toBe(STATUS_CODE.OK);
    await expect(response.json()).resolves.toEqual({
      message: RESPONSES.CONFIRM_SUCCESS,
    });
    expect(subscriptionsServiceMock.confirm).toHaveBeenCalledWith(
      FIXTURES.TOKEN
    );
  });

  it("propagates service errors from unsubscribe endpoint", async () => {
    const app = createApp();

    subscriptionsServiceMock.unsubscribe.mockRejectedValue(
      AppError.notFound("Unsubscribe token not found", {
        details: { token: FIXTURES.TOKEN },
      })
    );

    const response = await app.request(
      `${ROUTES.UNSUBSCRIBE}/${FIXTURES.TOKEN}`
    );

    expect(response.status).toBe(STATUS_CODE.NOT_FOUND);
    await expect(response.json()).resolves.toEqual({
      code: ERROR_CODES.NOT_FOUND,
      details: { token: FIXTURES.TOKEN },
      message: "Unsubscribe token not found",
    });
    expect(subscriptionsServiceMock.unsubscribe).toHaveBeenCalledWith(
      FIXTURES.TOKEN
    );
  });

  it("returns subscriptions list for a valid email query", async () => {
    const app = createApp();
    const subscriptions: SubscriptionResponse[] = [
      {
        confirmed: true,
        email: FIXTURES.EMAIL,
        last_seen_tag: "v1.2.3",
        repo: FIXTURES.REPO,
      },
    ];

    subscriptionsServiceMock.getSubscriptionsByEmail.mockResolvedValue(
      subscriptions
    );

    const response = await app.request(
      `${ROUTES.SUBSCRIPTIONS}?email=${encodeURIComponent(FIXTURES.EMAIL)}`
    );

    expect(response.status).toBe(STATUS_CODE.OK);
    await expect(response.json()).resolves.toEqual(subscriptions);
    expect(
      subscriptionsServiceMock.getSubscriptionsByEmail
    ).toHaveBeenCalledWith(FIXTURES.EMAIL);
  });
});
