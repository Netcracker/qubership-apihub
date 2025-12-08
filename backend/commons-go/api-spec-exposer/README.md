# API Spec Exposer

A Go library for automatic discovery and exposure of API specifications.

## Description

The `api-spec-exposer` module provides automatic discovery and exposure capabilities for API specifications. It scans your file system, identifies API specifications in various formats, and generates ready-to-use HTTP endpoint configurations.

### How It Works

The library operates in three main stages:

1. **Scanning**: Recursively scans a specified directory for potential API specification files, applying configurable exclusion patterns to filter out unwanted files and directories.

2. **Identification**: Analyzes discovered files to determine their type and extract metadata. The library uses a chain of specialized identifiers to recognize different API specification formats.

3. **Endpoint Configuration Generation**: Based on the discovered specifications and their types, generates `EndpointConfig` objects containing:
   - HTTP handler functions for serving specification content
   - Default URL paths following industry conventions
   - Metadata (name, type, format, file path, API kind classification)

The library does not register endpoints directly—instead, it provides all the necessary components (`Handler`, `Path`, and metadata) for you to register them in your HTTP router of choice.

### Supported Formats

The library recognizes and supports the following API specification formats:

| Format | Document Types | File Extensions |
|--------|----------------|-----------------|
| **REST API** | OpenAPI 2.0, OpenAPI 3.0, OpenAPI 3.1 | `.json`, `.yaml`, `.yml` |
| **GraphQL** | GraphQL schemas, Introspection results | `.graphql`, `.gql`, `.json` |
| **Markdown** | Documentation files | `.md` |

Each specification is analyzed to determine its exact type and version, enabling proper endpoint configuration and metadata generation.

## Requirements

- **Go 1.23** or higher

## Installation

To use the library in your project, add the dependency:

```bash
go get github.com/Netcracker/qubership-apihub-commons-go/api-spec-exposer
```

Or add to your `go.mod`:

```go
require github.com/Netcracker/qubership-apihub-commons-go/api-spec-exposer v0.0.0 //specify required version
```

## Build

### Local Build

**From the module directory:**
```bash
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
    
    // Register endpoint configurations in your HTTP router
    // The library provides the Handler, Path, and metadata - you control the registration
    for _, endpointConfig := range discoveryResult.Endpoints {
        log.Printf("Registering endpoint: %s [%s - %s]\n", 
            endpointConfig.Path, endpointConfig.Name, endpointConfig.Type)
        mux.HandleFunc(endpointConfig.Path, endpointConfig.Handler)
    }
    
    // Start HTTP server
    log.Printf("Starting server on :8080 with %d API specification endpoints\n", len(discoveryResult.Endpoints))
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

## Endpoint Configuration Rules

The library generates endpoint configurations based on analysis of discovered API specifications. The generated `EndpointConfig` objects include HTTP handlers, default URL paths, and metadata—ready for registration in your HTTP router.

**Important:** The library does **not** register endpoints automatically. Instead, it provides complete endpoint configurations that you can register in any HTTP framework (standard library `http.ServeMux`, Gorilla Mux, etc.).

The default URL paths and configuration structure depend on the number and types of discovered specifications:

### REST API Specifications

The library applies the following rules when generating endpoint configurations for OpenAPI specifications:

**Single REST Specification:**
- Path: `/v3/api-docs`
- Handler: Serves the OpenAPI specification file content
- Metadata: Includes spec name, type (openapi-2-0, openapi-3-0, or openapi-3-1), and x-api-kind

**Multiple REST Specifications:**
- Path per spec: `/v3/api-docs/{fileId}` (where `{fileId}` is a URL-safe slug derived from the filename)
- Additional config endpoint: `/v3/api-docs/swagger-config` providing a JSON listing of all REST specifications

### GraphQL Specifications

The library applies the following rules when generating endpoint configurations for GraphQL specifications:

**Single GraphQL Specification:**
- If the spec is an **introspection result**:
  - Path: `/graphql/introspection`
- If the spec is a **GraphQL schema**:
  - Path: `/api/graphql-server/schema`

**Two GraphQL Specifications (exactly one schema + one introspection):**
- Schema path: `/api/graphql-server/schema`
- Introspection path: `/graphql/introspection`

**Multiple GraphQL Specifications (more than 2, or 2 of the same type):**
- Introspection specs: `/graphql/introspection/{fileId}`
- Schema specs: `/api/graphql-server/schema/{fileId}`
- Additional config endpoint: `/api/graphql-server/schema/domains` providing a JSON listing of all GraphQL specifications

### Markdown, Other Files, and Unified Configuration

When Markdown or other file types are discovered, the library generates additional endpoint configurations:

**Markdown and Binary Files:**
- Path per file: `/v3/api-docs/{fileId}` (each file gets its own endpoint configuration)

**Unified API Hub Configuration:**

Whenever non-REST/non-GraphQL files are present (Markdown, binary, or unknown types), the library automatically generates a unified configuration endpoint:

- Path: `/v3/api-docs/apihub-swagger-config`
- Handler: Returns JSON with **all** discovered specifications (REST, GraphQL, Markdown, and other types)
- Format: Follows the [API Hub config format](https://github.com/Netcracker/qubership-apihub-agent/blob/develop/documentation/dev_docs/apihub-config.md)

This configuration endpoint provides a complete inventory of all API specifications and documentation files that have been exposed.

**Response Structure:**

```json
{
  "configUrl": "/v3/api-docs/apihub-swagger-config",
  "urls": [
    {
      "url": "/v3/api-docs/spec",
      "name": "OpenAPI specification",
      "type": "openapi-3-0",
      "x-api-kind": "BWC"
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

## Testing

Run all tests:

```bash
go test ./... -v
```

Run tests with coverage:

```bash
go test ./... -cover
```

## Development

### Module Structure

```text
api-spec-exposer/
├── config/                # Configuration and data types
├── internal/
│   ├── generator/         # HTTP endpoint generator
│   └── scanner/           # Scanner for spec discovery
├── exposer.go            # Main entry point
├── exposer_test.go       # Tests
└── go.mod
```

### Adding New Specification Types

To add support for a new API specification format:

#### 1. Add Type Constants

Add new constants in `config/config.go`:

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

Create a new identifier in `internal/scanner/` that implements the `Identifier` interface:

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

Add the new identifier to the chain in `internal/scanner/scanner.go`:

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

The module follows standard Go conventions:
- Use `gofmt` for formatting
- Run `go vet` before committing
- Write tests for new functionality

## License

See the [LICENSE](../LICENSE) file for detailed license information.

## Contributing

See the [main repository README](../README.md#contributing) for contribution guidelines.

