package view

type RestOperations struct {
	Operations []RestOperationView          `json:"operations"`
	Packages   map[string]PackageVersionRef `json:"packages,omitempty"`
}

type RestOperationView struct {
	OperationListView
	RestOperationMetadata
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

type RestOperationMetadata struct {
	Path   string   `json:"path"`
	Method string   `json:"method"`
	Tags   []string `json:"tags,omitempty"`
}
