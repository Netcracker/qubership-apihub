package service

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/entity"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/repository"
)

type validationProcessRepoStub struct {
	repository.ValidationProcessRepository

	revisions []entity.VersionValidationProcess
	started   map[int]bool
	startErrs map[int]error

	calls []string
}

func (r *validationProcessRepoStub) CreateProcess(_ context.Context, _ entity.VersionValidationProcess, _ entity.VersionLintTask, _ entity.VersionScoringTask) error {
	return nil
}

func (r *validationProcessRepoStub) FinishCompletedProcesses(_ context.Context) error {
	r.calls = append(r.calls, "finish")
	return nil
}

func (r *validationProcessRepoStub) GetQueuedRevisions(_ context.Context) ([]entity.VersionValidationProcess, error) {
	r.calls = append(r.calls, "queued")
	return r.revisions, nil
}

func (r *validationProcessRepoStub) StartNextProcess(_ context.Context, _ string, _ string, revision int) (bool, error) {
	r.calls = append(r.calls, fmt.Sprintf("start %d", revision))
	return r.started[revision], r.startErrs[revision]
}

func TestValidationProcessWorker_RunPass(t *testing.T) {
	tests := []struct {
		name        string
		started     map[int]bool
		startErrs   map[int]error
		wantSignals int
	}{
		{
			name:        "a started process wakes the lint and scoring processors",
			started:     map[int]bool{2: true},
			wantSignals: 1,
		},
		{
			name:        "no started process wakes nobody",
			wantSignals: 0,
		},
		{
			name:        "an error on one revision does not stop the others",
			started:     map[int]bool{3: true},
			startErrs:   map[int]error{1: errors.New("connection reset")},
			wantSignals: 1,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &validationProcessRepoStub{
				revisions: []entity.VersionValidationProcess{
					{PackageId: testPackageId, Version: testVersion, Revision: 1},
					{PackageId: testPackageId, Version: testVersion, Revision: 2},
					{PackageId: testPackageId, Version: testVersion, Revision: 3},
				},
				started:   tt.started,
				startErrs: tt.startErrs,
			}
			versionTaskNotify := make(chan struct{}, 1)
			scoringTaskNotify := make(chan struct{}, 1)
			w := &validationProcessWorker{
				processRepo:       repo,
				versionTaskNotify: versionTaskNotify,
				scoringTaskNotify: scoringTaskNotify,
			}

			w.runPass(context.Background())

			wantCalls := []string{"finish", "queued", "start 1", "start 2", "start 3"}
			if !reflect.DeepEqual(repo.calls, wantCalls) {
				t.Fatalf("calls = %v, want %v", repo.calls, wantCalls)
			}
			if len(versionTaskNotify) != tt.wantSignals || len(scoringTaskNotify) != tt.wantSignals {
				t.Fatalf("lint processor signals = %d, scoring processor signals = %d; want %d each", len(versionTaskNotify), len(scoringTaskNotify), tt.wantSignals)
			}
		})
	}
}
