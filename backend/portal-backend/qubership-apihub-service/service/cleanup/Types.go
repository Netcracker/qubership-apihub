// Copyright 2024-2025 NetCracker Technology Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
