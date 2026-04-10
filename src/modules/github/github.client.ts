import { z } from "zod";

import { AppError } from "../../core/errors/app-error.ts";
import { STATUS_CODE } from "../../shared/utils/status-code.ts";

const releaseSchema = z.object({
  id: z.number(),
  tag_name: z.string(),
  html_url: z.string().nullable(),
  name: z.string().nullable(),
  published_at: z.string().nullable(),
});

type Release = z.infer<typeof releaseSchema>;

interface RequestOptions {
  notFoundBehavior?: "return-null" | "throw";
  resource?: "release" | "repository";
}

export class GithubClient {
  private readonly token?: string;

  constructor(token?: string) {
    this.token = token;
  }

  private headers() {
    return {
      Accept: "application/vnd.github+json",
      "User-Agent": "release-tracker",
      "X-GitHub-Api-Version": "2026-03-10",
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
    };
  }

  private static isRateLimitedResponse(response: Response) {
    return (
      response.status === STATUS_CODE.TOO_MANY_REQUESTS ||
      (response.status === 403 &&
        response.headers.get("x-ratelimit-remaining") === "0")
    );
  }

  private static getRateLimitDetails(response: Response, path: string) {
    const retryAfter = response.headers.get("retry-after");
    const resetAt = response.headers.get("x-ratelimit-reset");

    return {
      path,
      ...(retryAfter ? { retryAfter } : {}),
      ...(resetAt ? { resetAt } : {}),
    };
  }

  private async request(path: string, options: RequestOptions = {}) {
    let res: Response;

    try {
      res = await fetch(`https://api.github.com${path}`, {
        headers: this.headers(),
      });
    } catch (error) {
      throw AppError.serviceUnavailable("GitHub API is unavailable", {
        cause: error,
        details: { path },
      });
    }

    if (res.status === STATUS_CODE.NOT_FOUND) {
      console.log("[github.client] GitHub response", {
        path,
        payload: null,
        status: res.status,
      });

      if (options.notFoundBehavior === "return-null") {
        return null;
      }

      throw AppError.notFound("GitHub repository not found", {
        details: {
          path,
          resource: options.resource ?? "repository",
        },
      });
    }
    if (GithubClient.isRateLimitedResponse(res)) {
      throw AppError.rateLimited("GitHub API rate limit exceeded", {
        details: GithubClient.getRateLimitDetails(res, path),
        cause: { providerStatusCode: res.status },
      });
    }
    if (!res.ok) {
      throw AppError.serviceUnavailable("GitHub API request failed", {
        details: {
          path,
          providerStatusCode: res.status,
        },
      });
    }

    const data = await res.json();

    console.log("[github.client] GitHub response", {
      path,
      payload: data,
      status: res.status,
    });

    return data;
  }

  getRepo(fullName: string) {
    return this.request(`/repos/${fullName}`, {
      notFoundBehavior: "return-null",
      resource: "repository",
    });
  }

  async getLatestRelease(fullName: string): Promise<Release | null> {
    const data = await this.request(`/repos/${fullName}/releases/latest`, {
      notFoundBehavior: "return-null",
      resource: "release",
    });

    if (!data) {
      const repository = await this.getRepo(fullName);

      if (!repository) {
        throw AppError.notFound("GitHub repository not found", {
          details: { fullName },
        });
      }

      return null;
    }

    const result = releaseSchema.safeParse(data);
    if (!result.success) {
      throw AppError.serviceUnavailable("GitHub API returned invalid data", {
        details: {
          issues: result.error.issues.map((issue) => ({
            message: issue.message,
            path: issue.path.join("."),
          })),
        },
      });
    }

    return result.data;
  }
}
