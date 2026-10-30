package view

type EndpointCallInfo struct {
	Path         string `json:"path"` // Relative path (e.g., "/v3/api-docs")
	StatusCode   int    `json:"statusCode,omitempty"`
	ErrorSummary string `json:"errorSummary,omitempty"`
}

type ServiceDiagnostic struct {
	EndpointCalls []EndpointCallInfo `json:"endpointCalls,omitempty"` // Failed discovery attempts
}

type DiscoveryResult struct {
	Documents     []Document
	EndpointCalls []EndpointCallInfo
}
