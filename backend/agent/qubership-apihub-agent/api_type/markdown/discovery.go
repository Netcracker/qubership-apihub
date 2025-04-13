package markdown

import (
	"time"

	"github.com/Netcracker/qubership-apihub-agent/api_type/generic"
	"github.com/Netcracker/qubership-apihub-agent/utils"
	"github.com/Netcracker/qubership-apihub-agent/view"
)

func NewMarkdownDiscoveryRunner() generic.DiscoveryRunner {
	return &markdownDiscoveryRunner{}
}

type markdownDiscoveryRunner struct {
}

func (m markdownDiscoveryRunner) DiscoverDocuments(baseUrl string, urls view.DocumentDiscoveryUrls, timeout time.Duration) ([]view.Document, error) {
	// No default paths for this type
	return []view.Document{}, nil
}

func (m markdownDiscoveryRunner) GetDocumentsByRefs(baseUrl string, refs []view.DocumentRef) ([]view.Document, error) {
	return generic.GetAnyDocsByRefs(baseUrl, m.FilterRefsForApiType(refs))
}

func (m markdownDiscoveryRunner) FilterRefsForApiType(refs []view.DocumentRef) []view.DocumentRef {
	return utils.FilterRefsForApiType(refs, view.ATMarkdown)
}

func (m markdownDiscoveryRunner) GetName() string {
	return "markdown"
}
