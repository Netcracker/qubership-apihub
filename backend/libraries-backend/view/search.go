package view

type SearchResultLibrary struct {
	LibraryId      string   `json:"libraryId"`
	Name           string   `json:"name"`
	Alias          string   `json:"alias,omitempty"`
	Language       Language `json:"language,omitempty"`
	Repository     string   `json:"repository,omitempty"`
	CoordinatesKey string   `json:"coordinatesKey,omitempty"`
}

type SearchLibrariesResult struct {
	Libraries []SearchResultLibrary `json:"libraries"`
}

type SearchResultClass struct {
	LibraryId     string    `json:"libraryId"`
	Version       string    `json:"version"`
	ClassId       string    `json:"classId"`
	QualifiedName string    `json:"qualifiedName"`
	PackageName   string    `json:"packageName,omitempty"`
	Kind          ClassKind `json:"kind,omitempty"`
	MethodId      string    `json:"methodId,omitempty"`
	Signature     string    `json:"signature,omitempty"`
}

type SearchClassesResult struct {
	Classes []SearchResultClass `json:"classes"`
}

type SearchLibrariesReq struct {
	TextFilter string
	Language   Language
	Repository string
	Limit      int
	Page       int
}

type SearchClassesReq struct {
	TextFilter string
	LibraryId  string
	Version    string
	Kind       []ClassKind
	Limit      int
	Page       int
}
