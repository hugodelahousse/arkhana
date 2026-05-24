FROM node:20-alpine AS development-dependencies-env
RUN corepack enable
COPY ./package.json pnpm-lock.yaml /app/
WORKDIR /app
RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS production-dependencies-env
RUN corepack enable
COPY ./package.json pnpm-lock.yaml /app/
WORKDIR /app
RUN pnpm install --frozen-lockfile --prod

FROM node:20-alpine AS build-env
RUN corepack enable
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN pnpm run build

FROM node:20-alpine
RUN corepack enable
COPY ./package.json pnpm-lock.yaml /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
COPY ./public/fonts /app/public/fonts
COPY ./server.js /app/server.js
COPY ./db /app/db
COPY ./config /app/config
WORKDIR /app
EXPOSE 3000
CMD ["sh", "-c", "pnpm db:push && node server.js"]
