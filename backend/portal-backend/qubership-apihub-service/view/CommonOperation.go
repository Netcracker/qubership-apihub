package view

import (
	"fmt"

	"github.com/iancoleman/orderedmap"
)

type Operation struct {
	OperationId               string                 `json:"operationId" validate:"required"`
	Title                     string                 `json:"title" validate:"required"`
	ApiType                   string                 `json:"apiType" validate:"required"`
	Deprecated                bool                   `json:"deprecated"`
	ApiKind                   string                 `json:"apiKind" validate:"required"`
	Metadata                  map[string]interface{} `json:"metadata" validate:"required"`
	SearchScopes              map[string]interface{} `json:"searchScopes" validate:"required"`
	PreviousReleaseVersions   []string               `json:"deprecatedInPreviousVersions"`
	DeprecatedInfo            string                 `json:"deprecatedInfo"`
	DeprecatedItems           []DeprecatedItem       `json:"deprecatedItems"`
	Tags                      []string               `json:"tags"`
	Models                    map[string]string      `json:"models"`
	ApiAudience               string                 `json:"apiAudience" validate:"required"`
	DocumentId                string                 `json:"documentId" validate:"required"`
	VersionInternalDocumentId string                 `json:"versionInternalDocumentId" validate:"required"`
}

type SingleOperationView struct {
	Data                      *orderedmap.OrderedMap `json:"data,omitempty"`
	OperationId               string                 `json:"operationId"`
	Title                     string                 `json:"title"`
	Deprecated                bool                   `json:"deprecated,omitempty"`
	ApiKind                   string                 `json:"apiKind"`
	ApiType                   string                 `json:"apiType"`
	CustomTags                map[string]interface{} `json:"customTags,omitempty"`
	ApiAudience               string                 `json:"apiAudience"`
	DocumentId                string                 `json:"documentId"`
	VersionInternalDocumentId string                 `json:"versionInternalDocumentId"`
}

type CommonOperationView struct {
	OperationId               string                 `json:"operationId"`
	Title                     string                 `json:"title"`
	Deprecated                bool                   `json:"deprecated,omitempty"`
	ApiKind                   string                 `json:"apiKind"`
	ApiType                   string                 `json:"apiType"`
	CustomTags                map[string]interface{} `json:"customTags,omitempty"`
	ApiAudience               string                 `json:"apiAudience"`
	DocumentId                string                 `json:"documentId"`
	VersionInternalDocumentId string                 `json:"versionInternalDocumentId"`
}

type OperationListView struct {
	CommonOperationView
	PackageRef string                 `json:"packageRef,omitempty"`
	Data       *orderedmap.OrderedMap `json:"data,omitempty"`
}

type DeprecatedOperationView struct {
	PackageRef                string           `json:"packageRef,omitempty"`
	OperationId               string           `json:"operationId"`
	Title                     string           `json:"title"`
	Deprecated                bool             `json:"deprecated,omitempty"`
	ApiKind                   string           `json:"apiKind"`
	ApiType                   string           `json:"apiType"`
	PreviousReleaseVersions   []string         `json:"deprecatedInPreviousVersions,omitempty"`
	DeprecatedCount           int              `json:"deprecatedCount"`
	DeprecatedInfo            string           `json:"deprecatedInfo,omitempty"`
	DeprecatedItems           []DeprecatedItem `json:"deprecatedItems,omitempty"`
	ApiAudience               string           `json:"apiAudience"`
	DocumentId                string           `json:"documentId"`
	VersionInternalDocumentId string           `json:"versionInternalDocumentId"`
}
type DeprecatedItem struct {
	PreviousReleaseVersions []string        `json:"deprecatedInPreviousVersions,omitempty"`
	DeclarationJsonPaths    [][]interface{} `json:"declarationJsonPaths,omitempty"`
	Description             string          `json:"description,omitempty"`
	Hash                    string          `json:"hash,omitempty"`
	TolerantHash            string          `json:"tolerantHash,omitempty"`
	DeprecatedInfo          string          `json:"deprecatedInfo,omitempty"`
}

type DeprecatedItems struct {
	DeprecatedItems []DeprecatedItem `json:"deprecatedItems"`
}

type OperationComparison struct {
	OperationId                  string                 `json:"operationId"`
	PreviousOperationId          string                 `json:"previousOperationId"`
	ChangeSummary                ChangeSummary          `json:"changeSummary,omitempty"`
	Changes                      []interface{}          `json:"changes" validate:"required,dive,required"`
	JsonPath                     []string               `json:"jsonPath,omitempty"`
	Action                       string                 `json:"action,omitempty"`
	Severity                     string                 `json:"severity,omitempty"`
	Metadata                     map[string]interface{} `json:"metadata"`
	ComparisonInternalDocumentId string                 `json:"comparisonInternalDocumentId" validate:"required"`
}

type SingleOperationChangeAdd struct {
	SingleOperationChangeCommon
	CurrentDeclarationJsonPaths [][]interface{} `json:"currentDeclarationJsonPaths,omitempty"`
	CurrentValueHash            string          `json:"currentValueHash,omitempty"`
}

type SingleOperationChangeRemove struct {
	SingleOperationChangeCommon
	PreviousDeclarationJsonPaths [][]interface{} `json:"previousDeclarationJsonPaths,omitempty"`
	PreviousValueHash            string          `json:"previousValueHash,omitempty"`
}

type SingleOperationChangeReplace struct {
	SingleOperationChangeCommon
	CurrentDeclarationJsonPaths  [][]interface{} `json:"currentDeclarationJsonPaths,omitempty"`
	CurrentValueHash             string          `json:"currentValueHash,omitempty"`
	PreviousDeclarationJsonPaths [][]interface{} `json:"previousDeclarationJsonPaths,omitempty"`
	PreviousValueHash            string          `json:"previousValueHash,omitempty"`
}

type SingleOperationChangeRename struct {
	SingleOperationChangeCommon
	CurrentDeclarationJsonPaths  [][]interface{} `json:"currentDeclarationJsonPaths,omitempty"`
	CurrentKey                   string          `json:"currentKey,omitempty"`
	PreviousDeclarationJsonPaths [][]interface{} `json:"previousDeclarationJsonPaths,omitempty"`
	PreviousKey                  string          `json:"previousKey,omitempty"`
}

type SingleOperationChangeCommon struct {
	Action      string `json:"action,omitempty"`
	Severity    string `json:"severity,omitempty"`
	Description string `json:"description,omitempty"`
	Scope       string `json:"scope,omitempty"`
}

func GetSingleOperationChangeCommon(change interface{}) SingleOperationChangeCommon {
	if change != nil {
		if val, ok := change.(SingleOperationChangeAdd); ok {
			return val.SingleOperationChangeCommon
		}
		if val, ok := change.(SingleOperationChangeRemove); ok {
			return val.SingleOperationChangeCommon
		}
		if val, ok := change.(SingleOperationChangeReplace); ok {
			return val.SingleOperationChangeCommon
		}
		if val, ok := change.(SingleOperationChangeRename); ok {
			return val.SingleOperationChangeCommon
		}
		if val, ok := change.(SingleOperationChangeCommon); ok {
			return val
		}
	}
	return SingleOperationChangeCommon{}
}

func ParseSingleOperationChange(change interface{}) interface{} {
	if change == nil {
		return SingleOperationChangeCommon{}
	}
	var currentDeclarationJsonPaths [][]interface{}
	var previousDeclarationJsonPaths [][]interface{}
	var currentValueHash string
	var previousValueHash string
	var currentKey string
	var previousKey string
	singleOperationChangeCommon := SingleOperationChangeCommon{}
	if change, ok := change.(map[string]interface{}); ok {
		if val, ok := change["description"].(string); ok {
			singleOperationChangeCommon.Description = val
		}
		if val, ok := change["severity"].(string); ok {
			singleOperationChangeCommon.Severity = val
		}
		if val, ok := change["scope"].(string); ok {
			singleOperationChangeCommon.Scope = val
		}
		if singleOperationChangeCommon.Action, ok = change["action"].(string); !ok {
			return singleOperationChangeCommon
		}
		if currentJsonPathArr, ok := change["currentDeclarationJsonPaths"].([]interface{}); ok {
			for _, currentJsonPath := range currentJsonPathArr {
				objPathArr := make([]interface{}, 0)
				if pathArr, ok := currentJsonPath.([]interface{}); ok {
					objPathArr = append(objPathArr, pathArr...)
				}
				if len(objPathArr) > 0 {
					currentDeclarationJsonPaths = append(currentDeclarationJsonPaths, objPathArr)
				}
			}
		}
		if previousJsonPathArr, ok := change["previousDeclarationJsonPaths"].([]interface{}); ok {
			for _, previousJsonPath := range previousJsonPathArr {
				objPathArr := make([]interface{}, 0)
				if pathArr, ok := previousJsonPath.([]interface{}); ok {
					objPathArr = append(objPathArr, pathArr...)
				}
				if len(objPathArr) > 0 {
					previousDeclarationJsonPaths = append(previousDeclarationJsonPaths, objPathArr)
				}
			}
		}
		if val, ok := change["currentValueHash"].(string); ok {
			currentValueHash = val
		}
		if val, ok := change["previousValueHash"].(string); ok {
			previousValueHash = val
		}
		if val, ok := change["currentKey"].(string); ok {
			currentKey = val
		}
		if val, ok := change["previousKey"].(string); ok {
			previousKey = val
		}

		switch singleOperationChangeCommon.Action {
		case "add":
			return SingleOperationChangeAdd{
				SingleOperationChangeCommon: singleOperationChangeCommon,
				CurrentDeclarationJsonPaths: currentDeclarationJsonPaths,
				CurrentValueHash:            currentValueHash,
			}
		case "remove":
			return SingleOperationChangeRemove{
				SingleOperationChangeCommon:  singleOperationChangeCommon,
				PreviousDeclarationJsonPaths: previousDeclarationJsonPaths,
				PreviousValueHash:            previousValueHash,
			}
		case "replace":
			return SingleOperationChangeReplace{
				SingleOperationChangeCommon:  singleOperationChangeCommon,
				CurrentDeclarationJsonPaths:  currentDeclarationJsonPaths,
				CurrentValueHash:             currentValueHash,
				PreviousDeclarationJsonPaths: previousDeclarationJsonPaths,
				PreviousValueHash:            previousValueHash,
			}
		case "rename":
			return SingleOperationChangeRename{
				SingleOperationChangeCommon:  singleOperationChangeCommon,
				CurrentDeclarationJsonPaths:  currentDeclarationJsonPaths,
				CurrentKey:                   currentKey,
				PreviousDeclarationJsonPaths: previousDeclarationJsonPaths,
				PreviousKey:                  previousKey,
			}
		}
	}
	return singleOperationChangeCommon
}

type VersionChangesView struct {
	PreviousVersion          string                       `json:"previousVersion"`
	PreviousVersionPackageId string                       `json:"previousVersionPackageId"`
	Operations               []interface{}                `json:"operations"`
	Packages                 map[string]PackageVersionRef `json:"packages,omitempty"`
}

type GenericComparisonOperationView struct {
	OperationId string `json:"operationId"`
	Title       string `json:"title"`
	ApiKind     string `json:"apiKind,omitempty"`
	ApiAudience string `json:"apiAudience"`
	PackageRef  string `json:"packageRef"`
}

type OperationComparisonChangesView struct {
	OperationId               string        `json:"operationId"`
	Title                     string        `json:"title"`
	ApiKind                   string        `json:"apiKind,omitempty"`
	ChangeSummary             ChangeSummary `json:"changeSummary"`
	PackageRef                string        `json:"packageRef"`
	PreviousVersionPackageRef string        `json:"previousVersionPackageRef"`
	Changes                   []interface{} `json:"changes"`
	Action                    string        `json:"action"`
}

type OperationChangesView struct {
	Changes []interface{} `json:"changes"`
}

type OperationTags struct {
	Tags []string `json:"tags"`
}

type Operations struct {
	Operations []interface{}                `json:"operations"`
	Packages   map[string]PackageVersionRef `json:"packages,omitempty"`
}

type GroupedOperations struct {
	Operations []interface{}                `json:"operations"`
	Packages   map[string]PackageVersionRef `json:"packages,omitempty"`
}

type ChangeSummary struct {
	Breaking     int `json:"breaking"`
	SemiBreaking int `json:"semi-breaking"`
	Deprecated   int `json:"deprecated"`
	NonBreaking  int `json:"non-breaking"`
	Annotation   int `json:"annotation"`
	Unclassified int `json:"unclassified"`
}

func (c ChangeSummary) GetTotalSummary() int {
	return c.Breaking + c.SemiBreaking + c.Deprecated + c.NonBreaking + c.Annotation + c.Unclassified
}

const ChangelogActionChange string = "change"
const ChangelogActionAdd string = "add"
const ChangelogActionRemove string = "remove"

type ApiKind string

const BwcApiKind ApiKind = "bwc"
const NoBwcApiKind ApiKind = "no-bwc"
const DebugApiKind ApiKind = "debug"
const ExperimentalApiKind ApiKind = "experimental"

type Severity string

const Annotation Severity = "annotation"
const Breaking Severity = "breaking"
const SemiBreaking Severity = "semi-breaking"
const Deprecated Severity = "deprecated"
const NonBreaking Severity = "non-breaking"
const Unclassified Severity = "unclassified"

func ValidSeverity(s string) bool {
	switch s {
	case string(Annotation), string(Breaking), string(SemiBreaking), string(Deprecated), string(NonBreaking), string(Unclassified):
		return true
	}
	return false
}

type ApiType string

const RestApiType ApiType = "rest"
const GraphqlApiType ApiType = "graphql"
const ProtobufApiType ApiType = "protobuf"
const AsyncapiApiType ApiType = "asyncapi"

func ParseApiType(s string) (ApiType, error) {
	switch s {
	case string(RestApiType):
		return RestApiType, nil
	case string(GraphqlApiType):
		return GraphqlApiType, nil
	case string(ProtobufApiType):
		return ProtobufApiType, nil
	case string(AsyncapiApiType):
		return AsyncapiApiType, nil
	default:
		return "", fmt.Errorf("unknown API Type: %v", s)
	}
}

func GetDocumentTypesForApiType(apiType string) []string {
	switch apiType {
	case string(RestApiType):
		return []string{OpenAPI20Type, OpenAPI30Type, OpenAPI31Type}
	case string(GraphqlApiType):
		return []string{GraphQLSchemaType, GraphAPIType, IntrospectionType}
	case string(ProtobufApiType):
		return []string{Protobuf3Type}
	case string(AsyncapiApiType):
		return []string{Asyncapi30Type}
	default:
		return []string{}
	}
}

type OperationListReq struct {
	Deprecated     *bool
	Ids            []string
	IncludeData    bool
	Kind           string
	EmptyTag       bool
	Tag            string
	Limit          int
	Page           int
	TextFilter     string
	ApiType        string
	DocumentSlug   string
	EmptyGroup     bool
	Group          string
	OnlyAddable    bool
	RefPackageId   string
	CustomTagKey   string
	CustomTagValue string
	ApiAudience    string
}

type DeprecatedOperationListReq struct {
	Ids                    []string
	Kind                   string
	Tags                   []string
	Limit                  int
	Page                   int
	TextFilter             string
	ApiType                string
	DocumentSlug           string
	IncludeDeprecatedItems bool
	RefPackageId           string
	EmptyTag               bool
	EmptyGroup             bool
	Group                  string
	ApiAudience            string
}

type OperationBasicSearchReq struct {
	PackageId   string
	Version     string
	OperationId string
	Revision    int
	ApiType     string
	ApiKind     string
	Limit       int
	Offset      int
	TextFilter  string
	ApiAudience string
	IncludeData bool
}

type VersionChangesReq struct {
	PreviousVersion          string
	PreviousVersionPackageId string
	DocumentSlug             string
	ApiKind                  string
	EmptyTag                 bool
	RefPackageId             string
	Tags                     []string
	TextFilter               string
	Limit                    int
	Offset                   int
	EmptyGroup               bool
	Group                    string
	Severities               []string
	ApiAudience              string
}

type PagingFilterReq struct {
	Limit      int
	Offset     int
	TextFilter string
}

type DocumentsFilterReq struct {
	ApiType    string
	Limit      int
	Offset     int
	TextFilter string
}

type DocumentsForTransformationFilterReq struct {
	ApiType                string
	Limit                  int
	Offset                 int
	FilterByOperationGroup string
}

type CalculationProcessStatus struct {
	Status  string `json:"status,omitempty"`
	Message string `json:"message"`
}

type DeprecatedOperationsSummary struct {
	OperationTypes *[]DeprecatedOperationType     `json:"operationTypes,omitempty"`
	Refs           *[]DeprecatedOperationTypesRef `json:"refs,omitempty"`
	Packages       *map[string]PackageVersionRef  `json:"packages,omitempty"`
}
type DeprecatedOperationType struct {
	ApiType         string   `json:"apiType"`
	DeprecatedCount int      `json:"deprecatedCount"`
	Tags            []string `json:"tags"`
}
type DeprecatedOperationTypesRef struct {
	PackageRef     string                    `json:"packageRef,omitempty"`
	OperationTypes []DeprecatedOperationType `json:"operationTypes"`
}

type OperationModelUsages struct {
	ModelUsages []OperationModels `json:"modelUsages"`
}

type OperationModels struct {
	OperationId string   `json:"operationId"`
	ModelNames  []string `json:"modelNames"`
}
