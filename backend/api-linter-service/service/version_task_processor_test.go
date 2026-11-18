package service

import (
	"context"
	"errors"
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/client"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/entity"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/repository"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/view"
)

type versionTaskRepoStub struct {
	repository.VersionLintTaskRepository

	task        entity.VersionLintTask
	completeErr error

	restartIncrements int
	failures          int
}

func (r *versionTaskRepoStub) GetTaskById(_ context.Context, _ string) (*entity.VersionLintTask, error) {
	task := r.task
	return &task, nil
}

func (r *versionTaskRepoStub) CompleteOwnedLint(_ context.Context, _ string, _ string, _ view.LintedVersionStatus, _ string) (bool, error) {
	return false, r.completeErr
}

func (r *versionTaskRepoStub) IncOwnedRestartCount(_ context.Context, _ string, _ string) (bool, error) {
	r.restartIncrements++
	return true, nil
}

func (r *versionTaskRepoStub) FailOwnedLint(_ context.Context, _ string, _ string, _ string) (bool, error) {
	r.failures++
	return true, nil
}

type refusedDocTaskSaveStub struct {
	repository.DocLintTaskRepository

	saves int
}

func (r *refusedDocTaskSaveStub) SaveDocTasksAndUpdVer(_ context.Context, _ []entity.DocumentLintTask, _ string, _ string) (bool, error) {
	r.saves++
	return false, nil
}

type versionDocumentsClientStub struct {
	client.ApihubClient

	documents []view.PublishedDocument
}

func (c *versionDocumentsClientStub) GetVersionDocuments(_ context.Context, _ string, _ string) (*view.VersionDocuments, error) {
	return &view.VersionDocuments{Documents: c.documents}, nil
}

type linterSelectorStub struct{}

func (s linterSelectorStub) SelectLintersAndRuleset(_ context.Context, _ view.ApiType, _ string) []view.LinterAndRuleset {
	return []view.LinterAndRuleset{{Linter: view.SpectralLinter, RulesetId: testSpectralRuleset}}
}

func TestProcessVersionLintTask_RefusedWriteDoesNotCountAsRestart(t *testing.T) {
	document := view.PublishedDocument{FileId: "a.yaml", Slug: "a.yaml", Type: view.OpenAPI30Type}
	tests := []struct {
		name         string
		documents    []view.PublishedDocument
		completeErr  error
		wantRestarts int
		wantDocSaves int
	}{
		{
			name:         "completion without documents is refused",
			wantRestarts: 0,
		},
		{
			name:         "completion without documents fails",
			completeErr:  errors.New("connection reset"),
			wantRestarts: 1,
		},
		{
			name:         "saving the doc tasks is refused",
			documents:    []view.PublishedDocument{document},
			wantRestarts: 0,
			wantDocSaves: 1,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			verRepo := &versionTaskRepoStub{
				task: entity.VersionLintTask{
					Id:         testLintTaskId,
					PackageId:  testPackageId,
					Version:    testVersion,
					Revision:   testRevision,
					Status:     view.TaskStatusProcessing,
					ExecutorId: testExecutorId,
				},
				completeErr: tt.completeErr,
			}
			docRepo := &refusedDocTaskSaveStub{}
			processor := versionTaskProcessorImpl{
				verRepo:               verRepo,
				docRepo:               docRepo,
				cl:                    &versionDocumentsClientStub{documents: tt.documents},
				linterSelectorService: linterSelectorStub{},
				executorId:            testExecutorId,
				docTaskNotify:         make(chan struct{}, 1),
			}

			processor.processVersionLintTask(testLintTaskId)

			if verRepo.restartIncrements != tt.wantRestarts || verRepo.failures != 0 {
				t.Fatalf("restart increments = %d, failures = %d; want %d increments and no failure", verRepo.restartIncrements, verRepo.failures, tt.wantRestarts)
			}
			if docRepo.saves != tt.wantDocSaves {
				t.Fatalf("doc task saves = %d, want %d", docRepo.saves, tt.wantDocSaves)
			}
		})
	}
}
