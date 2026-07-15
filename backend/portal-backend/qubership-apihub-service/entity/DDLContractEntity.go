package entity

import "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"

type DDLContractEntity struct {
	tableName struct{} `pg:"ddl_tables"`

	PackageId                 string   `pg:"package_id, pk, type:varchar"`
	Version                   string   `pg:"version, pk, type:varchar"`
	Revision                  int      `pg:"revision, pk, type:integer"`
	DdlEntityId               string   `pg:"ddl_entity_id, pk, type:varchar"`
	Kind                      string   `pg:"kind, type:varchar, use_zero"`
	SchemaName                string   `pg:"schema_name, type:varchar, use_zero"`
	Name                      string   `pg:"name, type:varchar, use_zero"`
	Description               string   `pg:"description, type:varchar, use_zero"`
	Metadata                  Metadata `pg:"metadata, type:jsonb"`
	DataHash                  *string  `pg:"data_hash, type:varchar"`
	DocumentId                string   `pg:"document_id, type:varchar, use_zero"`
	VersionInternalDocumentId string   `pg:"version_internal_document_id, type:varchar, use_zero"`
}

type DDLContractDataEntity struct {
	tableName struct{} `pg:"ddl_table_data, alias:ddl_table_data"`

	DataHash string `pg:"data_hash, pk, type:varchar"`
	Data     []byte `pg:"data, type:bytea"`
}

type DDLContractComparisonEntity struct {
	tableName struct{} `pg:"ddl_comparison"`

	PackageId                    string             `pg:"package_id, type:varchar, use_zero"`
	Version                      string             `pg:"version, type:varchar, use_zero"`
	Revision                     int                `pg:"revision, type:integer, use_zero"`
	PreviousPackageId            string             `pg:"previous_package_id, type:varchar, use_zero"`
	PreviousVersion              string             `pg:"previous_version, type:varchar, use_zero"`
	PreviousRevision             int                `pg:"previous_revision, type:integer, use_zero"`
	DdlEntityId                  string             `pg:"ddl_entity_id, type:varchar, use_zero"`
	PreviousDdlEntityId          string             `pg:"previous_ddl_entity_id, type:varchar, use_zero"`
	ComparisonId                 string             `pg:"comparison_id, type:varchar"`
	DataHash                     *string            `pg:"data_hash, type:varchar"`
	PreviousDataHash             *string            `pg:"previous_data_hash, type:varchar"`
	Kind                         string             `pg:"kind, type:varchar, use_zero"`
	PreviousKind                 string             `pg:"previous_kind, type:varchar, use_zero"`
	Name                         string             `pg:"name, type:varchar, use_zero"`
	PreviousName                 string             `pg:"previous_name, type:varchar, use_zero"`
	SchemaName                   string             `pg:"schema_name, type:varchar, use_zero"`
	PreviousSchemaName           string             `pg:"previous_schema_name, type:varchar, use_zero"`
	Description                  string             `pg:"description, type:varchar, use_zero"`
	PreviousDescription          string             `pg:"previous_description, type:varchar, use_zero"`
	ChangesSummary               view.ChangeSummary `pg:"changes_summary, type:jsonb"`
	Changes                      interface{}        `pg:"changes, type:jsonb"`
	ComparisonInternalDocumentId string             `pg:"comparison_internal_document_id, type:varchar, use_zero"`
}

type DDLContractSearchTextEntity struct {
	// no go-pg mapping due to different insert/lookup process

	PackageId      string
	Version        string
	Revision       int
	DdlEntityId    string
	Status         string
	Kind           string
	SearchDataHash string
	SearchTextData []byte
}

type DDLContractKindCountEntity struct {
	Kind  string `pg:"kind, type:varchar"`
	Count int    `pg:"count, type:integer"`
}

func MakeDdlContractEntityView(ent *DDLContractEntity, data []byte) *view.DdlContractEntityView {
	result := &view.DdlContractEntityView{
		DdlEntityId:               ent.DdlEntityId,
		Kind:                      ent.Kind,
		SchemaName:                ent.SchemaName,
		Name:                      ent.Name,
		Description:               ent.Description,
		DocumentId:                ent.DocumentId,
		VersionInternalDocumentId: ent.VersionInternalDocumentId,
		PackageRef:                view.MakePackageRefKey(ent.PackageId, ent.Version, ent.Revision),
	}
	if len(data) > 0 {
		result.Data = string(data)
	}
	return result
}

func MakeDdlChangedEntityView(ent *DDLContractComparisonEntity) view.DdlChangedEntityView {
	result := view.DdlChangedEntityView{
		ChangeSummary:                ent.ChangesSummary,
		ComparisonInternalDocumentId: ent.ComparisonInternalDocumentId,
	}
	if ent.DdlEntityId != "" {
		result.DdlEntityData = &view.DdlEntityData{
			DdlEntityId: ent.DdlEntityId,
			Kind:        ent.Kind,
			Name:        ent.Name,
			SchemaName:  ent.SchemaName,
			Description: ent.Description,
			PackageRef:  view.MakePackageRefKey(ent.PackageId, ent.Version, ent.Revision),
		}
	}
	if ent.PreviousDdlEntityId != "" {
		result.PreviousDdlEntityData = &view.DdlEntityData{
			DdlEntityId: ent.PreviousDdlEntityId,
			Kind:        ent.PreviousKind,
			Name:        ent.PreviousName,
			SchemaName:  ent.PreviousSchemaName,
			Description: ent.PreviousDescription,
			PackageRef:  view.MakePackageRefKey(ent.PreviousPackageId, ent.PreviousVersion, ent.PreviousRevision),
		}
	}
	return result
}
