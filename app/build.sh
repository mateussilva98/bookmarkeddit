#!/bin/sh
# Setup environment variables for build
export NODE_ENV=production

# Clean previous build artifacts
echo "Cleaning previous build..."
rm -rf dist

# Run TypeScript type check
echo "Running TypeScript type check..."
npx tsc --noEmit
TSC_RESULT=$?

# Build the project if type check passes
if [ $TSC_RESULT -eq 0 ]; then
  echo "Type check passed, building project..."
  npx vite build
  exit $?
else
  echo "Type check failed. Fix TypeScript errors before building."
  exit 1
fi
