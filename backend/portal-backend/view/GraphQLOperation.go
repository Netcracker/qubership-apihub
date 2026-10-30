package view

const (
	QueryType        string = "query"
	MutationType     string = "mutation"
	SubscriptionType string = "subscription"
)

func ValidGraphQLOperationType(typeValue string) bool {
	switch typeValue {
	case QueryType, MutationType, SubscriptionType:
		return true
	}
	return false
}

type GraphQLOperationMetadata struct {
	Type   string   `json:"type"`
	Method string   `json:"method"`
	Tags   []string `json:"tags"`
}

type GraphQLOperationSingleView struct {
	SingleOperationView
	GraphQLOperationMetadata
}

type GraphQLOperationView struct {
	OperationListView
	GraphQLOperationMetadata
}
type DeprecateGraphQLOperationView struct {
	DeprecatedOperationView
	GraphQLOperationMetadata
}

type GraphQLOperationComparisonChangesView struct {
	OperationComparisonChangesView
	GraphQLOperationMetadata
}

type GraphqlOperationComparisonChangelogView struct {
	GenericComparisonOperationView
	GraphQLOperationMetadata
}

type GraphqlOperationPairChangesView struct {
	CurrentOperation             *GraphqlOperationComparisonChangelogView `json:"currentOperation,omitempty"`
	PreviousOperation            *GraphqlOperationComparisonChangelogView `json:"previousOperation,omitempty"`
	ChangeSummary                ChangeSummary                            `json:"changeSummary"`
	ComparisonInternalDocumentId string                                   `json:"comparisonInternalDocumentId"`
}
