package view

type Document_deprecated struct {
	Name     string `json:"name"`
	Path     string `json:"originalPath"`
	Format   string `json:"format"`
	FileId   string `json:"fileId"`
	Type     string `json:"type"`
	XApiKind string `json:"xApiKind,omitempty"`
}

type Document struct {
	Name       string `json:"name"`
	Format     string `json:"format"`
	FileId     string `json:"fileId"`
	Type       string `json:"type"`
	XApiKind   string `json:"xApiKind,omitempty"`
	DocPath    string `json:"docPath"`
	ConfigPath string `json:"configPath,omitempty"`
}

func (d *Document) ToDeprecated() Document_deprecated {
	return Document_deprecated{
		Name:     d.Name,
		Path:     d.DocPath,
		Format:   d.Format,
		FileId:   d.FileId,
		Type:     d.Type,
		XApiKind: d.XApiKind,
	}
}

const FormatJson string = "json"
const FormatYaml string = "yaml"
const FormatGraphql string = "graphql"
