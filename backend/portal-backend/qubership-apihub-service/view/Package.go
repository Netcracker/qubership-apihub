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
	"fmt"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
)

type SimplePackage struct {
	Id                    string              `json:"packageId"`
	Alias                 string              `json:"alias" validate:"required"`
	ParentId              string              `json:"parentId"`
	Kind                  string              `json:"kind" validate:"required"`
	Name                  string              `json:"name" validate:"required"`
	Description           string              `json:"description"`
	IsFavorite            bool                `json:"isFavorite"`
	ServiceName           string              `json:"serviceName,omitempty"`
	Parents               []ParentPackageInfo `json:"parents"`
	DefaultRole           string              `json:"defaultRole"`
	UserPermissions       []string            `json:"permissions"`
	DeletionDate          *time.Time          `json:"-"`
	DeletedBy             string              `json:"-"`
	CreatedBy             string              `json:"-"`
	CreatedAt             time.Time           `json:"-"`
	DefaultReleaseVersion string              `json:"defaultReleaseVersion"`
	DefaultVersion        string              `json:"defaultVersion"`
	ReleaseVersionPattern string              `json:"releaseVersionPattern"`
	ExcludeFromSearch     *bool               `json:"excludeFromSearch,omitempty"`
	RestGroupingPrefix    string              `json:"restGroupingPrefix,omitempty"`
}

type Packages struct {
	Packages []PackagesInfo `json:"packages"`
}

type PackagesInfo struct {
	Id                        string              `json:"packageId"`
	Alias                     string              `json:"alias"`
	ParentId                  string              `json:"parentId"`
	Kind                      string              `json:"kind"`
	Name                      string              `json:"name"`
	Description               string              `json:"description"`
	IsFavorite                bool                `json:"isFavorite,omitempty"`
	ServiceName               string              `json:"serviceName,omitempty"`
	Parents                   []ParentPackageInfo `json:"parents"`
	DefaultRole               string              `json:"defaultRole"`
	UserPermissions           []string            `json:"permissions,omitempty"`
	LastReleaseVersionDetails *VersionDetails     `json:"lastReleaseVersionDetails,omitempty"`
	RestGroupingPrefix        string              `json:"restGroupingPrefix,omitempty"`
	ReleaseVersionPattern     string              `json:"releaseVersionPattern,omitempty"`
	CreatedAt                 time.Time           `json:"createdAt,omitempty"`
	DeletedAt                 *time.Time          `json:"deletedAt,omitempty"`
}

type PackagesMCP struct {
	Packages []PackagesInfoMCP `json:"packages"`
}

type PackagesInfoMCP struct {
	Id                        string              `json:"packageId"`
	Alias                     string              `json:"alias"`
	ParentId                  string              `json:"parentId"`
	Kind                      string              `json:"kind"`
	Name                      string              `json:"name"`
	Description               string              `json:"description"`
	ServiceName               string              `json:"serviceName,omitempty"`
	Parents                   []ParentPackageInfo `json:"parents"`
	LastReleaseVersionDetails *VersionDetails     `json:"lastReleaseVersionDetails,omitempty"`
	RestGroupingPrefix        string              `json:"restGroupingPrefix,omitempty"`
}

type ParentPackageInfo struct {
	Id                string `json:"packageId"`
	Alias             string `json:"alias"`
	ParentId          string `json:"parentId"`
	Kind              string `json:"kind"`
	Name              string `json:"name"`
	HasReadPermission *bool  `json:"hasReadPermission,omitempty"`
}

type VersionDetails struct {
	Version           string         `json:"version"`
	NotLatestRevision bool           `json:"notLatestRevision,omitempty"`
	Summary           *ChangeSummary `json:"summary,omitempty"`
}
type PackageListReq struct {
	Kind                      []string
	Limit                     int
	OnlyFavorite              bool
	OnlyShared                bool
	Offset                    int
	ParentId                  string
	ShowParents               bool
	TextFilter                string
	LastReleaseVersionDetails bool
	ServiceName               string
	ShowAllDescendants        bool
	Ids                       []string
}

type PatchPackageReq struct {
	Name                  *string `json:"name"`
	Description           *string `json:"description"`
	ServiceName           *string `json:"serviceName"`
	DefaultRole           *string `json:"defaultRole"`
	DefaultReleaseVersion *string `json:"defaultReleaseVersion"`
	ReleaseVersionPattern *string `json:"releaseVersionPattern"`
	ExcludeFromSearch     *bool   `json:"excludeFromSearch"`
	RestGroupingPrefix    *string `json:"restGroupingPrefix"`
}

// build result
type PackageInfoFile struct {
	PackageId                string                 `json:"packageId" validate:"required"`
	Kind                     string                 `json:"-"`
	BuildType                BuildType              `json:"buildType"`
	Version                  string                 `json:"version" validate:"required"`
	Status                   string                 `json:"status" validate:"required"`
	PreviousVersion          string                 `json:"previousVersion"`
	PreviousVersionPackageId string                 `json:"previousVersionPackageId"`
	Metadata                 map[string]interface{} `json:"metadata"`
	Refs                     []BCRef                `json:"refs"`
	Revision                 int                    `json:"-"`
	PreviousVersionRevision  int                    `json:"-"`
	CreatedBy                string                 `json:"createdBy"`
	BuilderVersion           string                 `json:"builderVersion"`
	PublishedAt              *time.Time             `json:"publishedAt"`           //for migration
	MigrationBuild           bool                   `json:"migrationBuild"`        //for migration
	MigrationId              string                 `json:"migrationId"`           //for migration
	NoChangelog              bool                   `json:"noChangeLog,omitempty"` //for migration
	ApiType                  string                 `json:"apiType"`
	GroupName                string                 `json:"groupName"`
	Format                   string                 `json:"format"`
	ExternalMetadata         *ExternalMetadata      `json:"externalMetadata,omitempty"`
}

type ChangelogInfoFile struct {
	BuildType                BuildType              `json:"buildType"`
	PackageId                string                 `json:"packageId" validate:"required"`
	Version                  string                 `json:"version" validate:"required"`
	PreviousVersionPackageId string                 `json:"previousVersionPackageId" validate:"required"`
	PreviousVersion          string                 `json:"previousVersion" validate:"required"`
	Metadata                 map[string]interface{} `json:"metadata"`
	Revision                 int                    `json:"revision"`
	PreviousVersionRevision  int                    `json:"previousVersionRevision"`
	CreatedBy                string                 `json:"createdBy"`
	BuilderVersion           string                 `json:"builderVersion"`
	PublishedAt              *time.Time             `json:"publishedAt"` //for migration
}

func MakeChangelogInfoFileView(packageInfo PackageInfoFile) ChangelogInfoFile {
	return ChangelogInfoFile{
		BuildType:                packageInfo.BuildType,
		PackageId:                packageInfo.PackageId,
		Version:                  packageInfo.Version,
		PreviousVersionPackageId: packageInfo.PreviousVersionPackageId,
		PreviousVersion:          packageInfo.PreviousVersion,
		Metadata:                 packageInfo.Metadata,
		Revision:                 packageInfo.Revision,
		PreviousVersionRevision:  packageInfo.PreviousVersionRevision,
		CreatedBy:                packageInfo.CreatedBy,
		BuilderVersion:           packageInfo.BuilderVersion,
		PublishedAt:              packageInfo.PublishedAt,
	}
}

type PackageOperationsFile struct {
	Operations []Operation `json:"operations" validate:"dive,required"`
}

type PackageDocumentsFile struct {
	Documents []PackageDocument `json:"documents" validate:"dive,required"`
}

type PackageOperationChanges struct {
	OperationComparisons []OperationComparison `json:"operations" validate:"dive,required"`
}

type PackageComparisonsFile struct {
	Comparisons []VersionComparison `json:"comparisons" validate:"dive,required"`
}

type VersionComparison struct {
	PackageId                string          `json:"packageId"`
	Version                  string          `json:"version"`
	Revision                 int             `json:"revision"`
	PreviousVersionPackageId string          `json:"previousVersionPackageId"`
	PreviousVersion          string          `json:"previousVersion"`
	PreviousVersionRevision  int             `json:"previousVersionRevision"`
	OperationTypes           []OperationType `json:"operationTypes" validate:"required,dive,required"`
	FromCache                bool            `json:"fromCache"`
	ComparisonFileId         string          `json:"comparisonFileId"`
}

type ComparisonKey struct {
	PackageId                string
	Version                  string
	Revision                 int
	PreviousVersionPackageId string
	PreviousVersion          string
	PreviousVersionRevision  int
}

func MakeVersionComparisonId(packageId string, version string, revision int, previousVersionPackageId string, previousVersion string, previousVersionRevision int) string {
	uniqueString := fmt.Sprintf("%v@%v@%v@%v@%v@%v", packageId, version, revision, previousVersionPackageId, previousVersion, previousVersionRevision)
	return utils.GetEncodedChecksum([]byte(uniqueString))
}

type OperationType struct {
	ApiType                    string                  `json:"apiType" validate:"required"`
	ChangesSummary             ChangeSummary           `json:"changesSummary" validate:"required"`
	NumberOfImpactedOperations ChangeSummary           `json:"numberOfImpactedOperations"`
	ApiAudienceTransitions     []ApiAudienceTransition `json:"apiAudienceTransitions,omitempty"`
	Tags                       []string                `json:"tags"`
}

type ApiAudienceTransition struct {
	CurrentAudience  string `json:"currentAudience"`
	PreviousAudience string `json:"previousAudience"`
	OperationsCount  int    `json:"operationsCount"`
}

type BuilderNotificationsFile struct {
	Notifications []BuilderNotification `json:"notifications" validate:"dive,required"`
}

type PackageDocument struct {
	FileId       string                 `json:"fileId" validate:"required"`
	Type         string                 `json:"type" validate:"required"`
	Slug         string                 `json:"slug" validate:"required"`
	Title        string                 `json:"title" validate:"required"`
	Description  string                 `json:"description"`
	Version      string                 `json:"version"`
	OperationIds []string               `json:"operationIds" validate:"required"`
	Metadata     map[string]interface{} `json:"metadata"`
	Filename     string                 `json:"filename" validate:"required"`
	Format       string                 `json:"format"`
}

type BuilderNotification struct {
	Severity int    `json:"severity"`
	Message  string `json:"message"`
	FileId   string `json:"fileId"`
}

const PackageGroupingPrefixWildcard = "{group}"

func regexpEscaped(s string) string {
	reservedChars := `\!$()*+.:<=>?[]^{|}-`
	escapeChar := `\`
	for _, c := range reservedChars {
		s = strings.ReplaceAll(s, string(c), escapeChar+string(c))
	}
	return s
}

func MakePackageGroupingPrefixRegex(groupingPrefix string) string {
	groupingPrefix = regexpEscaped(groupingPrefix)
	groupingPrefix = strings.Replace(groupingPrefix, regexpEscaped(PackageGroupingPrefixWildcard), `(.*?)`, 1)
	groupingPrefix = "^" + groupingPrefix
	return groupingPrefix
}

func MakePackageRefKey(packageId string, version string, revision int) string {
	if packageId == "" || version == "" || revision == 0 {
		return ""
	}
	return fmt.Sprintf("%v@%v@%v", packageId, version, revision)
}

func MakeVersionRefKey(version string, revision int) string {
	if version == "" || revision == 0 {
		return ""
	}
	return fmt.Sprintf("%v@%v", version, revision)
}

func MakePackageVersionRefKey(packageId string, version string) string {
	if packageId == "" || version == "" {
		return ""
	}
	return fmt.Sprintf("%v@%v", packageId, version)
}
