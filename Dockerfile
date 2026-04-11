FROM node:24-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
COPY prisma.config.ts ./prisma.config.ts
COPY prisma ./prisma
COPY public ./public

RUN pnpm install --frozen-lockfile

COPY src ./src
COPY tsconfig.json ./tsconfig.json
COPY jest.config.cjs ./jest.config.cjs

EXPOSE 3000

CMD ["pnpm", "run", "start"]
