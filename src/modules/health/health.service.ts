import { AppError } from "../../core/errors/app-error.ts";
import { checkDatabaseConnection } from "./health.repository.ts";

export const getHealthStatus = () => ({
  status: "ok" as const,
  timestamp: new Date().toISOString(),
});

export const getDatabaseHealthStatus = async () => {
  try {
    await checkDatabaseConnection();

    return { status: "ok" as const };
  } catch (error) {
    throw AppError.serviceUnavailable("Database health check failed", {
      cause: error,
      details: {
        message:
          error instanceof Error ? error.message : "Unknown database error",
      },
    });
  }
};
