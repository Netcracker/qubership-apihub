# qubership-api-linter-service
The qubership-api-linter-service is a Golang-based microservice that provides a REST API endpoint for linting and validating OpenAPI Specification (OAS) files. It serves as a quality control tool for API definitions, helping developers maintain consistency and adhere to best practices in their API documentation.

## Key Features

Dual-engine support (Spectral and Vacuum) for comprehensive OAS validation

RESTful interface for easy integration into CI/CD pipelines

Lightweight container-friendly design

## Current Status

⚠️ Development Preview
This service is currently under active development and not yet recommended for production use. The team is working on additional features and stability improvements.

## Installation

Installation instructions will be provided in future releases (TODO).

## Build Instructions

To compile the service, simply execute the appropriate build script:

Windows: build.cmd

Linux/macOS: build.sh

The build process generates a standalone binary with all required dependencies. Future versions will include containerization support and package management options.

## AI agent configuration (APM)

Generic agent packages come from [`qubership-apihub-ci/agent-packages`](https://github.com/Netcracker/qubership-apihub-ci/tree/main/agent-packages)
via [APM](https://microsoft.github.io/apm/). Deployed `.cursor/` and `.claude/` harness trees are
**committed**; refresh them after changing `apm.yml` or upstream packages:

```bash
# one-time: install APM (see https://microsoft.github.io/apm/)
brew install microsoft/apm/apm   # or: pip install apm-cli

# from the repository root:
apm install --target cursor,claude --legacy-skill-paths
```

This reads `apm.yml`, updates `apm.lock.yaml`, and deploys skills/rules into `.cursor/` and
`.claude/`. Commit the refreshed harness trees with manifest or lockfile changes. Only
`apm_modules/` is gitignored.