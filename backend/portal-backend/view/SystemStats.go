package view

type SystemStats struct {
	BusinessEntities BusinessEntitiesCount     `json:"businessEntities"`
	Builds           map[BuildType]BuildsCount `json:"builds"`
	DatabaseSize     []TableSizeInfo           `json:"databaseSize"`
}

type BusinessEntitiesCount struct {
	Workspaces         int `json:"workspaces"`
	DeletedWorkspaces  int `json:"deletedWorkspaces"`
	Groups             int `json:"groups"`
	DeletedGroups      int `json:"deletedGroups"`
	Packages           int `json:"packages"`
	DeletedPackages    int `json:"deletedPackages"`
	Dashboards         int `json:"dashboards"`
	DeletedDashboards  int `json:"deletedDashboards"`
	Revisions          int `json:"revisions"`
	DeletedRevisions   int `json:"deletedRevisions"`
	Documents          int `json:"documents"`
	Operations         int `json:"operations"`
	VersionComparisons int `json:"versionComparisons"`
}

type BuildsCount struct {
	NotStarted       int `json:"notStarted"`
	Running          int `json:"running"`
	FailedLastWeek   int `json:"failedLastWeek"`
	SucceedLastWeek  int `json:"succeedLastWeek"`
	RestartsLastWeek int `json:"restartsLastWeek"`
}

type TableSizeInfo struct {
	TableName      string  `json:"tableName"`
	RowEstimate    float64 `json:"rowEstimate"`
	TotalSize      string  `json:"totalSize"`
	IndexSize      string  `json:"indexSize"`
	ToastSize      string  `json:"toastSize"`
	TableSize      string  `json:"tableSize"`
	TotalSizeShare float64 `json:"totalSizeShare"`
}
