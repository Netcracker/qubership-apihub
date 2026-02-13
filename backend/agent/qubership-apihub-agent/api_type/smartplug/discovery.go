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

func (m smartplugDiscoveryRunner) DiscoverDocuments(baseUrl string, urls view.DocumentDiscoveryUrls, timeout time.Duration) ([]view.Document, []view.EndpointCallInfo, error) {
	var allCallResults []view.EndpointCallInfo

	for _, url := range urls.SmartplugConfig {
		refs, configPath, callResult := m.getRefsFromSmartplugConfig(baseUrl, url, timeout)
		if callResult != nil {
			allCallResults = append(allCallResults, *callResult)
		}
		if len(refs) > 0 {
			// config found
			docs, callResults, err := m.GetDocumentsByRefs(baseUrl, refs, configPath)
			allCallResults = append(allCallResults, callResults...)
			return docs, allCallResults, err
		}
	}
	return nil, allCallResults, nil
}

func (m smartplugDiscoveryRunner) getRefsFromSmartplugConfig(baseUrl string, smartplugConfigUrl string, timeout time.Duration) ([]view.DocumentRef, string, *view.EndpointCallInfo) {
	smartplugSpecRefs, callResult := generic.GetRefsFromConfig(baseUrl, smartplugConfigUrl, timeout)
	if callResult != nil {
		return nil, "", callResult
	}
	for i := range smartplugSpecRefs {
		smartplugSpecRefs[i].ApiType = view.ATSmartplug
	}
	return smartplugSpecRefs, smartplugConfigUrl, nil
}

func (m smartplugDiscoveryRunner) GetDocumentsByRefs(baseUrl string, refs []view.DocumentRef, configPath string) ([]view.Document, []view.EndpointCallInfo, error) {
	docs, callResults, err := generic.GetAnyDocsByRefs(baseUrl, m.FilterRefsForApiType(refs), configPath)
	if err != nil {
		return docs, callResults, err
	}
	fileIds := sync.Map{}
	for i := range docs {
		docs[i].Format = view.MarkdownExtension
		docs[i].FileId = utils.GenerateFileId(&fileIds, docs[i].Name, docs[i].Format)
	}
	return docs, callResults, nil
}

func (m smartplugDiscoveryRunner) FilterRefsForApiType(refs []view.DocumentRef) []view.DocumentRef {
	return utils.FilterRefsForApiType(refs, view.ATSmartplug)
}

func (m smartplugDiscoveryRunner) GetName() string {
	return "smartplug"
}
