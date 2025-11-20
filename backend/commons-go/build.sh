#!/bin/bash

set -e

echo "Building Go modules..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function for output messages
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Go is installed
if ! command -v go &>/dev/null; then
    error "Go is not installed. Please install Go 1.21 or later."
    exit 1
fi

# Check Go version
GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
REQUIRED_VERSION="1.21"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$GO_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    error "Go version $GO_VERSION is too old. Required: $REQUIRED_VERSION or later."
    exit 1
fi

info "Go version: $(go version)"

# Change to module directory
MODULE_DIR="api-spec-exposer"

if [ ! -d "$MODULE_DIR" ]; then
    error "Module directory '$MODULE_DIR' not found."
    exit 1
fi

cd "$MODULE_DIR"

info "Working directory: $(pwd)"

# Download dependencies
info "Downloading dependencies..."
go mod download

# Verify dependencies
info "Verifying dependencies..."
go mod verify

# Tidy dependencies
info "Tidying dependencies..."
go mod tidy

# Check for uncommitted changes
if ! git diff --quiet go.mod go.sum 2>/dev/null; then
    warn "Uncommitted changes detected in go.mod or go.sum"
    warn "Run 'go mod tidy' and commit the changes"
fi

# Build
info "Building module..."
go build ./...

# Run tests
info "Running tests..."
go test ./... -v

# Code check
info "Running go vet..."
go vet ./...

info "Build completed successfully!"
