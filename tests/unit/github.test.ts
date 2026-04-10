import type { AppError } from "../../src/core/errors/app-error.ts";
import { ERROR_CODES } from "../../src/core/errors/error-codes.ts";
import { GithubClient } from "../../src/modules/github/github.client.ts";
import { GithubService } from "../../src/modules/github/github.service.ts";
import { STATUS_CODE } from "../../src/shared/utils/status-code.ts";

const createResponse = (
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

class GithubClientStub extends GithubClient {
  repository: unknown = null;
  release: Awaited<ReturnType<GithubClient["getLatestRelease"]>> = null;
  requestedRepository: string | null = null;
  requestedRelease: string | null = null;

  override getRepo(fullName: string) {
    this.requestedRepository = fullName;
    return Promise.resolve(this.repository);
  }

  override getLatestRelease(fullName: string) {
    this.requestedRelease = fullName;
    return Promise.resolve(this.release);
  }
}

describe("GithubClient", () => {
  let response: Response;
  let requestUrl: string;
  let requestOptions: RequestInit | undefined;

  beforeEach(() => {
    requestUrl = "";
    requestOptions = undefined;

    global.fetch = ((input, init) => {
      requestUrl = String(input);
      requestOptions = init;
      return Promise.resolve(response);
    }) as typeof fetch;
  });

  it("gets repository and sends token in headers", async () => {
    response = createResponse(STATUS_CODE.OK, {
      full_name: "octocat/hello-world",
    });

    const client = new GithubClient("secret-token");
    const repository = await client.getRepo("octocat/hello-world");

    expect(repository).toEqual({ full_name: "octocat/hello-world" });
    expect(requestUrl).toBe("https://api.github.com/repos/octocat/hello-world");
    expect(requestOptions).toEqual({
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer secret-token",
        "User-Agent": "release-tracker",
        "X-GitHub-Api-Version": "2026-03-10",
      },
    });
  });

  it("returns null when repository is not found", async () => {
    response = createResponse(STATUS_CODE.NOT_FOUND);

    const client = new GithubClient();

    await expect(client.getRepo("octocat/missing")).resolves.toBeNull();
  });

  it("throws AppError when rate limit is exceeded", async () => {
    response = createResponse(STATUS_CODE.TOO_MANY_REQUESTS);

    const client = new GithubClient();

    await expect(client.getRepo("octocat/hello-world")).rejects.toMatchObject({
      code: ERROR_CODES.RATE_LIMITED,
      message: "GitHub API rate limit exceeded",
      name: "AppError",
      statusCode: STATUS_CODE.TOO_MANY_REQUESTS,
    } satisfies Partial<AppError>);
  });

  it("treats GitHub forbidden responses as rate limits when headers say so", async () => {
    response = createResponse(403, undefined, {
      "x-ratelimit-remaining": "0",
    });

    const client = new GithubClient();

    await expect(client.getRepo("octocat/hello-world")).rejects.toMatchObject({
      code: ERROR_CODES.RATE_LIMITED,
      message: "GitHub API rate limit exceeded",
      statusCode: STATUS_CODE.TOO_MANY_REQUESTS,
    } satisfies Partial<AppError>);
  });

  it("throws AppError when GitHub request fails", async () => {
    response = createResponse(500);

    const client = new GithubClient();

    await expect(client.getRepo("octocat/hello-world")).rejects.toMatchObject({
      code: ERROR_CODES.SERVICE_UNAVAILABLE,
      message: "GitHub API request failed",
      statusCode: STATUS_CODE.SERVICE_UNAVAILABLE,
    } satisfies Partial<AppError>);
  });

  it("returns latest release when payload is valid", async () => {
    response = createResponse(STATUS_CODE.OK, {
      html_url: "https://github.com/octocat/hello-world/releases/tag/v1.0.0",
      id: 1,
      name: "Version 1.0.0",
      published_at: "2026-04-08T00:00:00.000Z",
      tag_name: "v1.0.0",
    });

    const client = new GithubClient();

    await expect(
      client.getLatestRelease("octocat/hello-world")
    ).resolves.toEqual({
      html_url: "https://github.com/octocat/hello-world/releases/tag/v1.0.0",
      id: 1,
      name: "Version 1.0.0",
      published_at: "2026-04-08T00:00:00.000Z",
      tag_name: "v1.0.0",
    });
  });

  it("throws AppError when release payload is invalid", async () => {
    response = createResponse(STATUS_CODE.OK, { tag_name: "v1.0.0" });

    const client = new GithubClient();

    await expect(
      client.getLatestRelease("octocat/hello-world")
    ).rejects.toMatchObject({
      code: ERROR_CODES.SERVICE_UNAVAILABLE,
      message: "GitHub API returned invalid data",
      name: "AppError",
      statusCode: STATUS_CODE.SERVICE_UNAVAILABLE,
    } satisfies Partial<AppError>);
  });
});

describe("GithubService", () => {
  it("returns true when repository exists", async () => {
    const client = new GithubClientStub();
    client.repository = { id: 1 };

    const service = new GithubService(client);
    const exists = await service.checkRepositoryExists("octocat/hello-world");

    expect(exists).toBe(true);
    expect(client.requestedRepository).toBe("octocat/hello-world");
  });

  it("returns false when repository does not exist", async () => {
    const client = new GithubClientStub();
    client.repository = null;

    const service = new GithubService(client);

    await expect(
      service.checkRepositoryExists("octocat/missing")
    ).resolves.toBe(false);
  });

  it("maps release fields to simpler names", async () => {
    const client = new GithubClientStub();
    client.release = {
      html_url: "https://github.com/octocat/hello-world/releases/tag/v1.0.0",
      id: 1,
      name: "Version 1.0.0",
      published_at: "2026-04-08T00:00:00.000Z",
      tag_name: "v1.0.0",
    };

    const service = new GithubService(client);
    const release = await service.getLatestRelease("octocat/hello-world");

    expect(release).toEqual({
      htmlUrl: "https://github.com/octocat/hello-world/releases/tag/v1.0.0",
      name: "Version 1.0.0",
      publishedAt: "2026-04-08T00:00:00.000Z",
      tagName: "v1.0.0",
    });
    expect(client.requestedRelease).toBe("octocat/hello-world");
  });

  it("returns null when release does not exist", async () => {
    const client = new GithubClientStub();
    client.release = null;

    const service = new GithubService(client);

    await expect(
      service.getLatestRelease("octocat/hello-world")
    ).resolves.toBeNull();
  });
});
