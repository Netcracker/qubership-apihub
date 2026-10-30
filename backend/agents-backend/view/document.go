package view

type Document struct {
	Name       string `json:"name"`
	Format     string `json:"format"`
	FileId     string `json:"fileId"`
	Type       string `json:"type"`
	XApiKind   string `json:"xApiKind,omitempty"`
	DocPath    string `json:"docPath"`
	ConfigPath string `json:"configPath,omitempty"`
}
