package json_schema

import (
	"time"

	"github.com/Netcracker/qubership-apihub-agent/api_type/generic"
	"github.com/Netcracker/qubership-apihub-agent/utils"
	"github.com/Netcracker/qubership-apihub-agent/view"
)

func NewJsonSchemaDiscoveryRunner() generic.DiscoveryRunner {
	return &jsonSchemaDiscoveryRunner{}
}

type jsonSchemaDiscoveryRunner struct {
}

func (j jsonSchemaDiscoveryRunner) DiscoverDocuments(baseUrl string, urls view.DocumentDiscoveryUrls, timeout time.Duration) ([]view.Document, error) {
	// No default paths for this type
	return []view.Document{}, nil
}

func (j jsonSchemaDiscoveryRunner) GetDocumentsByRefs(baseUrl string, refs []view.DocumentRef) ([]view.Document, error) {
	return generic.GetAnyDocsByRefs(baseUrl, j.FilterRefsForApiType(refs))
}

func (j jsonSchemaDiscoveryRunner) FilterRefsForApiType(refs []view.DocumentRef) []view.DocumentRef {
	return utils.FilterRefsForApiType(refs, view.ATJsonSchema)
}

func (j jsonSchemaDiscoveryRunner) GetName() string {
	return "json-schema"
}
