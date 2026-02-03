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

package view

type Document_deprecated struct {
	Name     string `json:"name"`
	Path     string `json:"originalPath"`
	Format   string `json:"format"`
	FileId   string `json:"fileId"`
	Type     string `json:"type"`
	XApiKind string `json:"xApiKind,omitempty"`
}

type Document struct {
	Name       string `json:"name"`
	Format     string `json:"format"`
	FileId     string `json:"fileId"`
	Type       string `json:"type"`
	XApiKind   string `json:"xApiKind,omitempty"`
	DocPath    string `json:"docPath"`
	ConfigPath string `json:"configPath,omitempty"`
}

func (d *Document) ToDeprecated() Document_deprecated {
	return Document_deprecated{
		Name:     d.Name,
		Path:     d.DocPath,
		Format:   d.Format,
		FileId:   d.FileId,
		Type:     d.Type,
		XApiKind: d.XApiKind,
	}
}

const FormatJson string = "json"
const FormatYaml string = "yaml"
const FormatGraphql string = "graphql"
