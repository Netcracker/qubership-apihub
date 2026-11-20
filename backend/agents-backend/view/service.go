package view

import "encoding/json"

type Service_deprecated struct {
	Id                       string            `json:"id"`
	Name                     string            `json:"serviceName"`
	Url                      string            `json:"url"`
	Specs                    []Specification   `json:"specs"`
	Baseline                 *Baseline         `json:"baseline,omitempty"`
	Labels                   map[string]string `json:"serviceLabels,omitempty"`
	AvailablePromoteStatuses []string          `json:"availablePromoteStatuses"`
	ProxyServerUrl           string            `json:"proxyServerUrl,omitempty"`
}

type Service struct {
	Id                       string             `json:"id"`
	Name                     string             `json:"serviceName"`
	Url                      string             `json:"url"`
	Documents                []Document         `json:"documents"`
	Baseline                 *Baseline          `json:"baseline,omitempty"`
	Labels                   map[string]string  `json:"serviceLabels,omitempty"`
	AvailablePromoteStatuses []string           `json:"availablePromoteStatuses"`
	ProxyServerUrl           string             `json:"proxyServerUrl,omitempty"`
	Error                    string             `json:"error,omitempty"`
	DiagnosticInfo           *ServiceDiagnostic `json:"diagnosticInfo,omitempty"`
}

type EndpointCallInfo struct {
	Path         string `json:"path"`
	StatusCode   int    `json:"statusCode,omitempty"`
	ErrorSummary string `json:"errorSummary,omitempty"`
}

type ServiceDiagnostic struct {
	EndpointCalls []EndpointCallInfo `json:"endpointCalls,omitempty"`
}
type Status string

const StatusNone Status = "none"
const StatusRunning Status = "running"
const StatusComplete Status = "complete"
const StatusError Status = "error"
const StatusFailed Status = "failed"

type ServiceListResponse_deprecated struct {
	Services []Service_deprecated `json:"services"`
	Status   Status               `json:"status"`
	Debug    string               `json:"debug"`
}

type ServiceListResponse struct {
	Services          []Service `json:"services"`
	Status            Status    `json:"status"`
	Debug             string    `json:"debug"`
	RequestedServices []string  `json:"requestedServices,omitempty"`
}

type DiscoveryRequest struct {
	Services []string `json:"services,omitempty"` //empty list means the whole namespace is discovered
}

type ServiceNameItem struct {
	Id   string `json:"id"`
	Name string `json:"name"`
}

type ServiceNamesResponse struct {
	ServiceNames []ServiceNameItem `json:"serviceNames"`
}

type Baseline struct {
	PackageId string            `json:"packageId"`
	Name      string            `json:"name"`
	Url       string            `json:"url"`
	Versions  []BaselineVersion `json:"versions"`
}

type BaselineVersion struct {
	Version             string `json:"version"`
	ApiProcessorVersion string `json:"apiProcessorVersion"`
	HasErrors           bool   `json:"hasErrors"`
	ChangelogHasErrors  bool   `json:"changelogHasErrors"`
}

// UnmarshalJSON also accepts a plain version string, which agents up to 2.1.5 send instead of an object.
func (b *BaselineVersion) UnmarshalJSON(data []byte) error {
	var version string
	if err := json.Unmarshal(data, &version); err == nil {
		*b = BaselineVersion{Version: version}
		return nil
	}
	type plain BaselineVersion
	return json.Unmarshal(data, (*plain)(b))
}
