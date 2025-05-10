FROM node:20-alpine

WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy app source
COPY . .

# Build the TypeScript app
RUN npm run build

# Set environment variables
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/proxy.js"]