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

import "time"

const SearchLevelOperations = "operations"
const SearchLevelPackages = "packages"
const SearchLevelDocuments = "documents"

const ScopeAll = "all"

const RestScopeRequest = "request"
const RestScopeResponse = "response"
const RestScopeAnnotation = "annotation"
const RestScopeExamples = "examples"
const RestScopeProperties = "properties"

const GraphqlScopeAnnotation = "annotation"
const GraphqlScopeArgument = "argument"
const GraphqlScopeProperty = "property"

func ValidRestOperationScope(scope string) bool {
	switch scope {
	case ScopeAll, RestScopeRequest, RestScopeResponse, RestScopeAnnotation, RestScopeExamples, RestScopeProperties:
		return true
	}
	return false
}

func ValidGraphqlOperationScope(scope string) bool {
	switch scope {
	case ScopeAll, GraphqlScopeAnnotation, GraphqlScopeArgument, GraphqlScopeProperty:
		return true
	}
	return false
}

type PublicationDateInterval struct {
	// TODO: probably user's timezone is required to handle dated properly
	StartDate time.Time `json:"startDate"`
	EndDate   time.Time `json:"endDate"`
}

type OperationSearchParams struct {
	ApiType        string   `json:"apiType"`
	Scopes         []string `json:"scope"`
	DetailedScopes []string `json:"detailedScope"`
	Methods        []string `json:"methods"`
	OperationTypes []string `json:"operationTypes"`
}

type SearchQueryReq struct {
	SearchString            string                  `json:"searchString" validate:"required"`
	PackageIds              []string                `json:"packageIds"`
	Versions                []string                `json:"versions"`
	Statuses                []string                `json:"statuses"`
	PublicationDateInterval PublicationDateInterval `json:"creationDateInterval"`
	OperationSearchParams   *OperationSearchParams  `json:"operationParams"`
	Limit                   int                     `json:"-"`
	Page                    int                     `json:"-"`
}

// deprecated
type SearchResult_deprecated struct {
	Operations *[]OperationSearchResult_deprecated `json:"operations,omitempty"`
	Packages   *[]PackageSearchResult              `json:"packages,omitempty"`
	Documents  *[]DocumentSearchResult             `json:"documents,omitempty"`
}

type SearchResult struct {
	Operations *[]interface{}          `json:"operations,omitempty"`
	Packages   *[]PackageSearchResult  `json:"packages,omitempty"`
	Documents  *[]DocumentSearchResult `json:"documents,omitempty"`
}

type OperationSearchWeightsDebug struct {
	ScopeWeight              float64 `json:"scopeWeight"`
	ScopeTf                  float64 `json:"scopeTf"`
	TitleTf                  float64 `json:"titleTf"`
	VersionStatusTf          float64 `json:"versionStatusTf"`
	OperationOpenCountWeight float64 `json:"operationOpenCountWeight"`
	OperationOpenCount       float64 `json:"operationOpenCount"`
}

// deprecated
type OperationSearchResult_deprecated struct {
	PackageId      string      `json:"packageId"`
	PackageName    string      `json:"name"`
	ParentPackages []string    `json:"parentPackages"`
	Version        string      `json:"version"`
	VersionStatus  string      `json:"status"`
	OperationId    string      `json:"operationId"`
	Title          string      `json:"title"`
	Deprecated     bool        `json:"deprecated,omitempty"`
	ApiType        string      `json:"apiType"`
	Metadata       interface{} `json:"metadata"`

	//debug
	Debug OperationSearchWeightsDebug `json:"debug,omitempty"`
}

type CommonOperationSearchResult struct {
	PackageId      string   `json:"packageId"`
	PackageName    string   `json:"name"`
	ParentPackages []string `json:"parentPackages"`
	VersionStatus  string   `json:"status"`
	Version        string   `json:"version"`
	Title          string   `json:"title"`

	//debug
	Debug OperationSearchWeightsDebug `json:"debug,omitempty"`
}

type RestOperationSearchResult struct {
	RestOperationView
	CommonOperationSearchResult
}

type GraphQLOperationSearchResult struct {
	GraphQLOperationView
	CommonOperationSearchResult
}

type PackageSearchWeightsDebug struct {
	PackageIdTf            float64 `json:"packageIdTf"`
	PackageNameTf          float64 `json:"packageNameTf"`
	PackageDescriptionTf   float64 `json:"packageDescriptionTf"`
	PackageServiceNameTf   float64 `json:"packageServiceNameTf"`
	VersionTf              float64 `json:"versionTf"`
	VersionLabelsTf        float64 `json:"versionLabelsTf"`
	DefaultVersionTf       float64 `json:"defaultVersionTf"`
	VersionStatusTf        float64 `json:"versionStatusTf"`
	VersionOpenCountWeight float64 `json:"versionOpenCountWeight"`
	VersionOpenCount       float64 `json:"versionOpenCount"`
}

type PackageSearchResult struct {
	PackageId      string    `json:"packageId"`
	PackageName    string    `json:"name"`
	Description    string    `json:"description,omitempty"`
	ServiceName    string    `json:"serviceName,omitempty"`
	ParentPackages []string  `json:"parentPackages"`
	Version        string    `json:"version"`
	VersionStatus  string    `json:"status"`
	CreatedAt      time.Time `json:"createdAt"`
	Labels         []string  `json:"labels,omitempty"`
	LatestRevision bool      `json:"latestRevision,omitempty"`

	//debug
	Debug PackageSearchWeightsDebug `json:"debug,omitempty"`
}

type DocumentSearchWeightsDebug struct {
	TitleTf                 float64 `json:"titleTf"`
	LabelsTf                float64 `json:"labelsTf"`
	ContentTf               float64 `json:"contentTf"`
	VersionStatusTf         float64 `json:"versionStatusTf"`
	DocumentOpenCountWeight float64 `json:"documentOpenCountWeight"`
	DocumentOpenCount       float64 `json:"documentOpenCount"`
}

type DocumentSearchResult struct {
	PackageId      string    `json:"packageId"`
	PackageName    string    `json:"name"`
	ParentPackages []string  `json:"parentPackages"`
	Version        string    `json:"version"`
	VersionStatus  string    `json:"status"`
	CreatedAt      time.Time `json:"createdAt"`
	Slug           string    `json:"slug"`
	Type           string    `json:"type"`
	Title          string    `json:"title"`
	Labels         []string  `json:"labels,omitempty"`
	Content        string    `json:"content,omitempty"`

	//debug
	Debug DocumentSearchWeightsDebug `json:"debug,omitempty"`
}
