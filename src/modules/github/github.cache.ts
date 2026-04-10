import crypto from "node:crypto";

import { Redis } from "@upstash/redis";

import { env } from "../../config/env.ts";
import { logger } from "../../core/logger/logger.ts";

const CACHE_KEY_PREFIX = "github:response:v1";

export const GITHUB_CACHE_TTL_SECONDS = 60 * 10;

export interface GithubCache {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
}

const noopGithubCache: GithubCache = {
  get(_key: string): Promise<unknown> {
    return Promise.resolve();
  },
  set(_key: string, _value: unknown, _ttlSeconds: number) {
    return Promise.resolve();
  },
};

const createUpstashGithubCache = (redis: Redis): GithubCache => ({
  async get(key: string): Promise<unknown> {
    try {
      return (await redis.get(key)) ?? undefined;
    } catch (error) {
      logger.warn({ err: error, key }, "github cache read failed");
      return undefined;
    }
  },

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await redis.set(key, value, { ex: ttlSeconds });
    } catch (error) {
      logger.warn({ err: error, key, ttlSeconds }, "github cache write failed");
    }
  },
});

export const buildGithubCacheKey = (path: string, token?: string): string => {
  const scope = token
    ? crypto.createHash("sha256").update(token).digest("hex").slice(0, 12)
    : "anonymous";

  return `${CACHE_KEY_PREFIX}:${scope}:${path}`;
};

export const githubCache: GithubCache =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? createUpstashGithubCache(
        new Redis({
          url: env.UPSTASH_REDIS_REST_URL,
          token: env.UPSTASH_REDIS_REST_TOKEN,
        })
      )
    : noopGithubCache;
