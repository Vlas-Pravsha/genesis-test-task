import crypto from "node:crypto";

import { AppError } from "../../core/errors/app-error.ts";
import { GithubClient } from "../github/github.client.ts";
import { GithubService } from "../github/github.service.ts";
import { notifierService } from "../notifier/notifier.service.ts";
import { SubscriptionsRepository } from "./subscriptions.repository.ts";
import { SubscriptionStatus } from "./subscriptions.types.ts";
import type { SubscriptionResponse } from "./subscriptions.types.ts";

interface SubscribeInput {
  email: string;
  repo: string;
}

export class SubscriptionsService {
  private readonly notifier: typeof notifierService;
  private readonly subscriptionsRepository: SubscriptionsRepository;
  private readonly githubService: GithubService;

  constructor(
    subscriptionsRepository: SubscriptionsRepository,
    githubService: GithubService,
    notifier: typeof notifierService = notifierService
  ) {
    this.subscriptionsRepository = subscriptionsRepository;
    this.githubService = githubService;
    this.notifier = notifier;
  }

  async subscribe({ email, repo }: SubscribeInput) {
    const repositoryExists = await this.githubService.checkRepositoryExists(repo);

    console.log("[subscriptions.service] subscribe GitHub repository check", {
      email,
      repo,
      repositoryExists,
    });

    if (!repositoryExists) {
      throw AppError.notFound("Repository not found", {
        details: { repo },
      });
    }

    const repository = await this.findOrCreateRepository(repo);
    const existingSubscription =
      await this.subscriptionsRepository.findByEmailAndRepo(
        email,
        repository.id
      );

    if (
      existingSubscription &&
      existingSubscription.status !== SubscriptionStatus.UNSUBSCRIBED
    ) {
      throw AppError.conflict("Email is already subscribed to this repository", {
        details: { email, repo },
      });
    }

    const confirmToken = SubscriptionsService.generateToken();

    const subscriptionWritePayload = existingSubscription
      ? {
          confirmToken,
          id: existingSubscription.id,
          operation: "resubscribe" as const,
        }
      : {
          confirmToken,
          email,
          operation: "create" as const,
          repositoryId: repository.id,
        };

    console.log("[subscriptions.service] subscription write payload", {
      email,
      repo,
      subscriptionWritePayload,
    });

    const subscription = await (existingSubscription
      ? this.subscriptionsRepository.resubscribe(
          existingSubscription.id,
          confirmToken
        )
      : this.subscriptionsRepository.create({
          confirmToken,
          email,
          repositoryId: repository.id,
        }));

    console.log("[subscriptions.service] subscription write result", {
      email,
      repo,
      subscription,
    });

    await this.notifier.sendConfirmation(email, confirmToken);

    return {
      message: "Subscription created successfully.",
    };
  }

  async confirm(token: string) {
    const subscription =
      await this.subscriptionsRepository.findByConfirmToken(token);

    if (!subscription) {
      throw AppError.notFound("Confirmation token not found", {
        details: { token },
      });
    }

    if (subscription.status === SubscriptionStatus.ACTIVE) {
      throw AppError.badRequest("Subscription is already confirmed", {
        details: { token },
      });
    }

    if (subscription.status === SubscriptionStatus.UNSUBSCRIBED) {
      throw AppError.badRequest("Unsubscribed subscriptions must be created again", {
        details: { token },
      });
    }

    await this.subscriptionsRepository.confirm(
      subscription.id,
      SubscriptionsService.generateToken()
    );

    return {
      message: "Subscription confirmed successfully",
    };
  }

  async unsubscribe(token: string) {
    const subscription =
      await this.subscriptionsRepository.findByUnsubscribeToken(token);

    if (!subscription) {
      throw AppError.notFound("Unsubscribe token not found", {
        details: { token },
      });
    }

    if (subscription.status === SubscriptionStatus.UNSUBSCRIBED) {
      throw AppError.badRequest("Subscription is already unsubscribed", {
        details: { token },
      });
    }

    await this.subscriptionsRepository.unsubscribe(subscription.id);

    return {
      message: "Unsubscribed successfully",
    };
  }

  async getSubscriptionsByEmail(
    email: string
  ): Promise<SubscriptionResponse[]> {
    const subscriptions =
      await this.subscriptionsRepository.findActiveByEmail(email);

    return subscriptions.map((subscription) => ({
      confirmed: subscription.status === SubscriptionStatus.ACTIVE,
      email: subscription.email,
      last_seen_tag: subscription.repository.lastSeenTag ?? "",
      repo: subscription.repository.fullName,
    }));
  }

  // Helper methods

  private async findOrCreateRepository(fullName: string) {
    const existingRepository =
      await this.subscriptionsRepository.findRepositoryByFullName(fullName);

    if (existingRepository) {
      console.log("[subscriptions.service] repository already exists", {
        existingRepository,
        fullName,
      });

      return existingRepository;
    }

    const latestRelease = await this.githubService.getLatestRelease(fullName);

    console.log(
      "[subscriptions.service] latest release before repository write",
      {
        fullName,
        latestRelease,
      }
    );

    const repositoryWritePayload = {
      fullName,
      lastSeenTag: latestRelease?.tagName ?? null,
    };

    console.log("[subscriptions.service] repository write payload", {
      repositoryWritePayload,
    });

    const repository = await this.subscriptionsRepository.createRepository(
      repositoryWritePayload
    );

    console.log("[subscriptions.service] repository write result", {
      repository,
    });

    return repository;
  }

  private static generateToken() {
    return crypto.randomBytes(32).toString("hex");
  }
}

const subscriptionsRepository = new SubscriptionsRepository();
const githubService = new GithubService(new GithubClient());

export const subscriptionsService = new SubscriptionsService(
  subscriptionsRepository,
  githubService
);
