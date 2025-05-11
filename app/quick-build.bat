@echo off
:: Clean previous build artifacts
echo Cleaning previous build...
if exist dist rmdir /s /q dist

:: Run vite build directly without type checking
echo Skipping full type check, building directly...
npx vite build
