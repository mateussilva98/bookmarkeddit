@echo off
:: Clean previous build artifacts
echo Cleaning previous build...
if exist dist rmdir /s /q dist

:: Run TypeScript type check
echo Running TypeScript type check...
npx tsc --noEmit --skipLibCheck

:: Check if tsc succeeded (errorlevel 0 means success)
if %errorlevel% equ 0 (
  echo Type check passed, building project...
  npx vite build
  exit /b %errorlevel%
) else (
  echo Type check failed. Fix TypeScript errors before building.
  exit /b 1
)
