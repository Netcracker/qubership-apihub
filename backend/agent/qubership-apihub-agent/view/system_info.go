package view

import "time"

type SystemInfo struct {
	BackendVersion   string        `json:"backendVersion"`
	InsecureProxy    bool          `json:"-"`
	ApihubUrl        string        `json:"-"`
	AgentUrl         string        `json:"-"`
	AccessToken      string        `json:"-"`
	DiscoveryConfig  string        `json:"-"`
	CloudName        string        `json:"-"`
	AgentNamespace   string        `json:"-"`
	ExcludeLabels    []string      `json:"-"`
	GroupingLabels   []string      `json:"-"`
	AgentName        string        `json:"-"`
	DiscoveryTimeout   time.Duration `json:"-"`
	NamespacesCacheTTL time.Duration `json:"-"`
	ServicesCacheTTL   time.Duration `json:"-"`
}
