package view

type ApiType string

const (
	OpenAPI31Type ApiType = "openapi-3-1"
	OpenAPI30Type ApiType = "openapi-3-0"
	OpenAPI20Type ApiType = "openapi-2-0"

	AsyncAPI30Type ApiType = "asyncapi-3-0"
)

type VersionDocuments struct {
	Documents []PublishedDocument `json:"documents"`
}

type DocumentOperation struct {
	OperationId string    `json:"operationId"`
	Title       string    `json:"title"`
	DataHash    string    `json:"dataHash"`
	ApiKind     string    `json:"apiKind"`
	ApiType     OpApiType `json:"apiType"`
	ApiAudience string    `json:"apiAudience"`
	Path        string    `json:"path"`
	Method      string    `json:"method"`
	Tags        []string  `json:"tags"`
}
type PublishedDocument struct {
	FileId       string              `json:"fileId"`
	Slug         string              `json:"slug"`
	Type         ApiType             `json:"type"`
	Format       string              `json:"format"`
	Title        string              `json:"title,omitempty"`
	Labels       []string            `json:"labels,omitempty"`
	Description  string              `json:"description,omitempty"`
	Version      string              `json:"version,omitempty"`
	Info         interface{}         `json:"info,omitempty"`
	ExternalDocs interface{}         `json:"externalDocs,omitempty"`
	Operations   []DocumentOperation `json:"operations,omitempty"`
	Filename     string              `json:"filename"`
	Tags         []interface{}       `json:"tags"`
	HasErrors    bool                `json:"hasErrors"`
}

type LintedDocumentStatus string

const (
	StatusSuccess LintedDocumentStatus = "success"
	StatusError   LintedDocumentStatus = "error"
)

type ValidatedDocument struct {
	Slug    string  `json:"slug"`
	ApiType ApiType `json:"specificationType"`
	DocName string  `json:"documentName"`
}
