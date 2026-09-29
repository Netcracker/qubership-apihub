package utils

import (
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub-agent/view"
)

var (
	discoveryTransportOnce sync.Once
	discoveryTransport     http.RoundTripper
	discoveryTransportErr  error
)

// MakeDiscoveryHttpClient returns an HTTP client for discovery calls. The underlying
// transport is a shared singleton so that connections are pooled and reused across
// calls, while each client still gets its own per-call timeout.
func MakeDiscoveryHttpClient(timeout time.Duration) (http.Client, error) {
	discoveryTransportOnce.Do(func() {
		tlsConfig, err := BuildSecureTLSConfig(nil)
		if err != nil {
			discoveryTransportErr = err
			return
		}
		discoveryTransport = RegisterPoolStats("discovery", NewPooledTransport(tlsConfig))
	})
	if discoveryTransportErr != nil {
		return http.Client{}, discoveryTransportErr
	}
	return http.Client{
		Timeout:   timeout,
		Transport: discoveryTransport,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}, nil
}

func EscapeSpaces(s string) string {
	return strings.ReplaceAll(s, " ", "%20")
}

func MakeDocumentRefsFromUrls(urls []string, apiType view.ApiType, required bool, timeout time.Duration) []view.DocumentRef {
	specRefs := make([]view.DocumentRef, len(urls))
	for _, url := range urls {
		specRefs = append(specRefs, view.DocumentRef{Url: url, ApiType: apiType, Required: required, Timeout: timeout})
	}
	return specRefs
}

func FilterRefsForApiType(refs []view.DocumentRef, targetApiType view.ApiType) []view.DocumentRef {
	var filteredRefs []view.DocumentRef
	for _, ref := range refs {
		if ref.ApiType == targetApiType {
			filteredRefs = append(filteredRefs, ref)
		}
	}
	return filteredRefs
}

func FilterResultDocuments(documents []view.Document) []view.Document {
	var result []view.Document
	for _, doc := range documents {
		if doc.FileId != "" {
			result = append(result, doc)
		}
	}
	return result
}

func FilterFailedEndpointCalls(calls []view.EndpointCallInfo) []view.EndpointCallInfo {
	result := make([]view.EndpointCallInfo, 0)
	for _, call := range calls {
		if call.Path != "" {
			result = append(result, call)
		}
	}
	return result
}

func FilterResultErrors(errs []string) error {
	result := ""
	for i, err := range errs {
		if err != "" {
			result += err
			if i < len(errs)-1 {
				result += " | "
			}
		}
	}
	if result == "" {
		return nil
	}
	return fmt.Errorf("%s", result)
}

func FilterResultErrorsMap(errs map[int]error) error {
	result := ""
	i := 0
	for _, err := range errs {
		if err != nil {
			result += err.Error()
			if i < len(errs)-1 {
				result += " | "
			}
		}
		i += 1
	}
	if result == "" {
		return nil
	}
	return fmt.Errorf("%s", result)
}
