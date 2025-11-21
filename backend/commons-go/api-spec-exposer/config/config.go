package config

import "net/http"

// ApiType represents the type of API specification
type ApiType string

const (
	ApiTypeRest     ApiType = "rest"
	ApiTypeGraphQL  ApiType = "graphql"
	ApiTypeMarkdown ApiType = "markdown"
	ApiTypeUnknown  ApiType = "unknown"
)

// DocumentType represents the specific document type (for apihub-swagger-config)
type DocumentType string

const (
	DocTypeOpenAPI31 DocumentType = "openapi-3-1"
	DocTypeOpenAPI30 DocumentType = "openapi-3-0"
	DocTypeOpenAPI20 DocumentType = "openapi-2-0"

	DocTypeGraphQL       DocumentType = "graphql"
	DocTypeIntrospection DocumentType = "introspection"

	DocTypeMarkdown DocumentType = "markdown"

	DocTypeUnknown DocumentType = "unknown"
)

// Format represents the file format
type Format string

const (
	FormatJSON     Format = "json"
	FormatYAML     Format = "yaml"
	FormatGraphQL  Format = "graphql"
	FormatMarkdown Format = "md"
	FormatUnknown  Format = "unknown"
)

// SpecMetadata contains metadata about a discovered spec
type SpecMetadata struct {
	Name     string
	FilePath string
	Type     DocumentType
	ApiType  ApiType
	Format   Format
	FileId   string //slug
	XApiKind string
}

// EndpointConfig represents an HTTP endpoint configuration with its handler function and related API spec metadata
type EndpointConfig struct {
	SpecMetadata
	Path    string
	Handler func(w http.ResponseWriter, r *http.Request)
}

// DiscoveryResult contains the result of spec discovery
type DiscoveryResult struct {
	Endpoints []EndpointConfig
	Warnings  []string
	Errors    []error
}

// DiscoveryConfig contains configuration for spec discovery
type DiscoveryConfig struct {
	// Directory to scan
	ScanDirectory string

	// Exclude patterns
	ExcludePatterns []string
}

// DefaultConfig returns a default discovery configuration
func DefaultConfig() DiscoveryConfig {
	return DiscoveryConfig{
		ScanDirectory:   ".",
		ExcludePatterns: []string{},
	}
}

// ConfigURL represents a URL entry in config endpoints response
type ConfigURL struct {
	URL      string `json:"url"`
	Name     string `json:"name"`
	Type     string `json:"type,omitempty"`
	XApiKind string `json:"x-api-kind,omitempty"`
}

// ApiSpecConfig represents a unified configuration response
type ApiSpecConfig struct {
	ConfigURL string      `json:"configUrl,omitempty"`
	URLs      []ConfigURL `json:"urls"`
}
