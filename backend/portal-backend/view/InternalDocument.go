package view

type VersionInternalDocumentsFile struct {
	Documents []VersionInternalDocument `json:"documents" validate:"dive,required"`
}

type InternalDocument struct {
	Id       string `json:"id" validate:"required"`
	Filename string `json:"filename" validate:"required"`
	Hash     string `json:"hash"`
}

type VersionInternalDocument struct {
	InternalDocument
}

type ComparisonInternalDocumentsFile struct {
	Documents []ComparisonInternalDocument `json:"documents" validate:"dive,required"`
}

type ComparisonInternalDocument struct {
	InternalDocument
	ComparisonFileId string `json:"comparisonFileId" validate:"required"`
}
