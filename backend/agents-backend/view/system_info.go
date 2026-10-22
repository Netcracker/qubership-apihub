package view

type ApihubSystemInfo struct {
	BackendVersion      string   `json:"backendVersion"`
	ProductionMode      bool     `json:"productionMode"`
	Notification        string   `json:"notification,omitempty"`
	ExternalLinks       []string `json:"externalLinks"`
	MigrationInProgress bool     `json:"migrationInProgress"`
}
