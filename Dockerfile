FROM node:18

WORKDIR /app

# Copy package.json and package-lock.json for server
COPY server/package*.json ./

RUN npm install

# Copy server files
COPY server ./

# Build the server if needed
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
