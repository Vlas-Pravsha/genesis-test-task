import { getPrisma } from "../../core/db/prisma.ts";
import { SubscriptionStatus } from "../subscriptions/subscriptions.types.ts";

export class ScannerRepository {
  private readonly prisma = getPrisma();

  findRepositoriesToScan() {
    return this.prisma.repository.findMany({
      include: {
        subscriptions: {
          select: {
            email: true,
            id: true,
            unsubscribeToken: true,
          },
          where: {
            status: SubscriptionStatus.ACTIVE,
          },
        },
      },
      where: {
        subscriptions: {
          some: {
            status: SubscriptionStatus.ACTIVE,
          },
        },
      },
    });
  }

  updateRepositoryState(id: string, lastSeenTag: string | null) {
    return this.prisma.repository.update({
      data: {
        lastCheckedAt: new Date(),
        lastSeenTag,
      },
      where: { id },
    });
  }
}
