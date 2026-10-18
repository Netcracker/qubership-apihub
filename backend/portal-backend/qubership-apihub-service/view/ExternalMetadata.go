package view

type OperationExternalMetadataKey struct {
	ApiType string `json:"apiType"`
	Method  string `json:"method"`
	Path    string `json:"path"`
}

type OperationExternalMetadata struct {
	OperationExternalMetadataKey
	ExternalMetadata map[string]interface{} `json:"externalMetadata"`
}

type ExternalMetadata struct {
	Operations []OperationExternalMetadata `json:"operations"`
}
