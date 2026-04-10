import { logger } from "../../core/logger/logger.ts";
import { githubCache } from "../github/github.cache.ts";
import { GithubClient } from "../github/github.client.ts";
import { GithubService } from "../github/github.service.ts";
import { notifierService } from "../notifier/notifier.service.ts";
import { ScannerRepository } from "./scanner.repository.ts";

export class ScannerService {
  private readonly githubService: GithubService;
  private readonly scannerRepository: ScannerRepository;
  private readonly notifier: typeof notifierService;

  constructor(
    scannerRepository: ScannerRepository,
    githubService: GithubService,
    notifier: typeof notifierService = notifierService
  ) {
    this.scannerRepository = scannerRepository;
    this.githubService = githubService;
    this.notifier = notifier;
  }

  async scanActiveRepositories() {
    const repositories = await this.scannerRepository.findRepositoriesToScan();

    logger.info(
      { repositoriesToScan: repositories.length },
      "scanner started active repositories scan"
    );

    let notificationsSent = 0;
    let repositoriesWithNewRelease = 0;

    for (const repository of repositories) {
      const result = await this.scanRepository(repository);

      notificationsSent += result.notificationsSent;

      if (result.hasNewRelease) {
        repositoriesWithNewRelease += 1;
      }
    }

    const summary = {
      notificationsSent,
      repositoriesScanned: repositories.length,
      repositoriesWithNewRelease,
    };

    logger.info(summary, "scanner finished active repositories scan");

    return summary;
  }

  private async scanRepository(
    repository: Awaited<
      ReturnType<ScannerRepository["findRepositoriesToScan"]>
    >[number]
  ) {
    try {
      const latestRelease = await this.githubService.getLatestRelease(
        repository.fullName
      );
      const latestTag = latestRelease?.tagName ?? null;
      const hasNewRelease =
        latestTag !== null && latestTag !== repository.lastSeenTag;

      if (!hasNewRelease) {
        await this.scannerRepository.updateRepositoryState(
          repository.id,
          repository.lastSeenTag
        );

        logger.info(
          {
            fullName: repository.fullName,
            lastSeenTag: repository.lastSeenTag,
          },
          "scanner checked repository without new release"
        );

        return {
          hasNewRelease: false,
          notificationsSent: 0,
        };
      }

      let notificationsSent = 0;

      for (const subscriber of repository.subscriptions) {
        if (!subscriber.unsubscribeToken) {
          continue;
        }

        await this.notifier.sendReleaseNotification(
          subscriber.email,
          repository.fullName,
          latestTag,
          subscriber.unsubscribeToken
        );

        notificationsSent += 1;
      }

      await this.scannerRepository.updateRepositoryState(
        repository.id,
        latestTag
      );

      logger.info(
        {
          fullName: repository.fullName,
          latestTag,
          previousTag: repository.lastSeenTag,
          subscribersNotified: notificationsSent,
        },
        "scanner notified subscribers about new release"
      );

      return {
        hasNewRelease: true,
        notificationsSent,
      };
    } catch (error) {
      logger.error(
        {
          err: error,
          fullName: repository.fullName,
        },
        "scanner failed to process repository"
      );

      return {
        hasNewRelease: false,
        notificationsSent: 0,
      };
    }
  }
}

const scannerRepository = new ScannerRepository();
const githubService = new GithubService(
  new GithubClient(undefined, githubCache)
);

export const scannerService = new ScannerService(
  scannerRepository,
  githubService
);
