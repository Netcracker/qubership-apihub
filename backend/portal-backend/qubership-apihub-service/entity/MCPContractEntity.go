package entity

type MCPContractEntity struct {
	tableName struct{} `pg:"mcp_entities"`

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

type MCPContractKindCountEntity struct {
	Kind  string `pg:"kind, type:varchar"`
	Count int    `pg:"count, type:integer"`
}

type MCPContractEndpointCountEntity struct {
	McpEndpoint string `pg:"mcp_endpoint, type:varchar"`
	Kind        string `pg:"kind, type:varchar"`
	Count       int    `pg:"count, type:integer"`
}
