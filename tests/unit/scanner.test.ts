import { faker } from "@faker-js/faker";
import { jest } from "@jest/globals";
import { mock, mockReset } from "jest-mock-extended";

import type { GithubService } from "../../src/modules/github/github.service.ts";
import type { notifierService } from "../../src/modules/notifier/notifier.service.ts";
import type { ScannerRepository } from "../../src/modules/scanner/scanner.repository.ts";
import { ScannerService } from "../../src/modules/scanner/scanner.service.ts";

const EMAIL = faker.internet.email().toLowerCase();
const SECONDARY_EMAIL = faker.internet.email().toLowerCase();
const REPO = "octocat/hello-world";
const BROKEN_REPO = "octocat/broken";
const HEALTHY_REPO = "octocat/healthy";
const CURRENT_TAG = "v1.0.0";
const NEW_TAG = "v1.1.0";
const HEALTHY_TAG = "v2.0.0";

const subscription = (
  email = EMAIL,
  id = "sub-1",
  unsubscribeToken: string | null = "token-1"
) => ({ email, id, unsubscribeToken });

const repoToScan = (overrides = {}) => ({
  fullName: REPO,
  id: "repo-1",
  lastSeenTag: CURRENT_TAG,
  subscriptions: [subscription()],
  lastCheckedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const release = (tagName: string) => ({
  htmlUrl: "http://example.com",
  name: `Release ${tagName}`,
  publishedAt: new Date().toISOString(),
  tagName,
});

let repository: ReturnType<typeof mock<ScannerRepository>>;
let github: ReturnType<typeof mock<GithubService>>;
let notifier: ReturnType<typeof mock<typeof notifierService>>;
let service: ScannerService;

describe("ScannerService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    repository = mock<ScannerRepository>();
    github = mock<GithubService>();
    notifier = mock<typeof notifierService>();

    mockReset(repository);
    mockReset(github);
    mockReset(notifier);

    service = new ScannerService(repository, github, notifier);
  });

  it("sends notifications when a new release appears", async () => {
    repository.findRepositoriesToScan.mockResolvedValue([
      repoToScan({
        subscriptions: [
          subscription(EMAIL, "sub-1", "token-1"),
          subscription(SECONDARY_EMAIL, "sub-2", null),
        ],
      }),
    ]);
    github.getLatestRelease.mockResolvedValue(release(NEW_TAG));
    repository.updateRepositoryState.mockResolvedValue(repoToScan());

    await expect(service.scanActiveRepositories()).resolves.toEqual({
      notificationsSent: 1,
      repositoriesScanned: 1,
      repositoriesWithNewRelease: 1,
    });

    expect(notifier.sendReleaseNotification).toHaveBeenCalledWith(
      EMAIL,
      REPO,
      NEW_TAG,
      "token-1"
    );
    expect(repository.updateRepositoryState).toHaveBeenCalledWith(
      "repo-1",
      NEW_TAG
    );
  });

  it("only updates check state when there is no new release", async () => {
    repository.findRepositoriesToScan.mockResolvedValue([repoToScan()]);
    github.getLatestRelease.mockResolvedValue(release(CURRENT_TAG));
    repository.updateRepositoryState.mockResolvedValue(repoToScan());

    await expect(service.scanActiveRepositories()).resolves.toEqual({
      notificationsSent: 0,
      repositoriesScanned: 1,
      repositoriesWithNewRelease: 0,
    });

    expect(notifier.sendReleaseNotification).not.toHaveBeenCalled();
    expect(repository.updateRepositoryState).toHaveBeenCalledWith(
      "repo-1",
      CURRENT_TAG
    );
  });

  it("continues scanning when GitHub fails for one repository", async () => {
    repository.findRepositoriesToScan.mockResolvedValue([
      repoToScan({ fullName: BROKEN_REPO }),
      repoToScan({
        fullName: HEALTHY_REPO,
        id: "repo-2",
        subscriptions: [subscription(SECONDARY_EMAIL, "sub-2", "token-2")],
      }),
    ]);
    github.getLatestRelease
      .mockRejectedValueOnce(new Error("GitHub is down"))
      .mockResolvedValueOnce(release(HEALTHY_TAG));
    repository.updateRepositoryState.mockResolvedValue(repoToScan());

    await expect(service.scanActiveRepositories()).resolves.toEqual({
      notificationsSent: 1,
      repositoriesScanned: 2,
      repositoriesWithNewRelease: 1,
    });

    expect(notifier.sendReleaseNotification).toHaveBeenCalledTimes(1);
    expect(repository.updateRepositoryState).toHaveBeenCalledTimes(1);
    expect(repository.updateRepositoryState).toHaveBeenCalledWith(
      "repo-2",
      HEALTHY_TAG
    );
  });
});
