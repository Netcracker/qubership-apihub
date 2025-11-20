# qubership-apihub-commons-go

Library for working with API specifications in the Qubership API Hub ecosystem. Provides tools for automatic discovery, scanning, and exposure of API specifications in various formats.

## Description

`qubership-apihub-commons-go` contains a set of Go modules for working with API specifications. The main module `api-spec-exposer` provides functionality for:

- **Automatic discovery** of API specifications in the file system
- **Multiple format support**: OpenAPI 2.0/3.0/3.1, GraphQL, Markdown
- **HTTP endpoint generation** for accessing specifications
- **Directory scanning** with configurable exclusion rules

## Project Structure

```text
.
├── api-spec-exposer/          # Main module for API spec exposure
│   ├── config/                # Configuration and data types
│   ├── internal/
│   │   ├── generator/         # HTTP endpoint generator
│   │   └── scanner/           # Scanner for spec discovery
│   └── go.mod
├── .github/
│   └── workflows/            # GitHub Actions workflows
├── build.sh                   # Build script for Unix systems
├── build.cmd                  # Build script for Windows
└── README.md
```

## Requirements

- **Go 1.21** or higher
- Git for cloning the repository

## Installation

To use the library in your project, add the dependency:

```bash
go get github.com/qubership-apihub-commons-go/api-spec-exposer
```

Or add to your `go.mod`:

```go
require github.com/qubership-apihub-commons-go/api-spec-exposer v0.0.0
```

## Build

### Local Build

For local builds, use the provided scripts:

**On Unix systems (Linux, macOS):**
```bash
chmod +x build.sh
./build.sh
```

**On Windows:**
```cmd
build.cmd
```

The scripts perform the following actions:
- Go version check
- Dependency download and verification
- Building all modules
- Running tests
- Code check with `go vet`

### Manual Build

```bash
cd api-spec-exposer
go mod download
go mod verify
go mod tidy
go build ./...
go test ./...
go vet ./...
```

## Usage

### Basic Example

```go
package main

import (
    "fmt"
    "github.com/qubership-apihub-commons-go/api-spec-exposer"
    "github.com/qubership-apihub-commons-go/api-spec-exposer/config"
)

func main() {
    // Create configuration
    cfg := config.DiscoveryConfig{
        ScanDirectory:   "./specs",
        ExcludePatterns: []string{"*.tmp", "*.bak"},
    }
    
    // Create exposer instance
    exposer := exposer.New(cfg)
    
    // Discover specifications
    result, err := exposer.Discover()
    if err != nil {
        fmt.Printf("Discovery error: %v\n", err)
        return
    }
    
    // Output results
    fmt.Printf("Found specifications: %d\n", len(result.Specs))
    fmt.Printf("Generated endpoints: %d\n", len(result.Endpoints))
    
    if len(result.Warnings) > 0 {
        fmt.Println("Warnings:")
        for _, warning := range result.Warnings {
            fmt.Printf("  - %s\n", warning)
        }
    }
}
```

## Supported Formats

The library supports the following types of API specifications:

- **REST API**: OpenAPI 2.0, OpenAPI 3.0, OpenAPI 3.1
- **GraphQL**: GraphQL schemas and introspection
- **Markdown**: Documentation in Markdown format

## CI/CD

The project uses GitHub Actions for automation:

- **CI Workflow** (`.github/workflows/ci.yml`): Runs on Pull Request creation
  - Dependency verification
  - Module building
  - Test execution
  - Code checks

- **Release Workflow** (`.github/workflows/release.yml`): Runs on version tag creation
  - Full build and testing
  - Release artifact creation
  - GitHub Release publication

## Testing

Run all tests:

```bash
cd api-spec-exposer
go test ./... -v
```

Run tests with coverage:

```bash
go test ./... -cover
```

## Development

### Adding New Specification Types

To add support for a new API specification format:

1. Add a new `DocumentType` in `config/config.go`
2. Implement the `Identifier` interface in `internal/scanner/`
3. Register the new identifier in the scanner

### Code Style

The project follows standard Go conventions:
- Use `gofmt` for formatting
- Run `go vet` before committing
- Write tests for new functionality

## License

See the [LICENSE](LICENSE) file for detailed license information.

## Contributing

We welcome contributions to the project! Please:

1. Fork the repository
2. Create a branch for your feature (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

If you encounter any issues or have questions, please create an Issue in the repository.
