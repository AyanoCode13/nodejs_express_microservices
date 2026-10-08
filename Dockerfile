FROM oven/bun:1 AS base
WORKDIR /app

copy package.json bun.lock package-lock.json ./
RUN bun install
COPY . .

EXPOSE 8080
CMD ["bun", "start:dev"]