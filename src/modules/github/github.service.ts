import type { GithubClient } from "./github.client.ts";

export class GithubService {
  private readonly githubClient: GithubClient;

  constructor(githubClient: GithubClient) {
    this.githubClient = githubClient;
  }

  async checkRepositoryExists(fullName: string) {
    const repo = await this.githubClient.getRepo(fullName);

    console.log("[github.service] checkRepositoryExists", {
      exists: Boolean(repo),
      fullName,
      repo,
    });

    return Boolean(repo);
  }

  async getLatestRelease(fullName: string) {
    const release = await this.githubClient.getLatestRelease(fullName);

    console.log("[github.service] getLatestRelease raw", {
      fullName,
      release,
    });

    if (!release) {
      return null;
    }

    const mappedRelease = {
      htmlUrl: release.html_url,
      name: release.name,
      publishedAt: release.published_at,
      tagName: release.tag_name,
    };

    console.log("[github.service] getLatestRelease mapped", {
      fullName,
      mappedRelease,
    });

    return mappedRelease;
  }
}
