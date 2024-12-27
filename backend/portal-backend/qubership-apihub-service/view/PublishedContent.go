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

type PublishedContent struct {
	ContentId   string       `json:"fileId"`
	Type        ShortcutType `json:"type"`
	Format      string       `json:"format"`
	Path        string       `json:"-"`
	Name        string       `json:"-"`
	Index       int          `json:"-"`
	Slug        string       `json:"slug"`
	Labels      []string     `json:"labels,omitempty"`
	Title       string       `json:"title,omitempty"`
	Version     string       `json:"version,omitempty"`
	ReferenceId string       `json:"refId,omitempty"`
	Openapi     *Openapi     `json:"openapi,omitempty"`
	Asyncapi    *Asyncapi    `json:"asyncapi,omitempty"`
}

type PublishedContentInfo struct {
	FileId   string
	Checksum string
}

type SharedUrlResult_deprecated struct {
	SharedId string `json:"sharedId"`
}

// deprecated
type PublishedDocument_deprecated struct {
	FieldId      string                          `json:"fileId"`
	Slug         string                          `json:"slug"`
	Type         string                          `json:"type"`
	Format       string                          `json:"format"`
	Title        string                          `json:"title,omitempty"`
	Labels       []string                        `json:"labels,omitempty"`
	Description  string                          `json:"description,omitempty"`
	Version      string                          `json:"version,omitempty"`
	Info         interface{}                     `json:"info,omitempty"`
	ExternalDocs interface{}                     `json:"externalDocs,omitempty"`
	Operations   []DocumentsOperation_deprecated `json:"operations,omitempty"`
	Filename     string                          `json:"filename"`
	Tags         []interface{}                   `json:"tags"`
}

type PublishedDocument struct {
	FieldId      string        `json:"fileId"`
	Slug         string        `json:"slug"`
	Type         string        `json:"type"`
	Format       string        `json:"format"`
	Title        string        `json:"title,omitempty"`
	Labels       []string      `json:"labels,omitempty"`
	Description  string        `json:"description,omitempty"`
	Version      string        `json:"version,omitempty"`
	Info         interface{}   `json:"info,omitempty"`
	ExternalDocs interface{}   `json:"externalDocs,omitempty"`
	Operations   []interface{} `json:"operations,omitempty"`
	Filename     string        `json:"filename"`
	Tags         []interface{} `json:"tags"`
}

type PublishedDocumentRefView struct {
	FieldId              string   `json:"fileId"`
	Slug                 string   `json:"slug"`
	Type                 string   `json:"type"`
	Format               string   `json:"format"`
	Title                string   `json:"title,omitempty"`
	Labels               []string `json:"labels,omitempty"`
	Description          string   `json:"description,omitempty"`
	Version              string   `json:"version,omitempty"`
	Filename             string   `json:"filename"`
	PackageRef           string   `json:"packageRef"`
	IncludedOperationIds []string `json:"includedOperationIds"`
}

type DocumentsForTransformationView struct {
	Documents []DocumentForTransformationView `json:"documents"`
}

type DocumentForTransformationView struct {
	FieldId              string   `json:"fileId"`
	Slug                 string   `json:"slug"`
	Type                 string   `json:"type"`
	Format               string   `json:"format"`
	Title                string   `json:"title,omitempty"`
	Labels               []string `json:"labels,omitempty"`
	Description          string   `json:"description,omitempty"`
	Version              string   `json:"version,omitempty"`
	Filename             string   `json:"filename"`
	IncludedOperationIds []string `json:"includedOperationIds"`
	Data                 []byte   `json:"data"`
}

type Openapi struct {
	Operations  []OpenapiOperation `json:"operations,omitempty"`
	Description string             `json:"description,omitempty"`
	Version     string             `json:"version,omitempty"`
	Title       string             `json:"title"`
}

type OpenapiOperation struct {
	Path   string   `json:"path"`
	Method string   `json:"method"`
	Tile   string   `json:"tile"`
	Tags   []string `json:"tags"`
}

type Asyncapi struct {
	Operations  []AsyncapiOperation `json:"operations,omitempty"`
	Description string              `json:"description,omitempty"`
	Version     string              `json:"version,omitempty"`
	Title       string              `json:"title"`
}

type AsyncapiOperation struct {
	Channel string   `json:"channel"`
	Method  string   `json:"method"`
	Tags    []string `json:"tags"`
}
