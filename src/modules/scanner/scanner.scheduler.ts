import cron from "node-cron";

import { env } from "../../config/env.ts";
import { logger } from "../../core/logger/logger.ts";
import { scannerService } from "./scanner.service.ts";

let isStarted = false;
let isRunning = false;

const runScanner = async (trigger: "startup" | "schedule") => {
  if (isRunning) {
    logger.warn(
      { trigger },
      "scanner run skipped because previous run is still active"
    );
    return;
  }

  isRunning = true;

  try {
    await scannerService.scanActiveRepositories();
  } catch (error) {
    logger.error({ err: error, trigger }, "scanner run failed");
  } finally {
    isRunning = false;
  }
};

export const registerScannerScheduler = () => {
  if (isStarted || env.NODE_ENV === "test" || !env.CRON_ENABLED) {
    return;
  }

  isStarted = true;

  logger.info(
    {
      schedule: env.CRON_SCHEDULE,
    },
    "scanner scheduler registered"
  );

  cron.schedule(env.CRON_SCHEDULE, () => {
    void runScanner("schedule");
  });

  void runScanner("startup");
};
