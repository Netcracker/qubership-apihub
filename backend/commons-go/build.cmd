@echo off
setlocal enabledelayedexpansion

echo Building Go modules...

set "ERROR=0"

REM Check if Go is installed
where go >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Go is not installed. Please install Go 1.21 or later.
    exit /b 1
)

REM Check Go version
for /f "tokens=3" %%i in ('go version') do set "GO_VERSION=%%i"
echo [INFO] Go version: !GO_VERSION!

echo [INFO] Working directory: %CD%

REM Download dependencies
echo [INFO] Downloading dependencies...
go mod download
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to download dependencies
    exit /b 1
)

REM Verify dependencies
echo [INFO] Verifying dependencies...
go mod verify
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to verify dependencies
    exit /b 1
)

REM Tidy dependencies
echo [INFO] Tidying dependencies...
go mod tidy
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to tidy dependencies
    exit /b 1
)

REM Build
echo [INFO] Building module...
go build ./...
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed
    exit /b 1
)

REM Run tests
echo [INFO] Running tests...
go test ./... -v
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Tests failed
    exit /b 1
)

REM Code check
echo [INFO] Running go vet...
go vet ./...
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] go vet found issues
    exit /b 1
)

echo [INFO] Build completed successfully!
exit /b 0
