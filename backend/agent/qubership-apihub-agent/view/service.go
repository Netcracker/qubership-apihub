package view

import "fmt"

type Service_deprecated struct {
	Id                       string                `json:"id"`
	Name                     string                `json:"serviceName"`
	Url                      string                `json:"url"`
	Documents                []Document_deprecated `json:"specs"`
	Baseline                 *Baseline             `json:"baseline,omitempty"`
	Labels                   map[string]string     `json:"serviceLabels,omitempty"`
	AvailablePromoteStatuses []string              `json:"availablePromoteStatuses"`
	ProxyServerUrl           string                `json:"proxyServerUrl,omitempty"`
	Error                    string                `json:"error,omitempty"`
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

func (s *Service) ToDeprecated() Service_deprecated {
	docs := make([]Document_deprecated, len(s.Documents))
	for i, doc := range s.Documents {
		docs[i] = doc.ToDeprecated()
	}
	return Service_deprecated{
		Id:                       s.Id,
		Name:                     s.Name,
		Url:                      s.Url,
		Documents:                docs,
		Baseline:                 s.Baseline,
		Labels:                   s.Labels,
		AvailablePromoteStatuses: s.AvailablePromoteStatuses,
		ProxyServerUrl:           s.ProxyServerUrl,
		Error:                    s.Error,
	}
}

type ServiceItem struct {
	Id             string            `json:"id"`
	Namespace      string            `json:"namespace"`
	Name           string            `json:"serviceName"`
	Url            string            `json:"url"`
	Labels         map[string]string `json:"serviceLabels,omitempty"`
	Annotations    map[string]string `json:"serviceAnnotations,omitempty"`
	Pods           []string          `json:"servicePods,omitempty"`
	ProxyServerUrl string            `json:"proxyServerUrl,omitempty"`
}

type StatusEnum string

const StatusNone StatusEnum = "none"
const StatusRunning StatusEnum = "running"
const StatusComplete StatusEnum = "complete"
const StatusError StatusEnum = "error"

type ServiceListResponse_deprecated struct {
	Services []Service_deprecated `json:"services"`
	Status   StatusEnum           `json:"status"`
	Debug    string               `json:"debug"`
}

type ServiceListResponse struct {
	Services []Service  `json:"services"`
	Status   StatusEnum `json:"status"`
	Debug    string     `json:"debug"`
}

type Baseline struct {
	PackageId string   `json:"packageId"`
	Name      string   `json:"name"`
	Url       string   `json:"url"`
	Versions  []string `json:"versions"`
}

func BuildStatusFromString(str string) (StatusEnum, error) {
	switch str {
	case "none":
		return StatusNone, nil
	case "running":
		return StatusRunning, nil
	case "complete":
		return StatusComplete, nil
	case "error":
		return StatusError, nil
	}
	return StatusNone, fmt.Errorf("unknown build status: %s", str)
}

type ServiceNameItem struct {
	Id   string `json:"id"`
	Name string `json:"name"`
}

type ServiceNamesResponse struct {
	ServiceNames []ServiceNameItem `json:"serviceNames"`
}

type ServiceItemsResponse struct {
	ServiceItems []ServiceItem `json:"serviceItems"`
}
