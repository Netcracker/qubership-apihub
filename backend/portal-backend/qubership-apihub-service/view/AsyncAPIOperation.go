package view

const (
	SendAction    string = "send"
	ReceiveAction string = "receive"
)

func ValidAsyncAPIAction(actionValue string) bool {
	switch actionValue {
	case SendAction, ReceiveAction:
		return true
	}
	return false
}

type AsyncAPIOperationMetadata struct {
	Action   string   `json:"action"`
	Channel  string   `json:"channel"`
	Protocol string   `json:"protocol"`
	Tags     []string `json:"tags,omitempty"`
}

type AsyncAPIOperationSingleView struct {
	SingleOperationView
	AsyncAPIOperationMetadata
}

type AsyncAPIOperationView struct {
	OperationListView
	AsyncAPIOperationMetadata
}

type DeprecatedAsyncAPIOperationView struct {
	DeprecatedOperationView
	AsyncAPIOperationMetadata
}

type AsyncAPIOperationComparisonChangelogView struct {
	GenericComparisonOperationView
	AsyncAPIOperationMetadata
}

type AsyncAPIOperationComparisonChangesView struct {
	OperationComparisonChangesView
	AsyncAPIOperationMetadata
}

type AsyncAPIOperationPairChangesView struct {
	CurrentOperation             *AsyncAPIOperationComparisonChangelogView `json:"currentOperation,omitempty"`
	PreviousOperation            *AsyncAPIOperationComparisonChangelogView `json:"previousOperation,omitempty"`
	ChangeSummary                ChangeSummary                             `json:"changeSummary"`
	ComparisonInternalDocumentId string                                    `json:"comparisonInternalDocumentId"`
}
