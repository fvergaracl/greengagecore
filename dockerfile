# Use the official Node.js 18 image.
FROM node:18-alpine AS base

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install dependencies
RUN npm install

RUN npm install -g concurrently

# Copy the rest of the app's source code to the container
COPY . .

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
