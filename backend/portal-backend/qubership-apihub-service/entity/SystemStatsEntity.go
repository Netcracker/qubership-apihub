package entity

import "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"

type PackageGroupCountsEntity struct {
	Workspaces        int `pg:"workspaces"`
	DeletedWorkspaces int `pg:"deleted_workspaces"`
	Groups            int `pg:"groups"`
	DeletedGroups     int `pg:"deleted_groups"`
	Packages          int `pg:"packages"`
	DeletedPackages   int `pg:"deleted_packages"`
	Dashboards        int `pg:"dashboards"`
	DeletedDashboards int `pg:"deleted_dashboards"`
}

type RevisionsCountEntity struct {
	Revisions        int `pg:"revisions"`
	DeletedRevisions int `pg:"deleted_revisions"`
}

type BuildsCountEntity struct {
	BuildType        string `pg:"build_type"`
	NotStarted       int    `pg:"not_started"`
	Running          int    `pg:"running"`
	FailedLastWeek   int    `pg:"failed_last_week"`
	SucceedLastWeek  int    `pg:"succeed_last_week"`
	RestartsLastWeek int    `pg:"restarts_last_week"`
}

func (e *BuildsCountEntity) MakeBuildsCountView() view.BuildsCount {
	return view.BuildsCount{
		NotStarted:       e.NotStarted,
		Running:          e.Running,
		FailedLastWeek:   e.FailedLastWeek,
		SucceedLastWeek:  e.SucceedLastWeek,
		RestartsLastWeek: e.RestartsLastWeek,
	}
}

type TableSizeEntity struct {
	TableName      string  `pg:"table_name"`
	RowEstimate    float64 `pg:"row_estimate"`
	TotalSize      string  `pg:"total"`
	IndexSize      string  `pg:"index"`
	ToastSize      string  `pg:"toast"`
	TableSize      string  `pg:"table"`
	TotalSizeShare float64 `pg:"total_size_share"`
}

func (e *TableSizeEntity) MakeTableSizeInfoView() view.TableSizeInfo {
	return view.TableSizeInfo{
		TableName:      e.TableName,
		RowEstimate:    e.RowEstimate,
		TotalSize:      e.TotalSize,
		IndexSize:      e.IndexSize,
		ToastSize:      e.ToastSize,
		TableSize:      e.TableSize,
		TotalSizeShare: e.TotalSizeShare,
	}
}
