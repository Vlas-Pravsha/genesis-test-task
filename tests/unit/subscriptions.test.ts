import { jest } from "@jest/globals";
import { faker } from "@faker-js/faker";
import { mock, mockReset } from "jest-mock-extended";

import { ERROR_CODES } from "../../src/core/errors/error-codes.ts";
import { SubscriptionsService } from "../../src/modules/subscriptions/subscriptions.service.ts";
import type { SubscriptionsRepository } from "../../src/modules/subscriptions/subscriptions.repository.ts";
import type { GithubService } from "../../src/modules/github/github.service.ts";
import { SubscriptionStatus } from "../../src/modules/subscriptions/subscriptions.types.ts";
import { STATUS_CODE } from "../../src/shared/utils/status-code.ts";
import type { notifierService } from "../../src/modules/notifier/notifier.service.ts";

const EMAIL = faker.internet.email().toLowerCase();
const REPO = "octocat/hello-world";
const REPO_2 = "nodejs/node";
const CURRENT_TAG = "v1.0.0";
const NEW_TAG = "v1.2.3";
const CONFIRM_TOKEN = "confirm-token";
const UNSUBSCRIBE_TOKEN = "unsubscribe-token";

const repoRecord = (overrides = {}) => ({
  fullName: REPO,
  id: "repo-1",
  lastSeenTag: CURRENT_TAG,
  lastCheckedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const subscriptionRecord = (overrides = {}) => ({
  email: EMAIL,
  id: "sub-1",
  status: SubscriptionStatus.PENDING,
  unsubscribeToken: "token-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  confirmToken: "token-2",
  repositoryId: "repo-1",
  repository: repoRecord(),
  confirmedAt: null,
  unsubscribedAt: null,
  ...overrides,
});

const release = (tagName: string) => ({
  htmlUrl: "http://example.com",
  name: `Release ${tagName}`,
  publishedAt: new Date().toISOString(),
  tagName,
});

let repository: ReturnType<typeof mock<SubscriptionsRepository>>;
let github: ReturnType<typeof mock<GithubService>>;
let notifier: ReturnType<typeof mock<typeof notifierService>>;
let service: SubscriptionsService;

describe("SubscriptionsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    repository = mock<SubscriptionsRepository>();
    github = mock<GithubService>();
    notifier = mock<typeof notifierService>();

    mockReset(repository);
    mockReset(github);
    mockReset(notifier);

    service = new SubscriptionsService(repository, github, notifier);
  });

  it("creates a subscription and sends confirmation email", async () => {
    github.checkRepositoryExists.mockResolvedValue(true);
    repository.findRepositoryByFullName.mockResolvedValue(null);
    github.getLatestRelease.mockResolvedValue(release(NEW_TAG));
    repository.createRepository.mockResolvedValue(repoRecord({ lastSeenTag: NEW_TAG }));
    repository.findByEmailAndRepo.mockResolvedValue(null);
    repository.create.mockResolvedValue(subscriptionRecord());
    notifier.sendConfirmation.mockResolvedValue();

    await expect(service.subscribe({ email: EMAIL, repo: REPO })).resolves.toEqual({
      message: "Subscription created successfully.",
    });

    expect(github.checkRepositoryExists).toHaveBeenCalledWith(REPO);
    expect(github.getLatestRelease).toHaveBeenCalledWith(REPO);
    expect(repository.createRepository).toHaveBeenCalledWith({
      fullName: REPO,
      lastSeenTag: NEW_TAG,
    });
    expect(repository.create).toHaveBeenCalledWith({
      confirmToken: expect.any(String),
      email: EMAIL,
      repositoryId: "repo-1",
    });
    expect(notifier.sendConfirmation).toHaveBeenCalledWith(EMAIL, expect.any(String));
  });

  it("rejects duplicate active subscription", async () => {
    github.checkRepositoryExists.mockResolvedValue(true);
    repository.findRepositoryByFullName.mockResolvedValue(repoRecord());
    repository.findByEmailAndRepo.mockResolvedValue(
      subscriptionRecord({ status: SubscriptionStatus.ACTIVE })
    );

    await expect(service.subscribe({ email: EMAIL, repo: REPO })).rejects.toMatchObject({
      code: ERROR_CODES.CONFLICT,
      message: "Email is already subscribed to this repository",
      statusCode: STATUS_CODE.CONFLICT,
    });

    expect(repository.create).not.toHaveBeenCalled();
  });

  it("confirms a pending subscription", async () => {
    repository.findByConfirmToken.mockResolvedValue(subscriptionRecord());
    repository.confirm.mockResolvedValue(subscriptionRecord());

    await expect(service.confirm(CONFIRM_TOKEN)).resolves.toEqual({
      message: "Subscription confirmed successfully",
    });

    expect(repository.confirm).toHaveBeenCalledWith("sub-1", expect.any(String));
  });

  it("unsubscribes an active subscription", async () => {
    repository.findByUnsubscribeToken.mockResolvedValue(
      subscriptionRecord({ status: SubscriptionStatus.ACTIVE })
    );
    repository.unsubscribe.mockResolvedValue(subscriptionRecord());

    await expect(service.unsubscribe(UNSUBSCRIBE_TOKEN)).resolves.toEqual({
      message: "Unsubscribed successfully",
    });

    expect(repository.unsubscribe).toHaveBeenCalledWith("sub-1");
  });

  it("maps active subscriptions for public response", async () => {
    repository.findActiveByEmail.mockResolvedValue([
      subscriptionRecord({
        repository: repoRecord({ fullName: REPO, lastSeenTag: "v2.0.0" }),
      }),
      subscriptionRecord({
        repository: repoRecord({ fullName: REPO_2, lastSeenTag: null }),
      }),
    ]);

    await expect(service.getSubscriptionsByEmail(EMAIL)).resolves.toEqual([
      { confirmed: false, email: EMAIL, last_seen_tag: "v2.0.0", repo: REPO },
      { confirmed: false, email: EMAIL, last_seen_tag: "", repo: REPO_2 },
    ]);
  });
});
