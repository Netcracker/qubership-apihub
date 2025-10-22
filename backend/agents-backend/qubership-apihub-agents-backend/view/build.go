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

const BuildType string = "build"

type BuildConfig struct {
	PackageId                string                 `json:"packageId"`
	Version                  string                 `json:"version"`
	PreviousVersion          string                 `json:"previousVersion,omitempty"`
	PreviousVersionPackageId string                 `json:"previousVersionPackageId,omitempty"`
	Status                   string                 `json:"status"`
	VersionFolder            string                 `json:"versionFolder"`
	Refs                     []BCRef                `json:"refs"`
	Files                    []BCFile               `json:"files"`
	PublishId                string                 `json:"publishId"`
	ServiceId                string                 `json:"serviceId"`
	ApihubPackageUrl         string                 `json:"apihubPackageUrl"` // Required for FE only in case of promote
	CreatedBy                string                 `json:"createdBy"`
	Metadata                 map[string]interface{} `json:"metadata"`
	ServiceName              string                 `json:"serviceName,omitempty"`
	BuildType                string                 `json:"buildType"`
	ExternalMetadata         map[string]interface{} `json:"externalMetadata"`
}

type BCRef struct {
	RefId   string `json:"refId"`
	Version string `json:"version"`
}

type BCFile struct {
	FileId   string   `json:"fileId"`
	Publish  bool     `json:"publish"`
	Labels   []string `json:"labels"`
	XApiKind string   `json:"xApiKind,omitempty"`
}

type GroupBuildConfig struct {
	PackageId string `json:"packageId"`
	PublishId string `json:"publishId"`
}

type PublishId struct {
	PublishId string `json:"publishId"`
}

type PublishStatusResponse struct {
	PublishId string `json:"publishId"`
	Status    string `json:"status"`
	Message   string `json:"message"`
}
