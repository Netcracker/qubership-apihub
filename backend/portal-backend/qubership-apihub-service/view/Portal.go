package view

type DocumentationType string

const DTInteractive DocumentationType = "INTERACTIVE"
const DTStatic DocumentationType = "STATIC"
const DTPdf DocumentationType = "PDF"
const DTRaw DocumentationType = "RAW"

func GetDtFromStr(str string) DocumentationType {
	switch str {
	case "INTERACTIVE":
		return DTInteractive
	case "STATIC":
		return DTStatic
	case "PDF":
		return DTPdf
	case "RAW":
		return DTRaw
	case "":
		return DTInteractive
	}
	return DocumentationType(str)
}

type VersionDocMetadata struct {
	GitLink           string         `json:"gitLink"`
	Branch            string         `json:"branch"`
	DateOfPublication string         `json:"dateOfPublication"`
	CommitId          string         `json:"commitId"`
	Version           string         `json:"version"`
	Revision          int            `json:"revision"`
	User              string         `json:"user"`
	Labels            []string       `json:"labels"`
	Files             []FileMetadata `json:"files"`
}

type FileMetadata struct {
	Type     string    `json:"type"`
	Name     string    `json:"name"` // title
	Format   string    `json:"format"`
	Slug     string    `json:"slug"`
	Labels   []string  `json:"labels,omitempty"`
	Openapi  *Openapi  `json:"openapi,omitempty"`
	Asyncapi *Asyncapi `json:"asyncapi,omitempty"`
}
