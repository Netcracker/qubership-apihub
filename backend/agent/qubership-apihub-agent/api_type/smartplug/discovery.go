package smartplug

import (
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub-agent/api_type/generic"
	"github.com/Netcracker/qubership-apihub-agent/utils"
	"github.com/Netcracker/qubership-apihub-agent/view"
)

func NewSmartplugDiscoveryRunner() generic.DiscoveryRunner {
	return &smartplugDiscoveryRunner{}
}

type smartplugDiscoveryRunner struct {
}

func (m smartplugDiscoveryRunner) DiscoverDocuments(baseUrl string, urls view.DocumentDiscoveryUrls, timeout time.Duration) ([]view.Document, error) {
	var refs []view.DocumentRef
	for _, url := range urls.SmartplugConfig {
		refs = m.getRefsFromSmartplugConfig(baseUrl, url, timeout)
		if len(refs) > 0 {
			// config found
			return m.GetDocumentsByRefs(baseUrl, refs)
		}
	}
	return nil, nil
}

func (m smartplugDiscoveryRunner) getRefsFromSmartplugConfig(baseUrl string, swaggerConfigUrl string, timeout time.Duration) []view.DocumentRef {
	swaggerSpecRefs := generic.GetRefsFromConfig(baseUrl, swaggerConfigUrl, timeout)
	for i := range swaggerSpecRefs {
		swaggerSpecRefs[i].ApiType = view.ATSmartplug
	}
	return swaggerSpecRefs
}

func (m smartplugDiscoveryRunner) GetDocumentsByRefs(baseUrl string, refs []view.DocumentRef) ([]view.Document, error) {
	docs, err := generic.GetAnyDocsByRefs(baseUrl, m.FilterRefsForApiType(refs))
	if err != nil {
		return docs, err
	}
	fileIds := sync.Map{}
	for i := range docs {
		docs[i].Format = view.MarkdownExtension
		docs[i].FileId = utils.GenerateFileId(&fileIds, docs[i].Name, docs[i].Format)
	}
	return docs, nil
}

func (m smartplugDiscoveryRunner) FilterRefsForApiType(refs []view.DocumentRef) []view.DocumentRef {
	return utils.FilterRefsForApiType(refs, view.ATSmartplug)
}

func (m smartplugDiscoveryRunner) GetName() string {
	return "smartplug"
}
