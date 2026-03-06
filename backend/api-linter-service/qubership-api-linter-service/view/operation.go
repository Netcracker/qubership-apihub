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
