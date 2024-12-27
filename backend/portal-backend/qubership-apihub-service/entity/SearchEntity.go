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

package entity

import (
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type VersionStatusSearchWeight struct {
	VersionReleaseStatus        string  `pg:"version_status_release, type:varchar, use_zero"`
	VersionReleaseStatusWeight  float64 `pg:"version_status_release_weight, type:real, use_zero"`
	VersionDraftStatus          string  `pg:"version_status_draft, type:varchar, use_zero"`
	VersionDraftStatusWeight    float64 `pg:"version_status_draft_weight, type:real, use_zero"`
	VersionArchivedStatus       string  `pg:"version_status_archived, type:varchar, use_zero"`
	VersionArchivedStatusWeight float64 `pg:"version_status_archived_weight, type:real, use_zero"`
}

type OperationSearchWeight struct {
	ScopeWeight     float64 `pg:"scope_weight, type:real, use_zero"`
	TitleWeight     float64 `pg:"title_weight, type:real, use_zero"`
	OpenCountWeight float64 `pg:"open_count_weight, type:real, use_zero"`
}

type OperationSearchScopeFilter struct {
	FilterAll bool `pg:"filter_all, type:boolean, use_zero"`

	FilterRequest    bool `pg:"filter_request, type:boolean, use_zero"`
	FilterResponse   bool `pg:"filter_response, type:boolean, use_zero"`
	FilterAnnotation bool `pg:"filter_annotation, type:boolean, use_zero"`
	FilterExamples   bool `pg:"filter_examples, type:boolean, use_zero"`
	FilterProperties bool `pg:"filter_properties, type:boolean, use_zero"`
	FilterProperty   bool `pg:"filter_property, type:boolean, use_zero"`
	FilterArgument   bool `pg:"filter_argument, type:boolean, use_zero"`
}

type OperationSearchQuery struct {
	OperationSearchScopeFilter
	OperationSearchWeight
	VersionStatusSearchWeight
	SearchString   string    `pg:"search_filter, type:varchar, use_zero"` //for postgres FTS
	TextFilter     string    `pg:"text_filter, type:varchar, use_zero"`   //for varchar
	ApiType        string    `pg:"api_type, type:varchar, use_zero"`
	Packages       []string  `pg:"packages, type:varchar[], use_zero"`
	Versions       []string  `pg:"versions, type:varchar[], use_zero"`
	Statuses       []string  `pg:"statuses, type:varchar[], use_zero"`
	Methods        []string  `pg:"methods, type:varchar[], use_zero"`
	OperationTypes []string  `pg:"operation_types, type:varchar[], use_zero"`
	StartDate      time.Time `pg:"start_date, type:timestamp without time zone, use_zero"`
	EndDate        time.Time `pg:"end_date, type:timestamp without time zone, use_zero"`
	Limit          int       `pg:"limit, type:integer, use_zero"`
	Offset         int       `pg:"offset, type:integer, use_zero"`

	RestApiType    string `pg:"rest_api_type, type:varchar, use_zero"`
	GraphqlApiType string `pg:"graphql_api_type, type:varchar, use_zero"`
}

// deprecated
type OperationSearchResult_deprecated struct {
	tableName struct{} `pg:",discard_unknown_columns"`

	PackageId     string   `pg:"package_id, type:varchar"`
	PackageName   string   `pg:"name, type:varchar"`
	Version       string   `pg:"version, type:varchar"`
	Revision      int      `pg:"revision type:integer"`
	VersionStatus string   `pg:"status, type:varchar"`
	OperationId   string   `pg:"operation_id, type:varchar"`
	Title         string   `pg:"title, type:varchar"`
	Deprecated    bool     `pg:"deprecated, type:boolean"`
	ApiType       string   `pg:"api_type, type:varchar"`
	Metadata      Metadata `pg:"metadata, type:jsonb"`
	ParentNames   []string `pg:"parent_names, type:varchar[]"`

	//debug
	ScopeWeight        float64 `pg:"scope_weight, type:real"`
	ScopeTf            float64 `pg:"scope_tf, type:real"`
	TitleTf            float64 `pg:"title_tf, type:real"`
	VersionStatusTf    float64 `pg:"version_status_tf, type:real"`
	OpenCountWeight    float64 `pg:"open_count_weight, type:real"`
	OperationOpenCount float64 `pg:"operation_open_count, type:real"`
}

type OperationSearchResult struct {
	tableName struct{} `pg:",discard_unknown_columns"`

	OperationEntity
	PackageName   string   `pg:"name, type:varchar"`
	VersionStatus string   `pg:"status, type:varchar"`
	ParentNames   []string `pg:"parent_names, type:varchar[]"`

	//debug
	ScopeWeight        float64 `pg:"scope_weight, type:real"`
	ScopeTf            float64 `pg:"scope_tf, type:real"`
	TitleTf            float64 `pg:"title_tf, type:real"`
	VersionStatusTf    float64 `pg:"version_status_tf, type:real"`
	OpenCountWeight    float64 `pg:"open_count_weight, type:real"`
	OperationOpenCount float64 `pg:"operation_open_count, type:real"`
}

func MakeOperationSearchQueryEntity(searchQuery *view.SearchQueryReq) (*OperationSearchQuery, error) {

	//todo probably need to replace more symbols
	ftsSearchString := searchQuery.SearchString
	ftsSearchString = strings.ReplaceAll(ftsSearchString, " ", " & ")
	ftsSearchString = strings.ReplaceAll(ftsSearchString, "/", " & ")
	ftsSearchString = strings.ReplaceAll(ftsSearchString, "_", " & ")
	ftsSearchString = strings.ReplaceAll(ftsSearchString, "-", " & ")
	ftsSearchString = strings.TrimSpace(ftsSearchString)
	ftsSearchString = strings.Trim(ftsSearchString, "&")
	ftsSearchString = strings.Trim(ftsSearchString, "|")
	ftsSearchString = strings.ReplaceAll(ftsSearchString, ":*", "")
	ftsSearchString = strings.TrimSpace(ftsSearchString) + ":*" //starts with

	searchQueryEntity := &OperationSearchQuery{
		SearchString:   ftsSearchString,
		TextFilter:     searchQuery.SearchString,
		Packages:       searchQuery.PackageIds,
		Versions:       searchQuery.Versions,
		Statuses:       searchQuery.Statuses,
		StartDate:      searchQuery.PublicationDateInterval.StartDate,
		EndDate:        searchQuery.PublicationDateInterval.EndDate,
		Methods:        make([]string, 0),
		OperationTypes: make([]string, 0),
		Limit:          searchQuery.Limit,
		Offset:         searchQuery.Limit * searchQuery.Page,
		RestApiType:    string(view.RestApiType),
		GraphqlApiType: string(view.GraphqlApiType),
	}
	if searchQueryEntity.Packages == nil {
		searchQueryEntity.Packages = make([]string, 0)
	}
	if searchQueryEntity.Versions == nil {
		searchQueryEntity.Versions = make([]string, 0)
	}
	if searchQueryEntity.Statuses == nil {
		searchQueryEntity.Statuses = make([]string, 0)
	}
	if searchQueryEntity.StartDate.IsZero() {
		searchQueryEntity.StartDate = time.Unix(0, 0) //January 1, 1970
	}
	if searchQueryEntity.EndDate.IsZero() {
		searchQueryEntity.EndDate = time.Unix(2556057600, 0) //December 31, 2050
	}
	return searchQueryEntity, nil
}

// depreacted
func MakeOperationSearchResultView_deprecated(ent OperationSearchResult_deprecated) view.OperationSearchResult_deprecated {
	operationSearchResult := view.OperationSearchResult_deprecated{
		PackageId:      ent.PackageId,
		PackageName:    ent.PackageName,
		ParentPackages: ent.ParentNames,
		Version:        view.MakeVersionRefKey(ent.Version, ent.Revision),
		VersionStatus:  ent.VersionStatus,
		OperationId:    ent.OperationId,
		Title:          ent.Title,
		Deprecated:     ent.Deprecated,
		ApiType:        ent.ApiType,

		//debug
		Debug: view.OperationSearchWeightsDebug{
			ScopeWeight:              ent.ScopeWeight,
			ScopeTf:                  ent.ScopeTf,
			TitleTf:                  ent.TitleTf,
			VersionStatusTf:          ent.VersionStatusTf,
			OperationOpenCountWeight: ent.OpenCountWeight,
			OperationOpenCount:       ent.OperationOpenCount,
		},
	}

	switch operationSearchResult.ApiType {
	case string(view.RestApiType):
		restOperationChange := view.RestOperationChange{
			Path:   ent.Metadata.GetPath(),
			Method: ent.Metadata.GetMethod(),
		}
		operationSearchResult.Metadata = restOperationChange
	case string(view.GraphqlApiType):
		graphQLOperationMetadata := view.GraphQLOperationMetadata{
			Type:   ent.Metadata.GetType(),
			Method: ent.Metadata.GetMethod(),
		}
		operationSearchResult.Metadata = graphQLOperationMetadata
	}
	return operationSearchResult
}

func MakeOperationSearchResultView(ent OperationSearchResult) interface{} {
	operationSearchResult := view.CommonOperationSearchResult{
		PackageId:      ent.PackageId,
		PackageName:    ent.PackageName,
		ParentPackages: ent.ParentNames,
		VersionStatus:  ent.VersionStatus,
		Version:        view.MakeVersionRefKey(ent.Version, ent.Revision),
		Title:          ent.Title,

		//debug
		Debug: view.OperationSearchWeightsDebug{
			ScopeWeight:              ent.ScopeWeight,
			ScopeTf:                  ent.ScopeTf,
			TitleTf:                  ent.TitleTf,
			VersionStatusTf:          ent.VersionStatusTf,
			OperationOpenCountWeight: ent.OpenCountWeight,
			OperationOpenCount:       ent.OperationOpenCount,
		},
	}

	switch ent.Type {
	case string(view.RestApiType):
		return view.RestOperationSearchResult{
			CommonOperationSearchResult: operationSearchResult,
			RestOperationView:           MakeRestOperationView(&ent.OperationEntity),
		}
	case string(view.GraphqlApiType):
		return view.GraphQLOperationSearchResult{
			CommonOperationSearchResult: operationSearchResult,
			GraphQLOperationView:        MakeGraphQLOperationView(&ent.OperationEntity),
		}
	}
	return operationSearchResult
}

type PackageSearchWeight struct {
	PackageNameWeight        float64 `pg:"pkg_name_weight, type:real, use_zero"`
	PackageDescriptionWeight float64 `pg:"pkg_description_weight, type:real, use_zero"`
	PackageIdWeight          float64 `pg:"pkg_id_weight, type:real, use_zero"`
	PackageServiceNameWeight float64 `pg:"pkg_service_name_weight, type:real, use_zero"`
	VersionWeight            float64 `pg:"version_weight, type:real, use_zero"`
	VersionLabelWeight       float64 `pg:"version_label_weight, type:real, use_zero"`
	DefaultVersionWeight     float64 `pg:"default_version_weight, type:real, use_zero"`
	OpenCountWeight          float64 `pg:"open_count_weight, type:real, use_zero"`
}

type PackageSearchQuery struct {
	PackageSearchWeight
	VersionStatusSearchWeight
	TextFilter string    `pg:"text_filter, type:varchar, use_zero"` //for varchar
	Packages   []string  `pg:"packages, type:varchar[], use_zero"`
	Versions   []string  `pg:"versions, type:varchar[], use_zero"`
	Statuses   []string  `pg:"statuses, type:varchar[], use_zero"`
	StartDate  time.Time `pg:"start_date, type:timestamp without time zone, use_zero"`
	EndDate    time.Time `pg:"end_date, type:timestamp without time zone, use_zero"`
	Limit      int       `pg:"limit, type:integer, use_zero"`
	Offset     int       `pg:"offset, type:integer, use_zero"`
}

type PackageSearchResult struct {
	tableName struct{} `pg:",discard_unknown_columns"`

	PackageId          string    `pg:"package_id, type:varchar"`
	PackageName        string    `pg:"name, type:varchar"`
	PackageDescription string    `pg:"description, type:varchar"`
	PackageServiceName string    `pg:"service_name, type:varchar"`
	Version            string    `pg:"version, type:varchar"`
	Revision           int       `pg:"revision, type:integer"`
	VersionStatus      string    `pg:"status, type:varchar"`
	CreatedAt          time.Time `pg:"created_at, type:timestamp without time zone"`
	Labels             []string  `pg:"labels, type:varchar[], array"`
	LatestRevision     bool      `pg:"latest_revision, type:boolean"`
	ParentNames        []string  `pg:"parent_names, type:varchar[]"`

	//debug
	PackageIdTf          float64 `pg:"pkg_id_tf, type:real"`
	PackageNameTf        float64 `pg:"pkg_name_tf, type:real"`
	PackageDescriptionTf float64 `pg:"pkg_description_tf, type:real"`
	PackageServiceNameTf float64 `pg:"pkg_service_name_tf, type:real"`
	VersionTf            float64 `pg:"version_tf, type:real"`
	VersionLabelsTf      float64 `pg:"version_labels_tf, type:real"`
	DefaultVersionTf     float64 `pg:"default_version_tf, type:real"`
	VersionStatusTf      float64 `pg:"version_status_tf, type:real"`
	OpenCountWeight      float64 `pg:"open_count_weight, type:real"`
	VersionOpenCount     float64 `pg:"version_open_count, type:real"`
}

func MakePackageSearchQueryEntity(searchQuery *view.SearchQueryReq) (*PackageSearchQuery, error) {
	searchQueryEntity := &PackageSearchQuery{
		TextFilter: searchQuery.SearchString,
		Packages:   searchQuery.PackageIds,
		Versions:   searchQuery.Versions,
		Statuses:   searchQuery.Statuses,
		StartDate:  searchQuery.PublicationDateInterval.StartDate,
		EndDate:    searchQuery.PublicationDateInterval.EndDate,
		Limit:      searchQuery.Limit,
		Offset:     searchQuery.Limit * searchQuery.Page,
	}
	if searchQueryEntity.Packages == nil {
		searchQueryEntity.Packages = make([]string, 0)
	}
	if searchQueryEntity.Versions == nil {
		searchQueryEntity.Versions = make([]string, 0)
	}
	if searchQueryEntity.Statuses == nil {
		searchQueryEntity.Statuses = make([]string, 0)
	}
	if searchQueryEntity.StartDate.IsZero() {
		searchQueryEntity.StartDate = time.Unix(0, 0) //January 1, 1970
	}
	if searchQueryEntity.EndDate.IsZero() {
		searchQueryEntity.EndDate = time.Unix(2556057600, 0) //December 31, 2050
	}
	return searchQueryEntity, nil
}

func MakePackageSearchResultView(ent PackageSearchResult) *view.PackageSearchResult {
	return &view.PackageSearchResult{
		PackageId:      ent.PackageId,
		PackageName:    ent.PackageName,
		Description:    ent.PackageDescription,
		ServiceName:    ent.PackageServiceName,
		ParentPackages: ent.ParentNames,
		Version:        view.MakeVersionRefKey(ent.Version, ent.Revision),
		VersionStatus:  ent.VersionStatus,
		CreatedAt:      ent.CreatedAt,
		Labels:         ent.Labels,
		LatestRevision: ent.LatestRevision,

		//debug
		Debug: view.PackageSearchWeightsDebug{
			PackageIdTf:            ent.PackageIdTf,
			PackageNameTf:          ent.PackageNameTf,
			PackageDescriptionTf:   ent.PackageDescriptionTf,
			PackageServiceNameTf:   ent.PackageServiceNameTf,
			VersionTf:              ent.VersionTf,
			VersionLabelsTf:        ent.VersionLabelsTf,
			DefaultVersionTf:       ent.DefaultVersionTf,
			VersionStatusTf:        ent.VersionStatusTf,
			VersionOpenCountWeight: ent.OpenCountWeight,
			VersionOpenCount:       ent.VersionOpenCount,
		},
	}
}

type DocumentSearchWeight struct {
	TitleWeight     float64 `pg:"title_weight, type:real, use_zero"`
	LabelsWeight    float64 `pg:"labels_weight, type:real, use_zero"`
	ContentWeight   float64 `pg:"content_weight, type:real, use_zero"`
	OpenCountWeight float64 `pg:"open_count_weight, type:real, use_zero"`
}

type DocumentSearchQuery struct {
	DocumentSearchWeight
	VersionStatusSearchWeight
	TextFilter   string    `pg:"text_filter, type:varchar, use_zero"` //for varchar
	Packages     []string  `pg:"packages, type:varchar[], use_zero"`
	Versions     []string  `pg:"versions, type:varchar[], use_zero"`
	Statuses     []string  `pg:"statuses, type:varchar[], use_zero"`
	StartDate    time.Time `pg:"start_date, type:timestamp without time zone, use_zero"`
	EndDate      time.Time `pg:"end_date, type:timestamp without time zone, use_zero"`
	Limit        int       `pg:"limit, type:integer, use_zero"`
	Offset       int       `pg:"offset, type:integer, use_zero"`
	UnknownTypes []string  `pg:"unknown_types, type:varchar[], use_zero"`
}

type DocumentSearchResult struct {
	tableName struct{} `pg:",discard_unknown_columns"`

	PackageId     string    `pg:"package_id, type:varchar"`
	PackageName   string    `pg:"name, type:varchar"`
	Version       string    `pg:"version, type:varchar"`
	Revision      int       `pg:"revision type:integer"`
	VersionStatus string    `pg:"status, type:varchar"`
	CreatedAt     time.Time `pg:"created_at, type:timestamp without time zone"`
	Slug          string    `pg:"slug, type:varchar"`
	Title         string    `pg:"title, type:varchar"`
	Type          string    `pg:"type, type:varchar"`
	Metadata      Metadata  `pg:"metadata, type:jsonb"`
	ParentNames   []string  `pg:"parent_names, type:varchar[]"`

	//debug
	TitleTf           float64 `pg:"title_tf, type:real"`
	LabelsTf          float64 `pg:"labels_tf, type:real"`
	ContentTf         float64 `pg:"content_tf, type:real"`
	VersionStatusTf   float64 `pg:"version_status_tf, type:real"`
	OpenCountWeight   float64 `pg:"open_count_weight, type:real"`
	DocumentOpenCount float64 `pg:"document_open_count, type:real"`
}

func MakeDocumentSearchQueryEntity(searchQuery *view.SearchQueryReq, unknownTypes []string) (*DocumentSearchQuery, error) {
	searchQueryEntity := &DocumentSearchQuery{
		TextFilter:   searchQuery.SearchString,
		Packages:     searchQuery.PackageIds,
		Versions:     searchQuery.Versions,
		Statuses:     searchQuery.Statuses,
		StartDate:    searchQuery.PublicationDateInterval.StartDate,
		EndDate:      searchQuery.PublicationDateInterval.EndDate,
		Limit:        searchQuery.Limit,
		Offset:       searchQuery.Limit * searchQuery.Page,
		UnknownTypes: unknownTypes,
	}
	if searchQueryEntity.Packages == nil {
		searchQueryEntity.Packages = make([]string, 0)
	}
	if searchQueryEntity.Versions == nil {
		searchQueryEntity.Versions = make([]string, 0)
	}
	if searchQueryEntity.Statuses == nil {
		searchQueryEntity.Statuses = make([]string, 0)
	}
	if searchQueryEntity.StartDate.IsZero() {
		searchQueryEntity.StartDate = time.Unix(0, 0) //January 1, 1970
	}
	if searchQueryEntity.EndDate.IsZero() {
		searchQueryEntity.EndDate = time.Unix(2556057600, 0) //December 31, 2050
	}
	return searchQueryEntity, nil
}

func MakeDocumentSearchResultView(ent DocumentSearchResult, content string) *view.DocumentSearchResult {
	return &view.DocumentSearchResult{
		PackageId:      ent.PackageId,
		PackageName:    ent.PackageName,
		ParentPackages: ent.ParentNames,
		Version:        view.MakeVersionRefKey(ent.Version, ent.Revision),
		VersionStatus:  ent.VersionStatus,
		CreatedAt:      ent.CreatedAt,
		Slug:           ent.Slug,
		Type:           ent.Type,
		Title:          ent.Title,
		Content:        content,
		Labels:         ent.Metadata.GetLabels(),
		//debug
		Debug: view.DocumentSearchWeightsDebug{
			TitleTf:                 ent.TitleTf,
			LabelsTf:                ent.LabelsTf,
			ContentTf:               ent.ContentTf,
			VersionStatusTf:         ent.VersionStatusTf,
			DocumentOpenCountWeight: ent.OpenCountWeight,
			DocumentOpenCount:       ent.DocumentOpenCount,
		},
	}
}
