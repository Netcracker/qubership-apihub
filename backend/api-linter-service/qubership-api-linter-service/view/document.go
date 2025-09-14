package view

type ApiType string

const (
	OpenAPI31Type ApiType = "openapi-3-1"
	OpenAPI30Type ApiType = "openapi-3-0"
	OpenAPI20Type ApiType = "openapi-2-0"
)

type VersionDocuments struct {
	Documents []PublishedDocument `json:"documents"`
}
type PublishedDocument struct {
	FieldId     string   `json:"fileId"`
	Slug        string   `json:"slug"`
	Type        ApiType  `json:"type"`
	Format      string   `json:"format"`
	Title       string   `json:"title,omitempty"`
	Labels      []string `json:"labels,omitempty"`
	Description string   `json:"description,omitempty"`
	Filename    string   `json:"filename"`
}

type LintedDocumentStatus string

const (
	StatusSuccess LintedDocumentStatus = "success"
	StatusFailure LintedDocumentStatus = "fail"
)

type ValidatedDocument struct {
	Slug    string  `json:"slug"`
	ApiType ApiType `json:"specificationType"`
	DocName string  `json:"documentName"`
}
