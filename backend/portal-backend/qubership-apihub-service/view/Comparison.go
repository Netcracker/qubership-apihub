package view

type VersionComparisonSummary struct {
	OperationTypes *[]OperationType              `json:"operationTypes,omitempty"`
	Refs           *[]RefComparison              `json:"refs,omitempty"`
	Packages       *map[string]PackageVersionRef `json:"packages,omitempty"`
	NoContent      bool                          `json:"noContent,omitempty"`
	Contracts      *ContractsSummary             `json:"contractsChangesSummary,omitempty"`
}

type ContractsSummary struct {
	DDL *DDLContractsSummary `json:"ddl,omitempty"`
}

type DDLContractsSummary struct {
	ChangesSummary           ChangeSummary `json:"changesSummary"`
	NumberOfImpactedEntities ChangeSummary `json:"numberOfImpactedEntities"`
}

type RefComparison struct {
	PackageRef         string          `json:"packageRef,omitempty"`
	PreviousPackageRef string          `json:"previousPackageRef,omitempty"`
	OperationTypes     []OperationType `json:"operationTypes"`
	NoContent          bool            `json:"noContent,omitempty"`
}
