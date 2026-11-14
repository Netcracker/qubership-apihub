package view

type RegistryType string

const (
	RegistryTypeArtifactory RegistryType = "artifactory"
	RegistryTypeNexus       RegistryType = "nexus"
)

type Registry struct {
	RegistryId string       `json:"registryId"`
	Type       RegistryType `json:"type"`
	BaseUrl    string       `json:"baseUrl"`
	Name       string       `json:"name,omitempty"`
}

type Registries struct {
	Registries []Registry `json:"registries"`
}

type Repository struct {
	Repository string `json:"repository"`
	RegistryId string `json:"registryId"`
}

type Repositories struct {
	Repositories []Repository `json:"repositories"`
}
