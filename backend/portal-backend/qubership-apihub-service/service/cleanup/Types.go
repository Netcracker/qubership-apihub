package cleanup

import (
	"context"
	"time"
)

type jobType string
type jobStatus string

const (
	revisionsCleanup        jobType = "revisions cleanup"
	comparisonsCleanup      jobType = "comparisons cleanup"
	deletedDataCleanup      jobType = "soft deleted data cleanup"
	unreferencedDataCleanup jobType = "unreferenced data cleanup"

	statusRunning  jobStatus = "running"
	statusComplete jobStatus = "complete"
	statusError    jobStatus = "error"
	statusTimeout  jobStatus = "timeout"
)

type JobProcessor interface {
	Initialize(ctx context.Context, jobId string, instanceId string, deleteBefore time.Time) error
	Process(ctx context.Context, jobId string, deleteBefore time.Time, deletedItems *int) ([]string, error)
	UpdateProgress(ctx context.Context, jobId string, status jobStatus, errorMessage string, deletedItems int, finishedAt *time.Time) error
	GetVacuumTimeout() time.Duration
	PerformVacuum(ctx context.Context, jobId string) error
}

type jobConfig struct {
	jobType    jobType
	instanceId string
	ttl        int
	timeout    time.Duration
}
