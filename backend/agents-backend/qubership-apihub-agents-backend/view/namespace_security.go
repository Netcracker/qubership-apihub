package view

import "time"

const EndpointStatusOK = "OK"
const EndpointStatusNotOK = "NOT OK"
const EndpointStatusUnknown = "Unknown"

const ServiceResultOK = "OK"
const ServiceResultNotOK = "NOT OK"
const ServiceResultToCheck = "TO CHECK"
const ServiceResultUnknown = "Unknown"

type ProcessId struct {
	ProcessId string `json:"processId"`
}

type StartNamespaceSecurityCheckReq struct {
	AgentId     string `json:"agentId" validate:"required"`
	Namespace   string `json:"name" validate:"required"`
	WorkspaceId string `json:"workspaceId" validate:"required"`
}

type EndpointsProcessTask struct {
	ProcessId string
	Namespace string
	AgentUrl  string
	ServiceId string
	PackageId string
	Version   string
}

type RestOperationSecurity struct {
	Path     string
	Method   string
	Security []string
}

type GetNamespaceSecurityCheckReq struct {
	AgentId     string
	Namespace   string
	WorkspaceId string
	Limit       int
	Page        int
}

type NamespaceSecurityCheckReports struct {
	Reports []NamespaceSecurityCheckReport `json:"reports"`
}

type NamespaceSecurityCheckReport struct {
	ProcessId         string                 `json:"processId"`
	CreatedAt         time.Time              `json:"createdAt"`
	CreatedBy         map[string]interface{} `json:"createdBy"`
	Status            string                 `json:"status"`
	Details           string                 `json:"details,omitempty"`
	ServicesProcessed int                    `json:"servicesProcessed"`
	ServicesTotal     int                    `json:"servicesTotal"`
}

type NamespaceSecurityCheckStatus struct {
	Status            string `json:"status"`
	ServicesProcessed int    `json:"servicesProcessed"`
	ServicesTotal     int    `json:"servicesTotal"`
	Details           string `json:"details,omitempty"`
}
