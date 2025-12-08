FROM node:20-alpine AS base

# Use npm mirror for reliability
RUN npm config set registry https://registry.npmmirror.com

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app

# Accept build args for Next.js public env vars
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_AI_ENGINE_URL
ARG NEXT_PUBLIC_CROP_RESIDUE_URL

# Set them as env vars for the build process
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_AI_ENGINE_URL=$NEXT_PUBLIC_AI_ENGINE_URL
ENV NEXT_PUBLIC_CROP_RESIDUE_URL=$NEXT_PUBLIC_CROP_RESIDUE_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
