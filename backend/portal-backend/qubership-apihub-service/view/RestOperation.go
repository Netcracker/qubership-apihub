package view

type RestOperationMetadata struct {
	Path   string   `json:"path"`
	Method string   `json:"method"`
	Tags   []string `json:"tags,omitempty"`
}

type RestOperationSingleView struct {
	SingleOperationView
	RestOperationMetadata
}

type RestOperationView struct {
	OperationListView
	RestOperationMetadata
}

type DeprecatedRestOperationView struct {
	DeprecatedOperationView
	RestOperationMetadata
}

type RestOperationComparisonChangelogView struct {
	GenericComparisonOperationView
	RestOperationMetadata
}

type RestOperationComparisonChangesView struct {
	OperationComparisonChangesView
	RestOperationMetadata
}

type RestOperationPairChangesView struct {
	CurrentOperation             *RestOperationComparisonChangelogView `json:"currentOperation,omitempty"`
	PreviousOperation            *RestOperationComparisonChangelogView `json:"previousOperation,omitempty"`
	ChangeSummary                ChangeSummary                         `json:"changeSummary"`
	ComparisonInternalDocumentId string                                `json:"comparisonInternalDocumentId"`
}
