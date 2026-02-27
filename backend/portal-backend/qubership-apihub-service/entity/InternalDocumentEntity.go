package entity

import (
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type VersionInternalDocumentEntity struct {
	tableName struct{} `pg:"version_internal_document"`

	PackageId  string `pg:"package_id, pk, type:varchar"`
	Version    string `pg:"version, pk, type:varchar"`
	Revision   int    `pg:"revision, pk, type:integer"`
	DocumentId string `pg:"document_id, pk, type:varchar"`
	Filename   string `pg:"filename, type:varchar"`
	Hash       string `pg:"hash, type:varchar"`
}

type VersionInternalDocumentDataEntity struct {
	tableName struct{} `pg:"version_internal_document_data"`

	Hash string `pg:"hash, pk, type:varchar"`
	Data []byte `pg:"data, type:bytea"`
}

type EnrichedVersionInternalDocumentDataEntity struct {
	VersionInternalDocumentDataEntity `pg:",embed"`
	Filename                          string `pg:"filename, type:varchar"`
}

type ComparisonInternalDocumentEntity struct {
	tableName struct{} `pg:"comparison_internal_document"`

	PackageId         string `pg:"package_id, pk, type:varchar, use_zero"`
	Version           string `pg:"version, pk, type:varchar, use_zero"`
	Revision          int    `pg:"revision, pk, type:integer, use_zero"`
	PreviousPackageId string `pg:"previous_package_id, pk, type:varchar, use_zero"`
	PreviousVersion   string `pg:"previous_version, pk, type:varchar, use_zero"`
	PreviousRevision  int    `pg:"previous_revision, pk, type:integer, use_zero"`
	DocumentId        string `pg:"document_id, pk, type:varchar"`
	Filename          string `pg:"filename, type:varchar"`
	Hash              string `pg:"hash, type:varchar"`
}

type ComparisonInternalDocumentDataEntity struct {
	tableName struct{} `pg:"comparison_internal_document_data"`

	Hash string `pg:"hash, pk, type:varchar"`
	Data []byte `pg:"data, type:bytea"`
}

type EnrichedComparisonInternalDocumentDataEntity struct {
	ComparisonInternalDocumentDataEntity `pg:",embed"`
	Filename                             string `pg:"filename, type:varchar"`
}

func MakeVersionInternalDocumentView(ent *VersionInternalDocumentEntity) *view.InternalDocument {
	return &view.InternalDocument{
		Id:       ent.DocumentId,
		Hash:     ent.Hash,
		Filename: ent.Filename,
	}
}

func MakeComparisonInternalDocumentView(ent *ComparisonInternalDocumentEntity) *view.InternalDocument {
	return &view.InternalDocument{
		Id:       ent.DocumentId,
		Hash:     ent.Hash,
		Filename: ent.Filename,
	}
}
