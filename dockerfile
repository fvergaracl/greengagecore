# Use the official Node.js 18 image with Alpine
FROM node:18-alpine AS base

# Install necessary dependencies
RUN apk add --no-cache openssl musl-dev libc6-compat

WORKDIR /usr/src/app

COPY package*.json ./

# Install dependencies
RUN npm install

COPY . .

# Generate Prisma Client with the correct binary target
RUN npx prisma generate --schema=./prisma/schema.prisma

# ----------------------------------
# Development target
# ----------------------------------
FROM base AS dev

# Install additional development dependencies if needed
RUN npm install --only=development

# Expose the port the app runs on
EXPOSE 3000

# Run the app in development mode
CMD ["npm", "run", "dev"]

# ----------------------------------
# Production target
# ----------------------------------
FROM base AS prod

# Build the application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]

# ----------------------------------
# Default stage (set to production)
# ----------------------------------
FROM prod AS default
