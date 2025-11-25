# qubership-apihub-commons-go

Collection of Go modules and libraries for the Qubership API Hub ecosystem.

## Description

`qubership-apihub-commons-go` is a collection of Go modules for the Qubership API Hub ecosystem. Each module is independent and can be used separately in your projects.

## Available Modules

### 📦 [api-spec-exposer](./api-spec-exposer)

A library for automatic discovery and exposure of API specifications.

**Key Features:**
- Automatic discovery of API specifications in the file system
- Multiple format support: OpenAPI 2.0/3.0/3.1, GraphQL, Markdown
- HTTP endpoint generation for accessing specifications
- Directory scanning with configurable exclusion rules

**[📖 View full documentation →](./api-spec-exposer/README.md)**

**Installation:**
```bash
go get github.com/Netcracker/qubership-apihub-commons-go/api-spec-exposer
```

## Project Structure

```text
.
├── api-spec-exposer/          # API specification discovery and exposure
│   ├── README.md              # Module documentation
│   ├── config/                # Configuration and data types
│   ├── internal/              # Internal implementation
│   └── go.mod                 # Module dependencies
├── .github/
│   └── workflows/             # GitHub Actions workflows
├── build.sh                   # Build script for Unix systems
├── build.cmd                  # Build script for Windows
└── README.md
```

## Requirements

- **Go 1.23** or higher
- Git for cloning the repository

## Build

### Build All Modules

For local building all modules in the repository, use the provided scripts:

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

### Build Individual Module

To build a specific module:

```bash
cd <module-directory>
go mod download
go mod verify
go mod tidy
go build ./...
go test ./...
go vet ./...
```

For module-specific build instructions, see the module's README file.

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

To run tests for all modules:

```bash
./build.sh
```

To run tests for a specific module:

```bash
cd <module-directory>
go test ./... -v
```

## Development

### Code Style

The project follows standard Go conventions:
- Use `gofmt` for formatting
- Run `go vet` before committing
- Write tests for new functionality

For module-specific development guidelines, refer to the module's README file.

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
