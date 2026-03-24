package view

const OpenAPI31Type string = "openapi-3-1"
const OpenAPI30Type string = "openapi-3-0"
const OpenAPI20Type string = "openapi-2-0"

type Specification struct {
	Name     string `json:"name"`
	Path     string `json:"-"`
	Format   string `json:"format"` // json or yaml
	FileId   string `json:"fileId"`
	Type     string `json:"type"`
	XApiKind string `json:"xApiKind,omitempty"`
}
