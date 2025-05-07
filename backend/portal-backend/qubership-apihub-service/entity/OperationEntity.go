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
	"encoding/json"
	"time"

	"github.com/iancoleman/orderedmap"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	log "github.com/sirupsen/logrus"
)

type OperationEntity struct {
	tableName struct{} `pg:"operation"`

	PackageId               string                 `pg:"package_id, pk, type:varchar"`
	Version                 string                 `pg:"version, pk, type:varchar"`
	Revision                int                    `pg:"revision, pk, type:integer"`
	OperationId             string                 `pg:"operation_id, pk, type:varchar"`
	DataHash                string                 `pg:"data_hash, type:varchar"`
	Deprecated              bool                   `pg:"deprecated, type:boolean, use_zero"`
	Kind                    string                 `pg:"kind, type:varchar"`
	Title                   string                 `pg:"title, type:varchar, use_zero"`
	Metadata                Metadata               `pg:"metadata, type:jsonb"`
	Type                    string                 `pg:"type, type:varchar, use_zero"`
	DeprecatedInfo          string                 `pg:"deprecated_info, type:varchar, use_zero"`
	DeprecatedItems         []view.DeprecatedItem  `pg:"deprecated_items, type:jsonb, use_zero"`
	PreviousReleaseVersions []string               `pg:"previous_release_versions, type:varchar[], use_zero"`
	Models                  map[string]string      `pg:"models, type:jsonb, use_zero"`
	CustomTags              map[string]interface{} `pg:"custom_tags, type:jsonb, use_zero"`
	ApiAudience             string                 `pg:"api_audience, type:varchar, use_zero"`
}

type OperationsTypeCountEntity struct {
	tableName struct{} `pg:"operation"`

	ApiType                         string `pg:"type, type:varchar"`
	OperationsCount                 int    `pg:"operations_count, type:integer"`
	DeprecatedCount                 int    `pg:"deprecated_count, type:integer"`
	NoBwcOperationsCount            int    `pg:"no_bwc_count, type:integer"`
	InternalAudienceOperationsCount int    `pg:"internal_count, type:integer"`
	UnknownAudienceOperationsCount  int    `pg:"unknown_count, type:integer"`
}

type DeprecatedOperationsSummaryEntity struct {
	tableName struct{} `pg:"operation"`

	PackageId       string   `pg:"package_id, type:varchar"`
	Version         string   `pg:"version, type:varchar"`
	Revision        int      `pg:"revision, type:integer"`
	ApiType         string   `pg:"type, type:varchar"`
	Tags            []string `pg:"tags, type:varchar[]"`
	DeprecatedCount int      `pg:"deprecated_count, type:integer"`
}

type OperationsTypeDataHashEntity struct {
	tableName struct{} `pg:"operation"`

	ApiType        string            `pg:"type, type:varchar"`
	OperationsHash map[string]string `pg:"operations_hash, type:json"`
}

type OperationDataEntity struct {
	tableName struct{} `pg:"operation_data, alias:operation_data"`

	DataHash    string                 `pg:"data_hash, pk, type:varchar"`
	Data        []byte                 `pg:"data, type:bytea"`
	SearchScope map[string]interface{} `pg:"search_scope, type:jsonb"`
}

type OperationComparisonEntity struct {
	tableName struct{} `pg:"operation_comparison"`

	PackageId           string                 `pg:"package_id, type:varchar, use_zero"`
	Version             string                 `pg:"version, type:varchar, use_zero"`
	Revision            int                    `pg:"revision, type:integer, use_zero"`
	OperationId         string                 `pg:"operation_id, type:varchar"`
	PreviousPackageId   string                 `pg:"previous_package_id, type:varchar, use_zero"`
	PreviousVersion     string                 `pg:"previous_version, type:varchar, use_zero"`
	PreviousRevision    int                    `pg:"previous_revision, type:integer, use_zero"`
	PreviousOperationId string                 `pg:"previous_operation_id, type:varchar, use_zero"`
	ComparisonId        string                 `pg:"comparison_id, type:varchar"`
	DataHash            string                 `pg:"data_hash, type:varchar"`
	PreviousDataHash    string                 `pg:"previous_data_hash, type:varchar"`
	ChangesSummary      view.ChangeSummary     `pg:"changes_summary, type:jsonb"`
	Changes             map[string]interface{} `pg:"changes, type:jsonb"`
}

type VersionComparisonEntity struct {
	tableName struct{} `pg:"version_comparison, alias:version_comparison"`

	PackageId         string               `pg:"package_id, pk, type:varchar, use_zero"`
	Version           string               `pg:"version, pk, type:varchar, use_zero"`
	Revision          int                  `pg:"revision, pk, type:integer, use_zero"`
	PreviousPackageId string               `pg:"previous_package_id, pk, type:varchar, use_zero"`
	PreviousVersion   string               `pg:"previous_version, pk, type:varchar, use_zero"`
	PreviousRevision  int                  `pg:"previous_revision, pk, type:integer, use_zero"`
	ComparisonId      string               `pg:"comparison_id, type:varchar"`
	OperationTypes    []view.OperationType `pg:"operation_types, type:jsonb"`
	Refs              []string             `pg:"refs, type:varchar[]"`
	OpenCount         int                  `pg:"open_count, type:integer, use_zero"`
	LastActive        time.Time            `pg:"last_active, type:timestamp without time zone, use_zero"`
	NoContent         bool                 `pg:"no_content, type:boolean, use_zero"`
	BuilderVersion    string               `pg:"builder_version, type:varchar"`
}

func MakeRefComparisonView(entity VersionComparisonEntity) *view.RefComparison {
	refComparisonView := &view.RefComparison{
		OperationTypes:     entity.OperationTypes,
		NoContent:          entity.NoContent,
		PackageRef:         view.MakePackageRefKey(entity.PackageId, entity.Version, entity.Revision),
		PreviousPackageRef: view.MakePackageRefKey(entity.PreviousPackageId, entity.PreviousVersion, entity.PreviousRevision),
	}
	return refComparisonView
}

type OperationRichEntity struct {
	tableName struct{} `pg:"operation, alias:operation"`
	OperationEntity
	Data []byte `pg:"data, type:bytea"`
}

type OperationComparisonChangelogEntity_deprecated struct {
	tableName struct{} `pg:"_, alias:operation_comparison, discard_unknown_columns"`
	OperationComparisonEntity
	ApiType            string   `pg:"type, type:varchar"`
	ApiKind            string   `pg:"kind, type:varchar"`
	Title              string   `pg:"title, type:varchar"`
	Metadata           Metadata `pg:"metadata, type:jsonb"`
	PackageRef         string   `pg:"package_ref, type:varchar"`
	PreviousPackageRef string   `pg:"previous_package_ref, type:varchar"`
}

type OperationComparisonChangelogEntity struct {
	tableName struct{} `pg:"_, alias:operation_comparison, discard_unknown_columns"`
	OperationComparisonEntity
	ApiType             string   `pg:"type, type:varchar"`
	ApiKind             string   `pg:"kind, type:varchar"`
	PreviousApiKind     string   `pg:"previous_kind, type:varchar"`
	ApiAudience         string   `pg:"api_audience, type:varchar"`
	PreviousApiAudience string   `pg:"previous_api_audience, type:varchar"`
	Title               string   `pg:"title, type:varchar"`
	PreviousTitle       string   `pg:"previous_title, type:varchar"`
	Metadata            Metadata `pg:"metadata, type:jsonb"`
	PreviousMetadata    Metadata `pg:"previous_metadata, type:jsonb"`
	PackageRef          string   `pg:"package_ref, type:varchar"`
	PreviousPackageRef  string   `pg:"previous_package_ref, type:varchar"`
}

type ChangelogSearchQueryEntity struct {
	ComparisonId   string   `pg:"comparison_id, type:varchar, use_zero"`
	ApiType        string   `pg:"type, type:varchar, use_zero"`
	TextFilter     string   `pg:"text_filter, type:varchar, use_zero"`
	ApiKind        string   `pg:"api_kind, type:varchar, use_zero"`
	ApiAudience    string   `pg:"api_audience, type:varchar, use_zero"`
	DocumentSlug   string   `pg:"document_slug, type:varchar, use_zero"`
	Tags           []string `pg:"tags, type:varchar[], use_zero"`
	EmptyTag       bool     `pg:"empty_tag, type:boolean, use_zero"`
	RefPackageId   string   `pg:"ref_package_id, type:varchar, use_zero"`
	Limit          int      `pg:"limit, type:integer, use_zero"`
	Offset         int      `pg:"offset, type:integer, use_zero"`
	EmptyGroup     bool     `pg:"-"`
	Group          string   `pg:"-"`
	GroupPackageId string   `pg:"-"`
	GroupVersion   string   `pg:"-"`
	GroupRevision  int      `pg:"-"`
	Severities     []string `pg:"-"`
}

type OperationTagsSearchQueryEntity struct {
	PackageId   string `pg:"package_id, type:varchar, use_zero"`
	Version     string `pg:"version, type:varchar, use_zero"`
	Revision    int    `pg:"revision, type:integer, use_zero"`
	Type        string `pg:"type, type:varchar, use_zero"`
	TextFilter  string `pg:"text_filter, type:varchar, use_zero"`
	Kind        string `pg:"kind, type:varchar, use_zero"`
	ApiAudience string `pg:"api_audience, type:varchar, use_zero"`
	Limit       int    `pg:"limit, type:integer, use_zero"`
	Offset      int    `pg:"offset, type:integer, use_zero"`
}
type OperationSearchQueryEntity struct {
	PackageId   string `pg:"package_id, type:varchar, use_zero"`
	Version     string `pg:"version, type:varchar, use_zero"`
	Revision    int    `pg:"revision, type:integer, use_zero"`
	ApiType     string `pg:"type, type:varchar, use_zero"`
	OperationId string `pg:"operation_id, type:varchar, use_zero"`
}

type OperationModelsEntity struct {
	tableName struct{} `pg:"operation, alias:operation"`

	OperationId string   `pg:"operation_id, type:varchar"`
	Models      []string `pg:"models, type:varchar[]"`
}

// deprecated
func MakeDocumentsOperationView_deprecated(operationEnt OperationEntity) view.DocumentsOperation_deprecated {
	documentsOperation := view.DocumentsOperation_deprecated{
		OperationId: operationEnt.OperationId,
		Title:       operationEnt.Title,
		DataHash:    operationEnt.DataHash,
		Deprecated:  operationEnt.Deprecated,
		ApiKind:     operationEnt.Kind,
		ApiType:     operationEnt.Type,
	}
	switch operationEnt.Type {
	case string(view.RestApiType):
		restOperationMetadata := view.RestOperationMetadata{
			Path:   operationEnt.Metadata.GetPath(),
			Method: operationEnt.Metadata.GetMethod(),
			Tags:   operationEnt.Metadata.GetTags(),
		}
		documentsOperation.Metadata = restOperationMetadata
	case string(view.GraphqlApiType):
		graphQLOperationMetadata := view.GraphQLOperationMetadata{
			Type:   operationEnt.Metadata.GetType(),
			Method: operationEnt.Metadata.GetMethod(),
			Tags:   operationEnt.Metadata.GetTags(),
		}
		documentsOperation.Metadata = graphQLOperationMetadata
	case string(view.ProtobufApiType):
		protobufOperationMetadata := view.ProtobufOperationMetadata{
			Type:   operationEnt.Metadata.GetType(),
			Method: operationEnt.Metadata.GetMethod(),
		}
		documentsOperation.Metadata = protobufOperationMetadata
	}
	return documentsOperation
}

func MakeDocumentsOperationView(operationEnt OperationEntity) interface{} {
	switch operationEnt.Type {
	case string(view.RestApiType):
		return MakeRestOperationView(&operationEnt)
	case string(view.GraphqlApiType):
		return MakeGraphQLOperationView(&operationEnt)
	case string(view.ProtobufApiType):
		return MakeProtobufOperationView(&operationEnt)
	}
	return MakeCommonOperationView(&operationEnt)
}

func MakeOperationView(operationEnt OperationRichEntity) interface{} {
	data := orderedmap.New()
	if len(operationEnt.Data) > 0 {
		err := json.Unmarshal(operationEnt.Data, &data)
		if err != nil {
			log.Errorf("Failed to unmarshal data (dataHash: %v): %v", operationEnt.DataHash, err)
		}
	}
	switch operationEnt.Type {
	case string(view.RestApiType):
		restOperationView := MakeRestOperationView(&operationEnt.OperationEntity)
		restOperationView.Data = data
		restOperationView.PackageRef = view.MakePackageRefKey(operationEnt.PackageId, operationEnt.Version, operationEnt.Revision)
		return restOperationView

	case string(view.GraphqlApiType):
		graphqlOperationView := MakeGraphQLOperationView(&operationEnt.OperationEntity)
		graphqlOperationView.Data = data
		graphqlOperationView.PackageRef = view.MakePackageRefKey(operationEnt.PackageId, operationEnt.Version, operationEnt.Revision)
		return graphqlOperationView

	case string(view.ProtobufApiType):
		protobufOperationView := MakeProtobufOperationView(&operationEnt.OperationEntity)
		protobufOperationView.Data = data
		protobufOperationView.PackageRef = view.MakePackageRefKey(operationEnt.PackageId, operationEnt.Version, operationEnt.Revision)
		return protobufOperationView
	}
	return MakeCommonOperationView(&operationEnt.OperationEntity)
}

func MakeOperationIdsSlice(operationEnt []OperationRichEntity) []string {
	operationIds := make([]string, 0, len(operationEnt))
	for _, entity := range operationEnt {
		operationIds = append(operationIds, entity.OperationId)
	}
	return operationIds
}

func MakeCommonOperationView(operationEnt *OperationEntity) view.OperationListView {
	return view.OperationListView{
		CommonOperationView: view.CommonOperationView{
			OperationId: operationEnt.OperationId,
			Title:       operationEnt.Title,
			DataHash:    operationEnt.DataHash,
			Deprecated:  operationEnt.Deprecated,
			ApiKind:     operationEnt.Kind,
			ApiType:     operationEnt.Type,
			CustomTags:  operationEnt.CustomTags,
			ApiAudience: operationEnt.ApiAudience,
		},
	}
}

func MakeRestOperationView(operationEnt *OperationEntity) view.RestOperationView {
	return view.RestOperationView{
		OperationListView: MakeCommonOperationView(operationEnt),
		RestOperationMetadata: view.RestOperationMetadata{
			Path:   operationEnt.Metadata.GetPath(),
			Method: operationEnt.Metadata.GetMethod(),
			Tags:   operationEnt.Metadata.GetTags(),
		},
	}
}

func MakeGraphQLOperationView(operationEnt *OperationEntity) view.GraphQLOperationView {
	return view.GraphQLOperationView{
		OperationListView: MakeCommonOperationView(operationEnt),
		GraphQLOperationMetadata: view.GraphQLOperationMetadata{
			Type:   operationEnt.Metadata.GetType(),
			Method: operationEnt.Metadata.GetMethod(),
			Tags:   operationEnt.Metadata.GetTags(),
		},
	}
}

func MakeProtobufOperationView(operationEnt *OperationEntity) view.ProtobufOperationView {
	return view.ProtobufOperationView{
		OperationListView: MakeCommonOperationView(operationEnt),
		ProtobufOperationMetadata: view.ProtobufOperationMetadata{
			Type:   operationEnt.Metadata.GetType(),
			Method: operationEnt.Metadata.GetMethod(),
		},
	}
}

func MakeDeprecatedOperationView(operationEnt OperationRichEntity, includeDeprecatedItems bool) interface{} {
	operationView := view.DeprecatedOperationView{
		OperationId:             operationEnt.OperationId,
		Title:                   operationEnt.Title,
		DataHash:                operationEnt.DataHash,
		Deprecated:              operationEnt.Deprecated,
		ApiKind:                 operationEnt.Kind,
		ApiType:                 operationEnt.Type,
		PackageRef:              view.MakePackageRefKey(operationEnt.PackageId, operationEnt.Version, operationEnt.Revision),
		DeprecatedInfo:          operationEnt.DeprecatedInfo,
		DeprecatedCount:         len(operationEnt.DeprecatedItems),
		PreviousReleaseVersions: operationEnt.PreviousReleaseVersions,
		ApiAudience:             operationEnt.ApiAudience,
	}
	if includeDeprecatedItems {
		operationView.DeprecatedItems = operationEnt.DeprecatedItems
	}

	switch operationEnt.Type {
	case string(view.RestApiType):
		return view.DeprecatedRestOperationView{
			DeprecatedOperationView: operationView,
			RestOperationMetadata: view.RestOperationMetadata{
				Path:   operationEnt.Metadata.GetPath(),
				Method: operationEnt.Metadata.GetMethod(),
				Tags:   operationEnt.Metadata.GetTags(),
			},
		}
	case string(view.GraphqlApiType):
		return view.DeprecateGraphQLOperationView{
			DeprecatedOperationView: operationView,
			GraphQLOperationMetadata: view.GraphQLOperationMetadata{
				Type:   operationEnt.Metadata.GetType(),
				Method: operationEnt.Metadata.GetMethod(),
				Tags:   operationEnt.Metadata.GetTags(),
			},
		}
	case string(view.ProtobufApiType):
		return view.DeprecateProtobufOperationView{
			DeprecatedOperationView: operationView,
			ProtobufOperationMetadata: view.ProtobufOperationMetadata{
				Type:   operationEnt.Metadata.GetType(),
				Method: operationEnt.Metadata.GetMethod(),
			},
		}
	}
	return operationView
}

func MakeSingleOperationView(operationEnt OperationRichEntity) interface{} {
	data := orderedmap.New()
	if len(operationEnt.Data) > 0 {
		err := json.Unmarshal(operationEnt.Data, &data)
		if err != nil {
			log.Errorf("Failed to unmarshal data (dataHash: %v): %v", operationEnt.DataHash, err)
		}
	}
	operationView := view.SingleOperationView{
		OperationId: operationEnt.OperationId,
		Title:       operationEnt.Title,
		DataHash:    operationEnt.DataHash,
		Deprecated:  operationEnt.Deprecated,
		ApiKind:     operationEnt.Kind,
		ApiType:     operationEnt.Type,
		Data:        data,
		CustomTags:  operationEnt.CustomTags,
		ApiAudience: operationEnt.ApiAudience,
	}

	switch operationEnt.Type {
	case string(view.RestApiType):
		return view.RestOperationSingleView{
			SingleOperationView: operationView,
			RestOperationMetadata: view.RestOperationMetadata{
				Path:   operationEnt.Metadata.GetPath(),
				Method: operationEnt.Metadata.GetMethod(),
				Tags:   operationEnt.Metadata.GetTags(),
			},
		}
	case string(view.GraphqlApiType):
		return view.GraphQLOperationSingleView{
			SingleOperationView: operationView,
			GraphQLOperationMetadata: view.GraphQLOperationMetadata{
				Type:   operationEnt.Metadata.GetType(),
				Method: operationEnt.Metadata.GetMethod(),
				Tags:   operationEnt.Metadata.GetTags(),
			},
		}
	case string(view.ProtobufApiType):
		return view.ProtobufOperationSingleView{
			SingleOperationView: operationView,
			ProtobufOperationMetadata: view.ProtobufOperationMetadata{
				Type:   operationEnt.Metadata.GetType(),
				Method: operationEnt.Metadata.GetMethod(),
			},
		}
	}
	return operationView
}

func MakeSingleOperationDeprecatedItemsView(operationEnt OperationRichEntity) view.DeprecatedItems {
	return view.DeprecatedItems{
		DeprecatedItems: operationEnt.DeprecatedItems,
	}
}

func MakeOperationChangesListView(changedOperationEnt OperationComparisonEntity) []interface{} {
	result := make([]interface{}, 0)
	if changes, ok := changedOperationEnt.Changes["changes"].([]interface{}); ok {
		for _, change := range changes {
			result = append(result, view.ParseSingleOperationChange(change))
		}
	}
	return result
}

func MakeOperationComparisonChangelogView_deprecated(entity OperationComparisonChangelogEntity_deprecated) interface{} {
	operationComparisonChangelogView := view.OperationComparisonChangelogView_deprecated{
		OperationId:               entity.OperationId,
		Title:                     entity.Title,
		ChangeSummary:             entity.ChangesSummary,
		ApiKind:                   entity.ApiKind,
		DataHash:                  entity.DataHash,
		PreviousDataHash:          entity.PreviousDataHash,
		PackageRef:                view.MakePackageRefKey(entity.PackageId, entity.Version, entity.Revision),
		PreviousVersionPackageRef: view.MakePackageRefKey(entity.PreviousPackageId, entity.PreviousVersion, entity.PreviousRevision),
	}
	switch entity.ApiType {
	case string(view.RestApiType):
		return view.RestOperationComparisonChangelogView_deprecated{
			OperationComparisonChangelogView_deprecated: operationComparisonChangelogView,
			RestOperationMetadata: view.RestOperationMetadata{
				Path:   entity.Metadata.GetPath(),
				Method: entity.Metadata.GetMethod(),
				Tags:   entity.Metadata.GetTags(),
			},
		}
	case string(view.GraphqlApiType):
		return view.GraphQLOperationComparisonChangelogView_deprecated{
			OperationComparisonChangelogView_deprecated: operationComparisonChangelogView,
			GraphQLOperationMetadata: view.GraphQLOperationMetadata{
				Type:   entity.Metadata.GetType(),
				Method: entity.Metadata.GetMethod(),
				Tags:   entity.Metadata.GetTags(),
			},
		}
	}
	return operationComparisonChangelogView
}

func MakeOperationComparisonChangelogView(entity OperationComparisonChangelogEntity) interface{} {
	currentGenericView := view.GenericComparisonOperationView{
		OperationId: entity.OperationId,
		Title:       entity.Title,
		ApiKind:     entity.ApiKind,
		DataHash:    entity.DataHash,
		PackageRef:  view.MakePackageRefKey(entity.PackageId, entity.Version, entity.Revision),
	}

	previousGenericView := view.GenericComparisonOperationView{
		OperationId: entity.PreviousOperationId,
		Title:       entity.PreviousTitle,
		ApiKind:     entity.PreviousApiKind,
		ApiAudience: entity.PreviousApiAudience,
		DataHash:    entity.PreviousDataHash,
		PackageRef:  view.MakePackageRefKey(entity.PreviousPackageId, entity.PreviousVersion, entity.PreviousRevision),
	}

	switch entity.ApiType {
	case string(view.RestApiType):
		var current *view.RestOperationComparisonChangelogView
		var previous *view.RestOperationComparisonChangelogView

		if entity.OperationId != "" {
			current = &view.RestOperationComparisonChangelogView{
				GenericComparisonOperationView: currentGenericView,
				RestOperationMetadata: view.RestOperationMetadata{
					Tags:   entity.Metadata.GetTags(),
					Path:   entity.Metadata.GetPath(),
					Method: entity.Metadata.GetMethod(),
				},
			}
		}

		if entity.PreviousOperationId != "" {
			previous = &view.RestOperationComparisonChangelogView{
				GenericComparisonOperationView: previousGenericView,
				RestOperationMetadata: view.RestOperationMetadata{
					Tags:   entity.PreviousMetadata.GetTags(),
					Path:   entity.PreviousMetadata.GetPath(),
					Method: entity.PreviousMetadata.GetMethod(),
				},
			}
		}

		res := &view.RestOperationPairChangesView{
			CurrentOperation:  current,
			PreviousOperation: previous,
			ChangeSummary:     entity.ChangesSummary,
		}
		return res
	case string(view.GraphqlApiType):
		var current *view.GraphqlOperationComparisonChangelogView
		var previous *view.GraphqlOperationComparisonChangelogView

		if entity.OperationId != "" {
			current = &view.GraphqlOperationComparisonChangelogView{
				GenericComparisonOperationView: currentGenericView,
				GraphQLOperationMetadata: view.GraphQLOperationMetadata{
					Type:   entity.Metadata.GetType(),
					Method: entity.Metadata.GetMethod(),
					Tags:   entity.Metadata.GetTags(),
				},
			}
		}
		if entity.PreviousOperationId != "" {
			previous = &view.GraphqlOperationComparisonChangelogView{
				GenericComparisonOperationView: previousGenericView,
				GraphQLOperationMetadata: view.GraphQLOperationMetadata{
					Type:   entity.PreviousMetadata.GetType(),
					Method: entity.PreviousMetadata.GetMethod(),
					Tags:   entity.PreviousMetadata.GetTags(),
				},
			}
		}

		result := &view.GraphqlOperationPairChangesView{
			CurrentOperation:  current,
			PreviousOperation: previous,
			ChangeSummary:     entity.ChangesSummary,
		}
		return result
	case string(view.ProtobufApiType):
		var current *view.ProtobufOperationComparisonChangelogView
		var previous *view.ProtobufOperationComparisonChangelogView

		if entity.OperationId != "" {
			current = &view.ProtobufOperationComparisonChangelogView{
				GenericComparisonOperationView: currentGenericView,
				ProtobufOperationMetadata: view.ProtobufOperationMetadata{
					Type:   entity.Metadata.GetType(),
					Method: entity.Metadata.GetMethod(),
				},
			}
		}
		if entity.PreviousOperationId != "" {
			previous = &view.ProtobufOperationComparisonChangelogView{
				GenericComparisonOperationView: previousGenericView,
				ProtobufOperationMetadata: view.ProtobufOperationMetadata{
					Type:   entity.PreviousMetadata.GetType(),
					Method: entity.PreviousMetadata.GetMethod(),
				},
			}
		}

		result := &view.ProtobufOperationPairChangesView{
			CurrentOperation:  current,
			PreviousOperation: previous,
			ChangeSummary:     entity.ChangesSummary,
		}
		return result
	}
	return nil
}

func MakeOperationComparisonChangelogView_deprecated_2(entity OperationComparisonChangelogEntity) interface{} {
	var currentOperation *view.ComparisonOperationView_deprecated
	var previousOperation *view.ComparisonOperationView_deprecated

	if entity.DataHash != "" {
		currentOperation = &view.ComparisonOperationView_deprecated{
			Title:       entity.Title,
			ApiKind:     entity.ApiKind,
			ApiAudience: entity.ApiAudience,
			DataHash:    entity.DataHash,
			PackageRef:  view.MakePackageRefKey(entity.PackageId, entity.Version, entity.Revision),
		}
	}
	if entity.PreviousDataHash != "" {
		previousOperation = &view.ComparisonOperationView_deprecated{
			Title:       entity.PreviousTitle,
			ApiKind:     entity.PreviousApiKind,
			ApiAudience: entity.PreviousApiAudience,
			DataHash:    entity.PreviousDataHash,
			PackageRef:  view.MakePackageRefKey(entity.PreviousPackageId, entity.PreviousVersion, entity.PreviousRevision),
		}
	}

	operationComparisonChangelogView := view.OperationComparisonChangelogView_deprecated_2{
		OperationId:       entity.OperationId,
		CurrentOperation:  currentOperation,
		PreviousOperation: previousOperation,
		ChangeSummary:     entity.ChangesSummary,
	}

	switch entity.ApiType {
	case string(view.RestApiType):
		return view.RestOperationComparisonChangelogView_deprecated_2{
			OperationComparisonChangelogView_deprecated_2: operationComparisonChangelogView,
			RestOperationMetadata: view.RestOperationMetadata{
				Path:   entity.Metadata.GetPath(),
				Method: entity.Metadata.GetMethod(),
				Tags:   entity.Metadata.GetTags(),
			},
		}
	case string(view.GraphqlApiType):
		return view.GraphQLOperationComparisonChangelogView_deprecated_2{
			OperationComparisonChangelogView_deprecated_2: operationComparisonChangelogView,
			GraphQLOperationMetadata: view.GraphQLOperationMetadata{
				Type:   entity.Metadata.GetType(),
				Method: entity.Metadata.GetMethod(),
				Tags:   entity.Metadata.GetTags(),
			},
		}
	case string(view.ProtobufApiType):
		return view.ProtobufOperationComparisonChangelogView_deprecated_2{
			OperationComparisonChangelogView_deprecated_2: operationComparisonChangelogView,
			ProtobufOperationMetadata: view.ProtobufOperationMetadata{
				Type:   entity.Metadata.GetType(),
				Method: entity.Metadata.GetMethod(),
			},
		}
	}
	return operationComparisonChangelogView
}

// todo use current (not deprecated entity)
func MakeOperationComparisonChangesView(entity OperationComparisonChangelogEntity_deprecated) interface{} {
	var action string
	if entity.DataHash == "" {
		action = view.ChangelogActionRemove
	} else if entity.PreviousDataHash == "" {
		action = view.ChangelogActionAdd
	} else {
		action = view.ChangelogActionChange
	}
	operationComparisonChangelogView := view.OperationComparisonChangesView{
		OperationId:               entity.OperationId,
		Title:                     entity.Title,
		ChangeSummary:             entity.ChangesSummary,
		ApiKind:                   entity.ApiKind,
		DataHash:                  entity.DataHash,
		PreviousDataHash:          entity.PreviousDataHash,
		PackageRef:                view.MakePackageRefKey(entity.PackageId, entity.Version, entity.Revision),
		PreviousVersionPackageRef: view.MakePackageRefKey(entity.PreviousPackageId, entity.PreviousVersion, entity.PreviousRevision),
		Changes:                   MakeOperationChangesListView(entity.OperationComparisonEntity),
		Action:                    action,
	}
	switch entity.ApiType {
	case string(view.RestApiType):
		return view.RestOperationComparisonChangesView{
			OperationComparisonChangesView: operationComparisonChangelogView,
			RestOperationMetadata: view.RestOperationMetadata{
				Path:   entity.Metadata.GetPath(),
				Method: entity.Metadata.GetMethod(),
				Tags:   entity.Metadata.GetTags(),
			},
		}
	case string(view.GraphqlApiType):
		return view.GraphQLOperationComparisonChangesView{
			OperationComparisonChangesView: operationComparisonChangelogView,
			GraphQLOperationMetadata: view.GraphQLOperationMetadata{
				Type:   entity.Metadata.GetType(),
				Method: entity.Metadata.GetMethod(),
				Tags:   entity.Metadata.GetTags(),
			},
		}
	case string(view.ProtobufApiType):
		return view.ProtobufOperationComparisonChangesView{
			OperationComparisonChangesView: operationComparisonChangelogView,
			ProtobufOperationMetadata: view.ProtobufOperationMetadata{
				Type:   entity.Metadata.GetType(),
				Method: entity.Metadata.GetMethod(),
			},
		}
	}
	return operationComparisonChangelogView
}

func MakeDeprecatedOperationType(ent DeprecatedOperationsSummaryEntity) view.DeprecatedOperationType {
	return view.DeprecatedOperationType{
		ApiType:         ent.ApiType,
		Tags:            ent.Tags,
		DeprecatedCount: ent.DeprecatedCount,
	}
}

func MakeDeprecatedOperationTypesRef(packageRef string, deprecatedOperationTypes []DeprecatedOperationsSummaryEntity) view.DeprecatedOperationTypesRef {
	deprecatedOperationTypesRef := view.DeprecatedOperationTypesRef{
		PackageRef:     packageRef,
		OperationTypes: make([]view.DeprecatedOperationType, 0),
	}
	for _, operationType := range deprecatedOperationTypes {
		deprecatedOperationTypesRef.OperationTypes = append(deprecatedOperationTypesRef.OperationTypes, MakeDeprecatedOperationType(operationType))
	}
	return deprecatedOperationTypesRef
}
