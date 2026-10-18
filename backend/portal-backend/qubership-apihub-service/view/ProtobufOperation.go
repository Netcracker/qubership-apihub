package view

const (
	UnaryType                  string = "unary"
	ServerStreamingType        string = "serverStreaming"
	ClientStreamingType        string = "clientStreaming"
	BidirectionalStreamingType string = "bidirectionalStreaming"
)

func ValidProtobufOperationType(typeValue string) bool {
	switch typeValue {
	case UnaryType, ServerStreamingType, ClientStreamingType, BidirectionalStreamingType:
		return true
	}
	return false
}

type ProtobufOperationMetadata struct {
	Type   string `json:"type"`
	Method string `json:"method"`
}

type ProtobufOperationSingleView struct {
	SingleOperationView
	ProtobufOperationMetadata
}

type ProtobufOperationView struct {
	OperationListView
	ProtobufOperationMetadata
}
type DeprecateProtobufOperationView struct {
	DeprecatedOperationView
	ProtobufOperationMetadata
}

type ProtobufOperationComparisonChangesView struct {
	OperationComparisonChangesView
	ProtobufOperationMetadata
}

type ProtobufOperationComparisonChangelogView struct {
	GenericComparisonOperationView
	ProtobufOperationMetadata
}

type ProtobufOperationPairChangesView struct {
	CurrentOperation             *ProtobufOperationComparisonChangelogView `json:"currentOperation,omitempty"`
	PreviousOperation            *ProtobufOperationComparisonChangelogView `json:"previousOperation,omitempty"`
	ChangeSummary                ChangeSummary                             `json:"changeSummary"`
	ComparisonInternalDocumentId string                                    `json:"comparisonInternalDocumentId"`
}
