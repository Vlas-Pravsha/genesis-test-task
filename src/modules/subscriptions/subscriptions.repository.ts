import { getPrisma } from "../../core/db/prisma.ts";
import { SubscriptionStatus } from "./subscriptions.types.ts";

export class SubscriptionsRepository {
  private readonly prisma = getPrisma();

  findRepositoryByFullName(fullName: string) {
    return this.prisma.repository.findUnique({
      where: { fullName },
    });
  }

  findByConfirmToken(token: string) {
    return this.prisma.subscription.findUnique({
      where: { confirmToken: token },
      include: { repository: true },
    });
  }

  findByUnsubscribeToken(token: string) {
    return this.prisma.subscription.findUnique({
      where: { unsubscribeToken: token },
      include: { repository: true },
    });
  }

  findByEmailAndRepo(email: string, repositoryId: string) {
    return this.prisma.subscription.findFirst({
      where: { email, repositoryId },
    });
  }

  findActiveByEmail(email: string) {
    return this.prisma.subscription.findMany({
      where: { email, status: SubscriptionStatus.ACTIVE },
      include: { repository: true },
    });
  }

  create(data: { email: string; repositoryId: string; confirmToken: string }) {
    return this.prisma.subscription.create({
      data: {
        ...data,
        status: SubscriptionStatus.PENDING,
      },
    });
  }

  createRepository(data: { fullName: string; lastSeenTag: string | null }) {
    return this.prisma.repository.create({
      data,
    });
  }

  confirm(id: string, unsubscribeToken: string) {
    return this.prisma.subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        unsubscribeToken,
        confirmedAt: new Date(),
      },
    });
  }

  resubscribe(id: string, confirmToken: string) {
    return this.prisma.subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatus.PENDING,
        confirmToken,
        confirmedAt: null,
        unsubscribeToken: null,
        unsubscribedAt: null,
      },
    });
  }

  unsubscribe(id: string) {
    return this.prisma.subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatus.UNSUBSCRIBED,
        unsubscribedAt: new Date(),
      },
    });
  }
}
