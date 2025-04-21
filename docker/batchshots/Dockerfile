# Stage 1: Build the Next.js application
FROM node:23-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Set NEXT_TELEMETRY_DISABLED to avoid telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build the Next.js application
RUN npm run build

# Stage 2: Production image
FROM node:23-alpine AS runner

WORKDIR /app

# Set NODE_ENV to production
ENV NODE_ENV=production
# Disable telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from the builder stage
COPY --from=builder /app/public ./public
# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Change ownership of the app directory to the non-root user
USER nextjs

# Expose the port the app runs on
EXPOSE 3000

# Set the host and port environment variables
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Command to run the application
CMD ["node", "server.js"] 