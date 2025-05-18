# Use official Node.js image for build
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production image
FROM node:18-alpine AS production

WORKDIR /app

# Install serve to serve the build
RUN npm install -g serve

# Copy build output from builder
COPY --from=builder /app/dist ./build

EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]