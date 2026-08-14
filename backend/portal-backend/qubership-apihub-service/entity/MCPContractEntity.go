package entity

import "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"

type MCPContractEntity struct {
	tableName struct{} `pg:"mcp_entities, alias:mcp_entities"`

	PackageId                 string   `pg:"package_id, pk, type:varchar"`
	Version                   string   `pg:"version, pk, type:varchar"`
	Revision                  int      `pg:"revision, pk, type:integer"`
	McpEntityId               string   `pg:"mcp_entity_id, pk, type:varchar"`
	Kind                      string   `pg:"kind, type:varchar, use_zero"`
	Title                     string   `pg:"title, type:varchar, use_zero"`
	Description               string   `pg:"description, type:varchar, use_zero"`
	McpEndpoint               string   `pg:"mcp_endpoint, type:varchar, use_zero"`
	Metadata                  Metadata `pg:"metadata, type:jsonb"`
	DataHash                  *string  `pg:"data_hash, type:varchar"`
	DocumentId                string   `pg:"document_id, type:varchar, use_zero"`
	VersionInternalDocumentId string   `pg:"version_internal_document_id, type:varchar, use_zero"`
}

type MCPContractDataEntity struct {
	tableName struct{} `pg:"mcp_entity_data, alias:mcp_entity_data"`

	DataHash string `pg:"data_hash, pk, type:varchar"`
	Data     []byte `pg:"data, type:bytea"`
}

type MCPContractSearchTextEntity struct {
	// no go-pg mapping due to different insert/lookup process

	PackageId      string
	Version        string
	Revision       int
	McpEntityId    string
	Status         string
	Kind           string
	SearchDataHash string
	SearchTextData []byte
}

type FtsMcpSearchTextEntity struct {
	tableName struct{} `pg:"fts_mcp_search_text"`

	McpEntityId    string `pg:"mcp_entity_id, type:varchar"`
	SearchDataHash string `pg:"search_data_hash, type:varchar"`
}

type MCPContractKindCountEntity struct {
	Kind  string `pg:"kind, type:varchar"`
	Count int    `pg:"count, type:integer"`
}

type MCPContractEndpointCountEntity struct {
	McpEndpoint string `pg:"mcp_endpoint, type:varchar"`
	Kind        string `pg:"kind, type:varchar"`
	Count       int    `pg:"count, type:integer"`
}

func MakeMcpEntityView(ent *MCPContractEntity) *view.McpEntityView {
	return &view.McpEntityView{
		McpEntityId: ent.McpEntityId,
		Kind:        ent.Kind,
		Title:       ent.Title,
		Description: ent.Description,
		McpEndpoint: ent.McpEndpoint,
		DocumentId:  ent.DocumentId,
		PackageRef:  view.MakePackageRefKey(ent.PackageId, ent.Version, ent.Revision),
	}
}
