package exposer

import (
	"github.com/Netcracker/qubership-apihub/backend/commons-go/api-spec-exposer/config"
	"github.com/Netcracker/qubership-apihub/backend/commons-go/api-spec-exposer/internal/generator"
	"github.com/Netcracker/qubership-apihub/backend/commons-go/api-spec-exposer/internal/scanner"
)

// SpecExposer discovers API specifications on disk and returns endpoint configuration for each one.
type SpecExposer interface {
	Discover() config.DiscoveryResult
}

type specExposer struct {
	config config.DiscoveryConfig
}

// New returns a SpecExposer for the given discovery configuration.
func New(config config.DiscoveryConfig) SpecExposer {
	return &specExposer{
		config: config,
	}
}

// Discover scans the configured directory and returns endpoint configuration for every specification it finds.
func (se *specExposer) Discover() config.DiscoveryResult {
	var discoveryResult config.DiscoveryResult
	specScanner := scanner.New(se.config)

	specs, scanWarnings, scanErrors := specScanner.Scan()
	discoveryResult.Warnings = append(discoveryResult.Warnings, scanWarnings...)
	discoveryResult.Errors = append(discoveryResult.Errors, scanErrors...)

	gen := generator.New(specs)
	endpoints := gen.Generate()
	discoveryResult.Endpoints = endpoints

	return discoveryResult
}
