FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy React app source
COPY . .

# Try to build using available script
RUN npm run build || (echo "Build script not found, checking available scripts:" && npm run)

# Determine if build directory exists after build attempt
RUN if [ -d "build" ]; then \
      echo "Build directory exists, will serve from here"; \
    elif [ -d "dist" ]; then \
      echo "Found dist directory instead of build" && \
      mv dist build; \
    else \
      echo "No build directory found, checking scripts" && \
      mkdir -p build && \
      echo '<!DOCTYPE html><html><head><title>Bookmarkeddit</title></head><body><h1>Bookmarkeddit Client</h1><p>Warning: Build failed. Check container logs.</p></body></html>' > build/index.html; \
    fi

# Install serve to host the static files
RUN npm install -g serve

# Serve the app
EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]