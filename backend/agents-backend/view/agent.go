package view

import (
	"strings"
	"time"
)

type AgentKeepaliveMessage struct {
	Cloud          string `json:"cloud" validate:"required"`
	Namespace      string `json:"namespace" validate:"required"`
	Url            string `json:"url" validate:"required"`
	BackendVersion string `json:"backendVersion" validate:"required"`
	Name           string `json:"name"`
	AgentVersion   string `json:"agentVersion"`
}

type AgentStatus string

const AgentStatusActive AgentStatus = "active"
const AgentStatusInactive AgentStatus = "inactive"

type AgentInstance struct {
	AgentId                  string                   `json:"agentId"`
	AgentDeploymentCloud     string                   `json:"agentDeploymentCloud"`
	AgentDeploymentNamespace string                   `json:"agentDeploymentNamespace"`
	AgentUrl                 string                   `json:"agentUrl"`
	LastActive               time.Time                `json:"lastActive"`
	Status                   AgentStatus              `json:"status"`
	BackendVersion           string                   `json:"backendVersion"`
	Name                     string                   `json:"name"`
	AgentVersion             string                   `json:"agentVersion"`
	CompatibilityError       *AgentCompatibilityError `json:"compatibilityError,omitempty"`
}

func MakeAgentId(cloud, namespace string) string {
	return strings.ToLower(cloud) + "_" + strings.ToLower(namespace)
}

type AgentNamespaces struct {
	Namespaces []string `json:"namespaces"`
	CloudName  string   `json:"cloudName"`
}

type AgentVersion struct {
	Version string `json:"version"`
}

type AgentCompatibilityError struct {
	Severity AgentCompatibilityErrorSeverity `json:"severity"`
	Message  string                          `json:"message"`
}

type AgentCompatibilityErrorSeverity string

const SeverityError AgentCompatibilityErrorSeverity = "error"
const SeverityWarning AgentCompatibilityErrorSeverity = "warning"
