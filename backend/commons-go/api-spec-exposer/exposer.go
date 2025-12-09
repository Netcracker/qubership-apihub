package exposer

import (
	"github.com/Netcracker/qubership-apihub-commons-go/api-spec-exposer/config"
	"github.com/Netcracker/qubership-apihub-commons-go/api-spec-exposer/internal/generator"
	"github.com/Netcracker/qubership-apihub-commons-go/api-spec-exposer/internal/scanner"
)

// SpecExposer is the main interface for API spec exposure
type SpecExposer interface {
	Discover() config.DiscoveryResult
}

type specExposer struct {
	config config.DiscoveryConfig
}

// New creates a new SpecExposer instance
func New(config config.DiscoveryConfig) SpecExposer {
	return &specExposer{
		config: config,
	}
}

// Discover scans directory and generates endpoint configurations (@config.EndpointConfig) for all discovered specs
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
