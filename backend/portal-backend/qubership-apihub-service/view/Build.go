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

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
)

type BuildConfig struct {
	PackageId                string                 `json:"packageId"`
	Version                  string                 `json:"version"`
	BuildType                string                 `json:"buildType"`
	PreviousVersion          string                 `json:"previousVersion"`
	PreviousVersionPackageId string                 `json:"previousVersionPackageId"`
	Status                   string                 `json:"status"`
	Refs                     []BCRef                `json:"refs,omitempty"`
	Files                    []BCFile               `json:"files,omitempty"`
	PublishId                string                 `json:"publishId"`
	Metadata                 BuildConfigMetadata    `json:"metadata,omitempty"`
	CreatedBy                string                 `json:"createdBy"`
	NoChangelog              bool                   `json:"noChangeLog,omitempty"`    // for migration
	PublishedAt              time.Time              `json:"publishedAt,omitempty"`    // for migration
	MigrationBuild           bool                   `json:"migrationBuild,omitempty"` //for migration
	MigrationId              string                 `json:"migrationId,omitempty"`    //for migration
	ComparisonRevision       int                    `json:"comparisonRevision,omitempty"`
	ComparisonPrevRevision   int                    `json:"comparisonPrevRevision,omitempty"`
	UnresolvedRefs           bool                   `json:"unresolvedRefs,omitempty"`
	ResolveRefs              bool                   `json:"resolveRefs,omitempty"`
	ResolveConflicts         bool                   `json:"resolveConflicts,omitempty"`
	ServiceName              string                 `json:"serviceName,omitempty"`
	ApiType                  string                 `json:"apiType,omitempty"`   //for operation group
	GroupName                string                 `json:"groupName,omitempty"` //for operation group
	Format                   string                 `json:"format,omitempty"`    //for operation group
	ExternalMetadata         map[string]interface{} `json:"externalMetadata,omitempty"`
}

type BuildConfigMetadata struct {
	BranchName    string   `json:"branchName,omitempty"`
	RepositoryUrl string   `json:"repositoryUrl,omitempty"`
	CloudName     string   `json:"cloudName,omitempty"`
	CloudUrl      string   `json:"cloudUrl,omitempty"`
	Namespace     string   `json:"namespace,omitempty"`
	VersionLabels []string `json:"versionLabels,omitempty"`
}

type BCRef struct {
	RefId         string `json:"refId"`
	Version       string `json:"version"` //format: version@revision
	ParentRefId   string `json:"parentRefId"`
	ParentVersion string `json:"parentVersion"` //format: version@revision
	Excluded      bool   `json:"excluded,omitempty"`
}

type BCFile struct {
	FileId   string   `json:"fileId"`
	Slug     string   `json:"slug"`  //for migration
	Index    int      `json:"index"` //for migration
	Publish  *bool    `json:"publish"`
	Labels   []string `json:"labels"`
	BlobId   string   `json:"blobId,omitempty"`
	XApiKind string   `json:"xApiKind,omitempty"`
}

type BuildStatusEnum string

const StatusNotStarted BuildStatusEnum = "none"
const StatusRunning BuildStatusEnum = "running"
const StatusComplete BuildStatusEnum = "complete"
const StatusError BuildStatusEnum = "error"

// todo string -> BuildType type
const ChangelogType string = "changelog"
const BuildType string = "build"
const DocumentGroupType_deprecated string = "documentGroup"
const ReducedSourceSpecificationsType string = "reducedSourceSpecifications"
const MergedSpecificationType string = "mergedSpecification"

func ValidateGroupBuildType(buildType string) error {
	switch buildType {
	case ReducedSourceSpecificationsType, MergedSpecificationType:
		return nil
	}
	return &exception.CustomError{
		Status:  http.StatusBadRequest,
		Code:    exception.InvalidParameterValue,
		Message: exception.InvalidParameterValueMsg,
		Params:  map[string]interface{}{"param": "buildType", "value": buildType},
	}
}

func BuildStatusFromString(str string) (BuildStatusEnum, error) {
	switch str {
	case "none":
		return StatusNotStarted, nil
	case "running":
		return StatusRunning, nil
	case "complete":
		return StatusComplete, nil
	case "error":
		return StatusError, nil
	}
	return StatusNotStarted, fmt.Errorf("unknown build status: %s", str)
}

func BuildConfigToMap(bc BuildConfig) (*map[string]interface{}, error) {
	var confAsMap map[string]interface{}
	cBytes, err := json.Marshal(bc)
	if err != nil {
		return nil, err
	}
	err = json.Unmarshal(cBytes, &confAsMap)
	if err != nil {
		return nil, err
	}
	return &confAsMap, nil
}

func BuildConfigFromMap(confAsMap map[string]interface{}, publishId string) (*BuildConfig, error) {
	var bc BuildConfig
	cBytes, err := json.Marshal(confAsMap)
	if err != nil {
		return nil, err
	}
	err = json.Unmarshal(cBytes, &bc)
	if err != nil {
		return nil, err
	}
	bc.PublishId = publishId
	return &bc, nil
}

func BcRefsToRefs(refs []BCRef) []Ref {
	var result []Ref
	for _, ref := range refs {
		result = append(result, BCRefToRef(ref))
	}
	return result
}

func BCRefToRef(r BCRef) Ref {
	return Ref{
		RefPackageId:      r.RefId,
		RefPackageName:    "",
		RefPackageVersion: r.Version,
		Status:            "",
		VersionStatus:     "",
		Kind:              "",
	}
}

type PublishStatusResponse struct {
	PublishId string `json:"publishId"`
	Status    string `json:"status"`
	Message   string `json:"message"`
}

func IsBuildFinished(status BuildStatusEnum) bool {
	if status == StatusComplete || status == StatusError {
		return true
	}
	return false
}

type BuildsStatusRequest struct {
	PublishIds []string `json:"publishIds"`
}

type ChangelogBuildSearchRequest struct {
	PackageId                string `json:"packageId"`
	Version                  string `json:"version"`
	PreviousVersionPackageId string `json:"previousVersionPackageId"`
	PreviousVersion          string `json:"previousVersion"`
	BuildType                string `json:"buildType"`
	ComparisonRevision       int    `json:"comparisonRevision"`
	ComparisonPrevRevision   int    `json:"comparisonPrevRevision"`
}

type DocumentGroupBuildSearchRequest struct {
	PackageId string `json:"packageId"`
	Version   string `json:"version"`
	BuildType string `json:"buildType"`
	Format    string `json:"format"`
	ApiType   string `json:"apiType"`
	GroupName string `json:"groupName"`
}

type BuildView struct {
	BuildId      string    `json:"buildId,omitempty"`
	Status       string    `json:"status"`
	Details      string    `json:"details"`
	PackageId    string    `json:"packageId"`
	Version      string    `json:"version"`
	CreatedAt    time.Time `json:"createdAt"`
	LastActive   time.Time `json:"lastActive"`
	CreatedBy    string    `json:"createdBy,omitempty"`
	RestartCount int       `json:"restart_count"`
}

type PublishedVersionSourceDataConfig struct {
	Sources []byte      `json:"sources"`
	Config  BuildConfig `json:"config"`
}

type ChangelogBuildConfigView struct {
	PackageId                string `json:"packageId"`
	Version                  string `json:"version"`
	BuildType                string `json:"buildType"`
	PreviousVersion          string `json:"previousVersion"`
	PreviousVersionPackageId string `json:"previousVersionPackageId"`
	CreatedBy                string `json:"createdBy"`
	BuildId                  string `json:"buildId"`
}

type DocumentTransformConfigView struct {
	PackageId string `json:"packageId"`
	Version   string `json:"version"`
	BuildType string `json:"buildType"`
	Format    string `json:"format,omitempty"`
	ApiType   string `json:"apiType"`
	GroupName string `json:"groupName"`
	CreatedBy string `json:"createdBy"`
	BuildId   string `json:"buildId"`
}
