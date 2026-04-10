import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "../../config/env.ts";
import { PrismaClient } from "../../generated/prisma/client.ts";

declare global {
  var prisma: PrismaClient | undefined;
}

const createPrismaClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  });

export const getPrisma = () => {
  if (!globalThis.prisma) {
    globalThis.prisma = createPrismaClient();
  }

  return globalThis.prisma;
};
