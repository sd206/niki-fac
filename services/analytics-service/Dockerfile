FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json .npmrc ./
COPY packages ./packages
COPY services ./services
COPY apps ./apps
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @niki/analytics-service... build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app/services/analytics-service
EXPOSE 8091
CMD ["node", "dist/index.js"]
