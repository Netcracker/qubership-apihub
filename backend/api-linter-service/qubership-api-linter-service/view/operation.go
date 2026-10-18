package view

import "encoding/json"

type OpApiType string

const RestApiType OpApiType = "rest"
const GraphqlApiType OpApiType = "graphql"
const ProtobufApiType OpApiType = "protobuf"
const AsyncapiApiType OpApiType = "asyncapi"

type Operation struct {
	Data        json.RawMessage `json:"data"`
	OperationId string          `json:"operationId"`
	Title       string          `json:"title"`
	DataHash    string          `json:"dataHash"`
	ApiKind     string          `json:"apiKind"`
	ApiType     OpApiType       `json:"apiType"`
	ApiAudience string          `json:"apiAudience"`
	Path        string          `json:"path"`
	Method      string          `json:"method"`
	Tags        []string        `json:"tags"`
}

type OperationListRequest struct {
	Page       int
	Limit      int
	Deprecated string
	Kind       string
}

type CommonOperations struct {
	Operations []OperationListView `json:"operations"`
	// Packages   map[string]PackageVersionRef `json:"packages,omitempty"`
}

type OperationListView struct {
	CommonOperationView
	PackageRef string                 `json:"packageRef,omitempty"`
	Data       map[string]interface{} `json:"data,omitempty"`
}

type CommonOperationView struct {
	OperationId string `json:"operationId"`
	Title       string `json:"title"`
	DataHash    string `json:"dataHash"`
	Deprecated  bool   `json:"deprecated,omitempty"`
	ApiKind     string `json:"apiKind"`
	ApiType     string `json:"apiType"`
	ApiAudience string `json:"apiAudience"`
}

func ApiTypeToOpApiType(apiType ApiType) OpApiType {
	switch apiType {
	case OpenAPI20Type, OpenAPI30Type, OpenAPI31Type:
		return RestApiType
	case AsyncAPI30Type:
		return AsyncapiApiType
	default:
		return ""
	}
}
