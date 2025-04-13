package view

type AllServiceListResponse struct {
	Status                     StatusEnum                     `json:"status"`
	Debug                      string                         `json:"debug,omitempty"`
	Progress                   string                         `json:"progress,omitempty"`
	ElapsedSec                 int                            `json:"elapsedSec,omitempty"`
	TotalNamespaces            int                            `json:"totalNamespaces,omitempty"`
	TotalServices              int                            `json:"totalServices,omitempty"`
	TotalServicesWithBaselines int                            `json:"totalServicesWithBaselines,omitempty"`
	TotalDocuments             int                            `json:"totalDocuments,omitempty"`
	NamespaceData              map[string]ServiceListResponse `json:"namespaceData,omitempty"`
}
