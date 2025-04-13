package view

type Document struct {
	Name     string `json:"name"`
	Path     string `json:"originalPath"`
	Format   string `json:"format"`
	FileId   string `json:"fileId"`
	Type     string `json:"type"`
	XApiKind string `json:"xApiKind,omitempty"`
}

const FormatJson string = "json"
const FormatYaml string = "yaml"
const FormatGraphql string = "graphql"
