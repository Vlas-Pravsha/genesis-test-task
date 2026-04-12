import { mock, mockReset } from "jest-mock-extended";

import type { AppError } from "../../src/core/errors/app-error.ts";
import type { GithubCache } from "../../src/modules/github/github.cache.ts";
import { GithubClient } from "../../src/modules/github/github.client.ts";
import { GithubService } from "../../src/modules/github/github.service.ts";
import { ERROR_CODES } from "../../src/shared/constants/error-code.ts";
import { STATUS_CODE } from "../../src/shared/constants/status-code.ts";

const TOKEN = "secret-token";
const REPO = "golang/go";
const MISSING_REPO = "golang/missing";
const REPO_API_PATH = `/repos/${REPO}`;
const REPO_API_URL = `https://api.github.com${REPO_API_PATH}`;
const RELEASE_API_URL = `${REPO_API_URL}/releases/latest`;
const TAG = "v1.0.0";

const repoPayload = (fullName = REPO) => ({ full_name: fullName });

const releasePayload = () => ({
  html_url: `https://github.com/${REPO}/releases/tag/${TAG}`,
  id: 1,
  name: "Version 1.0.0",
  published_at: "2026-04-08T00:00:00.000Z",
  tag_name: TAG,
});

const makeResponse = (
  status: number,
  body?: unknown,
  headers?: Record<string, string>
): Response =>
  ({
    headers: new Headers(headers),
    json: () => Promise.resolve(body),
    ok: status >= STATUS_CODE.OK && status < 300,
    status,
  }) as Response;

let fetchQueue: (Response | Error)[];
let capturedUrls: string[];
let capturedOptions: RequestInit | undefined;
let githubCache: GithubCache;

beforeEach(() => {
  fetchQueue = [];
  capturedUrls = [];
  capturedOptions = undefined;
  githubCache = {
    get: () => Promise.resolve(),
    set: () => Promise.resolve(),
  };

  global.fetch = ((input, init) => {
    capturedUrls.push(String(input));
    capturedOptions = init;

    const next = fetchQueue.shift();

    if (next instanceof Error) {
      return Promise.reject(next);
    }
    if (!next) {
      throw new Error(`No mocked response for: ${String(input)}`);
    }

    return Promise.resolve(next);
  }) as typeof fetch;
});

const enqueue = (...responses: (Response | Error)[]) => {
  fetchQueue.push(...responses);
};

const createGithubClient = (token?: string) =>
  new GithubClient(token, githubCache);

describe("GithubClient", () => {
  describe("getRepo", () => {
    it("fetches repository and sends auth headers", async () => {
      enqueue(makeResponse(STATUS_CODE.OK, repoPayload()));

      const result = await createGithubClient(TOKEN).getRepo(REPO);

      expect(result).toEqual(repoPayload());
      expect(capturedUrls[0]).toBe(REPO_API_URL);
      expect(capturedOptions).toEqual({
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${TOKEN}`,
          "User-Agent": "release-tracker",
          "X-GitHub-Api-Version": "2026-03-10",
        },
      });
    });

    it("returns null when repository is not found", async () => {
      enqueue(makeResponse(STATUS_CODE.NOT_FOUND));

      await expect(
        createGithubClient().getRepo(MISSING_REPO)
      ).resolves.toBeNull();
    });

    it("throws RATE_LIMITED on 429", async () => {
      enqueue(makeResponse(STATUS_CODE.TOO_MANY_REQUESTS));

      await expect(createGithubClient().getRepo(REPO)).rejects.toMatchObject({
        code: ERROR_CODES.RATE_LIMITED,
        message: "GitHub API rate limit exceeded",
        name: "AppError",
        statusCode: STATUS_CODE.TOO_MANY_REQUESTS,
      } satisfies Partial<AppError>);
    });

    it("includes rate limit details from response headers", async () => {
      enqueue(
        makeResponse(STATUS_CODE.TOO_MANY_REQUESTS, undefined, {
          "retry-after": "60",
          "x-ratelimit-reset": "1712700000",
        })
      );

      await expect(createGithubClient().getRepo(REPO)).rejects.toMatchObject({
        code: ERROR_CODES.RATE_LIMITED,
        details: {
          path: REPO_API_PATH,
          resetAt: "1712700000",
          retryAfter: "60",
        },
        statusCode: STATUS_CODE.TOO_MANY_REQUESTS,
      } satisfies Partial<AppError>);
    });

    it("treats 403 with exhausted rate limit header as RATE_LIMITED", async () => {
      enqueue(makeResponse(403, undefined, { "x-ratelimit-remaining": "0" }));

      await expect(createGithubClient().getRepo(REPO)).rejects.toMatchObject({
        code: ERROR_CODES.RATE_LIMITED,
        message: "GitHub API rate limit exceeded",
        statusCode: STATUS_CODE.TOO_MANY_REQUESTS,
      } satisfies Partial<AppError>);
    });

    it("throws SERVICE_UNAVAILABLE on 5xx", async () => {
      enqueue(makeResponse(500));

      await expect(createGithubClient().getRepo(REPO)).rejects.toMatchObject({
        code: ERROR_CODES.SERVICE_UNAVAILABLE,
        details: { path: REPO_API_PATH, providerStatusCode: 500 },
        message: "GitHub API request failed",
        statusCode: STATUS_CODE.SERVICE_UNAVAILABLE,
      } satisfies Partial<AppError>);
    });

    it("wraps network errors as SERVICE_UNAVAILABLE", async () => {
      enqueue(new Error("connect ECONNRESET"));

      await expect(createGithubClient().getRepo(REPO)).rejects.toMatchObject({
        code: ERROR_CODES.SERVICE_UNAVAILABLE,
        details: { path: REPO_API_PATH },
        message: "GitHub API is unavailable",
        statusCode: STATUS_CODE.SERVICE_UNAVAILABLE,
      } satisfies Partial<AppError>);
    });
  });

  describe("getLatestRelease", () => {
    it("returns parsed release payload", async () => {
      enqueue(makeResponse(STATUS_CODE.OK, releasePayload()));

      await expect(
        createGithubClient().getLatestRelease(REPO)
      ).resolves.toEqual(releasePayload());
    });

    it("returns null when repository has no release yet", async () => {
      enqueue(
        makeResponse(STATUS_CODE.NOT_FOUND),
        makeResponse(STATUS_CODE.OK, repoPayload())
      );

      await expect(
        createGithubClient().getLatestRelease(REPO)
      ).resolves.toBeNull();
      expect(capturedUrls).toEqual([RELEASE_API_URL, REPO_API_URL]);
    });

    it("throws NOT_FOUND when repository is missing", async () => {
      enqueue(
        makeResponse(STATUS_CODE.NOT_FOUND),
        makeResponse(STATUS_CODE.NOT_FOUND)
      );

      await expect(
        createGithubClient().getLatestRelease(MISSING_REPO)
      ).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
        details: { fullName: MISSING_REPO },
        message: "GitHub repository not found",
        statusCode: STATUS_CODE.NOT_FOUND,
      } satisfies Partial<AppError>);
    });

    it("throws SERVICE_UNAVAILABLE when release payload is invalid", async () => {
      enqueue(makeResponse(STATUS_CODE.OK, { tag_name: TAG }));

      await expect(
        createGithubClient().getLatestRelease(REPO)
      ).rejects.toMatchObject({
        code: ERROR_CODES.SERVICE_UNAVAILABLE,
        message: "GitHub API returned invalid data",
        name: "AppError",
        statusCode: STATUS_CODE.SERVICE_UNAVAILABLE,
      } satisfies Partial<AppError>);
    });
  });
});

let githubClient: ReturnType<typeof mock<GithubClient>>;

describe("GithubService", () => {
  beforeEach(() => {
    githubClient = mock<GithubClient>();
    mockReset(githubClient);
  });

  describe("checkRepositoryExists", () => {
    it("returns true when repository exists", async () => {
      githubClient.getRepo.mockResolvedValue({ id: 1 } as never);

      await expect(
        new GithubService(githubClient).checkRepositoryExists(REPO)
      ).resolves.toBe(true);
      expect(githubClient.getRepo).toHaveBeenCalledWith(REPO);
    });

    it("returns false when repository does not exist", async () => {
      githubClient.getRepo.mockResolvedValue(null);

      await expect(
        new GithubService(githubClient).checkRepositoryExists(MISSING_REPO)
      ).resolves.toBe(false);
    });
  });

  describe("getLatestRelease", () => {
    it("maps snake_case fields to camelCase", async () => {
      githubClient.getLatestRelease.mockResolvedValue(releasePayload());

      const result = await new GithubService(githubClient).getLatestRelease(
        REPO
      );

      expect(result).toEqual({
        htmlUrl: releasePayload().html_url,
        name: releasePayload().name,
        publishedAt: releasePayload().published_at,
        tagName: TAG,
      });
      expect(githubClient.getLatestRelease).toHaveBeenCalledWith(REPO);
    });

    it("returns null when release does not exist", async () => {
      githubClient.getLatestRelease.mockResolvedValue(null);

      await expect(
        new GithubService(githubClient).getLatestRelease(REPO)
      ).resolves.toBeNull();
    });
  });
});
