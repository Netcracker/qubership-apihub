# qubership-apihub-commons-go

Collection of Go modules and libraries for the Qubership API Hub ecosystem.

## Description

`qubership-apihub-commons-go` is a collection of Go modules for the Qubership API Hub ecosystem. Currently, it provides the `api-spec-exposer` module with functionality for:

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

- **Go 1.23** or higher
- Git for cloning the repository

## Installation

To use the library in your project, add the dependency:

```bash
go get github.com/Netcracker/qubership-apihub-commons-go/api-spec-exposer
```

Or add to your `go.mod`:

```go
require github.com/Netcracker/qubership-apihub-commons-go/api-spec-exposer v0.0.0
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

This example demonstrates how to discover API specifications and register them as HTTP endpoints:

```go
package main

import (
    "log"
    "net/http"

    "github.com/Netcracker/qubership-apihub-commons-go/api-spec-exposer"
    "github.com/Netcracker/qubership-apihub-commons-go/api-spec-exposer/config"
)

func main() {
    // Create default configuration (scans current directory)
    discoveryConfig := config.DefaultConfig()
    
    // Or create custom configuration
    // discoveryConfig := config.DiscoveryConfig{
    //     ScanDirectory:   "./api-specs",
    //     ExcludePatterns: []string{"*.tmp", "*.bak", "node_modules", "vendor"},
    // }
    
    // Create exposer instance and discover specifications
    specExposer := exposer.New(discoveryConfig)
    discoveryResult := specExposer.Discover()
    
    // Check for errors during discovery
    if len(discoveryResult.Errors) > 0 {
        log.Println("Discovery errors:")
        for _, err := range discoveryResult.Errors {
            log.Printf("  - %v\n", err)
        }
        log.Fatal("Failed to discover API specifications")
    }
    
    // Print warnings if any
    if len(discoveryResult.Warnings) > 0 {
        log.Println("Discovery warnings:")
        for _, warning := range discoveryResult.Warnings {
            log.Printf("  - %s\n", warning)
        }
    }
    
    // Create HTTP router
    mux := http.NewServeMux()
    
    // Register discovered endpoints
    for _, endpointConfig := range discoveryResult.Endpoints {
        log.Printf("Registering endpoint: %s [%s - %s]\n", 
            endpointConfig.Path, endpointConfig.Name, endpointConfig.Type)
        mux.HandleFunc(endpointConfig.Path, endpointConfig.Handler)
    }
    
    // Start HTTP server
    log.Printf("Starting server on :8080 with %d API endpoints\n", len(discoveryResult.Endpoints))
    if err := http.ListenAndServe(":8080", mux); err != nil {
        log.Fatal(err)
    }
}
```

### Excluding Files and Directories

The library supports flexible exclusion patterns to filter out unwanted files and directories during scanning.

#### Exclusion Pattern Syntax

Exclusion patterns provide flexible file and directory matching:

**Pattern Characters:**

| Character | Description |
|-----------|-------------|
| `*` | Matches any sequence of non-separator characters |
| `?` | Matches any single non-separator character |
| `[class]` | Matches any single character within the class |
| `[^class]` | Matches any single character not within the class |
| `\` | Escapes the next character (Windows: use `\\`) |

**Character Classes:**

- `[abc]` - matches `a`, `b`, or `c`
- `[a-z]` - matches any character from `a` to `z`
- `[^0-9]` - matches any non-digit character

**Pattern Matching Rules:**

- Patterns match against both the **full path** and **relative path** from the scan directory
- Hidden files and directories (starting with `.`) are **automatically excluded** by default
- When a directory matches an exclusion pattern, the entire directory tree is skipped
- Path separators (`/` or `\`) in patterns are **not** matched by `*` or `?`

#### Exclusion Pattern Examples

```go
discoveryConfig := config.DiscoveryConfig{
    ScanDirectory: "./api",
    ExcludePatterns: []string{
        // Match all files with specific extension
        "*.tmp",           // Matches: file.tmp
        
        // Match files with specific prefix/suffix
        "test_*",          // Matches: test_api.json, test_spec.yaml
        "*_draft.*",       // Matches: api_draft.json, spec_draft.yaml
        "draft-*",         // Matches: draft-v1.json, draft-api.yaml
        
        // Match specific filenames
        "internal.json",   // Matches: internal.json

        // Match specific directories (entire tree will be skipped)
        "specs/internal",  // Matches: ./api/specs/internal/ and all its contents
        "docs/drafts",     // Matches: ./api/docs/drafts/ and all its contents
        
        // Complex patterns with character classes
        "test[123].json",  // Matches: test1.json, test2.json, test3.json
        "api-v[0-9].yaml", // Matches: api-v0.yaml, api-v1.yaml, ..., api-v9.yaml
        "spec[^0-9]*",     // Matches: spec files not starting with digit after "spec"
    },
}
```

## Supported Formats

The library supports the following types of API specifications:

- **REST API**: OpenAPI 2.0, OpenAPI 3.0, OpenAPI 3.1
- **GraphQL**: GraphQL schemas and introspection
- **Markdown**: Documentation in Markdown format
- **Unknown**: Any binary file

## Generated Endpoints

The library automatically generates HTTP endpoints based on discovered API specifications. The endpoint structure depends on the number and types of discovered specs.

### REST API Endpoints

**Single REST Specification:**
- `/v3/api-docs` - Serves the OpenAPI specification

**Multiple REST Specifications:**
- `/v3/api-docs/{fileId}` - Individual endpoint for each specification
- `/v3/api-docs/swagger-config` - Swagger configuration listing all REST specs

### GraphQL Endpoints

**Single GraphQL Specification:**
- `/graphql/introspection` - If the spec is an introspection result
- `/api/graphql-server/schema` - If the spec is a GraphQL schema

**Two GraphQL Specifications (one schema + one introspection):**
- `/api/graphql-server/schema` - Serves the GraphQL schema
- `/graphql/introspection` - Serves the introspection result

**Multiple GraphQL Specifications:**
- `/graphql/introspection` - For introspection specs
- `/api/graphql-server/schema/{fileId}` - Individual endpoint for each schema
- `/api/graphql-server/schema/domains` - Configuration listing all GraphQL specs

### Markdown, Other Files, and API Hub Configuration

When Markdown or other file types are discovered, the library generates:

- `/v3/api-docs/{fileId}` - Individual endpoint for each file
- `/v3/api-docs/apihub-swagger-config` - **Unified API Hub configuration** listing **all** discovered specifications (REST, GraphQL, Markdown, and other types)

The API Hub configuration endpoint follows the [API Hub config format](https://github.com/Netcracker/qubership-apihub-agent/blob/develop/documentation/dev_docs/apihub-config.md) and provides a complete inventory of all exposed API specifications and documentation files.

**Response Structure:**

```json
{
  "configUrl": "/v3/api-docs/apihub-swagger-config",
  "urls": [
    {
      "url": "/v3/api-docs",
      "name": "OpenAPI specification",
      "type": "openapi-3-0",
      "x-api-kind": "external"
    },
    {
      "url": "/v3/api-docs/documentation",
      "name": "Service documentation",
      "type": "markdown",
      "x-api-kind": "no-BWC"
    }
  ]
}
```

**Field Descriptions:**
- `url` - Relative path to access the specification
- `name` - Human-readable name derived from the file
- `type` - Specification type (e.g., `openapi-3-0`, `graphql`, `markdown`, `unknown`)
- `x-api-kind` - API classification metadata used to categorize APIs. The value is determined as follows:
  - **For REST specifications**: 
    - First attempts to extract the value from the OpenAPI spec's `x-api-kind` extension field
    - **Valid values**: Only `"BWC"` or `"no-BWC"` (case-insensitive)
    - If the spec contains an invalid value (e.g., `"external"`, `"internal"`), a warning is logged and `"BWC"` is used as default
    - If not present in the spec, falls back to filename-based detection
  - **For GraphQL, Markdown, and other types**: Uses filename-based detection only
  - **Filename-based detection logic**:
    - If the filename (without extension) ends with `_internal`, the value is set to `"no-BWC"`
    - Otherwise, the value is set to `"BWC"`
  
  Examples:
  - `api-spec_internal.yaml` → `"no-BWC"`
  - `user-service.json` → `"BWC"`
  - REST spec with `x-api-kind: no-BWC` in content → `"no-BWC"` (preserved from spec)
  - REST spec with `x-api-kind: external` in content → `"BWC"` (invalid value, defaults to BWC with warning)

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

#### 1. Add Type Constants

Add new constants in `api-spec-exposer/config/config.go`:

```go
// Add DocumentType constant (required)
const (
    // ... existing types ...
    DocTypeAsyncAPI2 DocumentType = "asyncapi-2"
)

// Add ApiType constant if needed (optional, only if introducing a new API category)
const (
    // ... existing types ...
    ApiTypeAsync ApiType = "async"
)

// Add Format constant if needed (optional, only for new file formats)
const (
    // ... existing formats ...
    FormatProtobuf Format = "proto"
)
```

#### 2. Implement the Identifier

Create a new identifier in `api-spec-exposer/internal/scanner/` that implements the `Identifier` interface:

```go
type Identifier interface {
    // CanHandle returns true if this identifier can process the file
    CanHandle(path string) bool
    
    // Identify attempts to identify the spec type from file content
    Identify(path string, content []byte) (*config.SpecMetadata, []string, []error)
}
```

See existing identifiers (`rest_identifier.go`, `graphql_identifier.go`, `markdown_identifier.go`) for implementation examples.

#### 3. Register the Identifier

Add the new identifier to the chain in `api-spec-exposer/internal/scanner/scanner.go`:

```go
identifierChain: &IdentifierChain{
    identifiers: []Identifier{
        &YourNewIdentifier{},  // Add here
        &RestIdentifier{},
        &GraphQLIdentifier{},
        &MarkdownIdentifier{},
        &BasicIdentifier{},
    },
}
```

**Note:** Identifier order matters - more specific identifiers should be placed before generic ones.

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
