FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare yarn@1.22.21 --activate

ARG SUPABASE_URL
ARG SUPABASE_KEY
ARG NUXT_UI_PRO_LICENSE
ENV SUPABASE_URL=$SUPABASE_URL \
    SUPABASE_KEY=$SUPABASE_KEY \
    NITRO_PRESET=node-server

COPY package.json yarn.lock ./
# postinstall runs `nuxt prepare`, which needs nuxt.config.ts; defer it to the build step.
RUN yarn install --frozen-lockfile --ignore-scripts

COPY . .
RUN yarn build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NITRO_PORT=3000 \
    NITRO_HOST=0.0.0.0

COPY --from=builder /app/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
