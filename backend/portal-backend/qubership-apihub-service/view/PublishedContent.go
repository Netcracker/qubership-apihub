package view

type PublishedContent struct {
	ContentId   string       `json:"fileId"`
	Type        ShortcutType `json:"type"`
	Format      string       `json:"format"`
	Path        string       `json:"-"`
	Name        string       `json:"-"`
	Index       int          `json:"-"`
	Slug        string       `json:"slug"`
	Labels      []string     `json:"labels,omitempty"`
	Title       string       `json:"title,omitempty"`
	Version     string       `json:"version,omitempty"`
	ReferenceId string       `json:"refId,omitempty"`
	Openapi     *Openapi     `json:"openapi,omitempty"`
	Asyncapi    *Asyncapi    `json:"asyncapi,omitempty"`
}

type SharedUrlResult_deprecated struct {
	SharedId string `json:"sharedId"`
}

type PublishedDocument struct {
	FieldId      string        `json:"fileId"`
	Slug         string        `json:"slug"`
	Type         string        `json:"type"`
	Format       string        `json:"format"`
	Title        string        `json:"title,omitempty"`
	Labels       []string      `json:"labels,omitempty"`
	Description  string        `json:"description,omitempty"`
	Version      string        `json:"version,omitempty"`
	Info         interface{}   `json:"info,omitempty"`
	ExternalDocs interface{}   `json:"externalDocs,omitempty"`
	Operations   []interface{} `json:"operations,omitempty"`
	Filename     string        `json:"filename"`
	Tags         []interface{} `json:"tags"`
}

type PublishedDocumentRefView struct {
	FieldId              string   `json:"fileId"`
	Slug                 string   `json:"slug"`
	Type                 string   `json:"type"`
	Format               string   `json:"format"`
	Title                string   `json:"title,omitempty"`
	Labels               []string `json:"labels,omitempty"`
	Description          string   `json:"description,omitempty"`
	Version              string   `json:"version,omitempty"`
	Filename             string   `json:"filename"`
	PackageRef           string   `json:"packageRef"`
	IncludedOperationIds []string `json:"includedOperationIds"`
}

type DocumentsForTransformationView struct {
	Documents []DocumentForTransformationView `json:"documents"`
	Packages  map[string]PackageVersionRef    `json:"packages,omitempty"`
}

type DocumentForTransformationView struct {
	FieldId              string   `json:"fileId"`
	Slug                 string   `json:"slug"`
	Type                 string   `json:"type"`
	Format               string   `json:"format"`
	Title                string   `json:"title,omitempty"`
	Labels               []string `json:"labels,omitempty"`
	Description          string   `json:"description,omitempty"`
	Version              string   `json:"version,omitempty"`
	Filename             string   `json:"filename"`
	IncludedOperationIds []string `json:"includedOperationIds,omitempty"`
	Data                 []byte   `json:"data"`
	PackageRef           string   `json:"packageRef"`
}

type Openapi struct {
	Operations  []OpenapiOperation `json:"operations,omitempty"`
	Description string             `json:"description,omitempty"`
	Version     string             `json:"version,omitempty"`
	Title       string             `json:"title"`
}

type OpenapiOperation struct {
	Path   string   `json:"path"`
	Method string   `json:"method"`
	Tile   string   `json:"tile"`
	Tags   []string `json:"tags"`
}

type Asyncapi struct {
	Operations  []AsyncapiOperation `json:"operations,omitempty"`
	Description string              `json:"description,omitempty"`
	Version     string              `json:"version,omitempty"`
	Title       string              `json:"title"`
}

type AsyncapiOperation struct {
	Channel  string   `json:"channel"`
	Action   string   `json:"action"`
	Protocol string   `json:"protocol"`
	Tags     []string `json:"tags"`
}
