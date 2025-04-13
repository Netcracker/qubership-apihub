// Copyright 2024-2025 NetCracker Technology Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
