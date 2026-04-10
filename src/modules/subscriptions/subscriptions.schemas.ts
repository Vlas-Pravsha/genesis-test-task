import { z } from "zod";

const repositoryFullNameRegex = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export const subscribeSchema = z.object({
  email: z.email().trim(),
  repo: z.string().trim().regex(repositoryFullNameRegex),
});

export const emailQuerySchema = z.object({
  email: z.email().trim(),
});

export const tokenParamSchema = z.object({
  token: z.string().trim().min(1),
});
