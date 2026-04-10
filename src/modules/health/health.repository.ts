import { getPrisma } from "../../core/db/prisma.ts";

export const checkDatabaseConnection = async () => {
  const prisma = getPrisma();

  await prisma.$queryRaw`SELECT 1`;
};
