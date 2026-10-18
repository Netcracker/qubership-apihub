package view

type DdlEntityListView struct {
	Entities []interface{}                `json:"entities"`
	Packages map[string]PackageVersionRef `json:"packages,omitempty"`
}

type DdlContractEntityView struct {
	DdlEntityId               string `json:"ddlEntityId"`
	Kind                      string `json:"kind"`
	SchemaName                string `json:"schemaName"`
	Name                      string `json:"name"`
	Description               string `json:"description"`
	DocumentId                string `json:"documentId"`
	VersionInternalDocumentId string `json:"versionInternalDocumentId"`
	PackageRef                string `json:"packageRef,omitempty"`
	Data                      string `json:"data,omitempty"`
}

type DdlEntityDetailView struct {
	DdlContractEntityView
}

type DdlEntityChangesView struct {
	Changes []interface{} `json:"changes"`
}

// DdlEntityData mirrors the build-result DDL entity shape (see view.DdlChangesDto)
// used in the changed-DDL-entities response.
type DdlEntityData struct {
	DdlEntityId string `json:"ddlEntityId"`
	Kind        string `json:"kind"`
	Name        string `json:"name"`
	SchemaName  string `json:"schemaName"`
	Description string `json:"description"`
	PackageRef  string `json:"packageRef,omitempty"`
}

type DdlChangedEntityView struct {
	ChangeSummary                ChangeSummary  `json:"changeSummary"`
	ComparisonInternalDocumentId string         `json:"comparisonInternalDocumentId"`
	DdlEntityData                *DdlEntityData `json:"ddlEntityData,omitempty"`
	PreviousDdlEntityData        *DdlEntityData `json:"previousDdlEntityData,omitempty"`
}

type DdlChangedEntitiesView struct {
	PreviousVersion          string                       `json:"previousVersion,omitempty"`
	PreviousVersionPackageId string                       `json:"previousVersionPackageId,omitempty"`
	Entities                 []interface{}                `json:"entities"`
	Packages                 map[string]PackageVersionRef `json:"packages,omitempty"`
}

type DdlChangesReq struct {
	PreviousVersion          string
	PreviousVersionPackageId string
	RefPackageId             string
	Severities               []string
	TextFilter               string
	Limit                    int
	Offset                   int
}

const DdlKindTable = "table"
const DdlKindView = "view"

type DdlContractSearchResult struct {
	PackageId      string   `json:"packageId"`
	PackageName    string   `json:"name"`
	ParentPackages []string `json:"parentPackages"`
	VersionStatus  string   `json:"status"`
	Version        string   `json:"version"`
	EntityId       string   `json:"entityId"`
	Kind           string   `json:"kind"`
	SchemaName     string   `json:"schemaName,omitempty"`
	EntityName     string   `json:"entityName,omitempty"`
}
