package service

import (
	"context"
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/view"
)

func TestGetScoringForVersionDeprecated_ReturnsOnlyAFinalScore(t *testing.T) {
	tests := []struct {
		status   view.ScoringProcessStatus
		wantBody bool
	}{
		{status: view.ScoringProcessProcessing, wantBody: false},
		{status: view.ScoringProcessSuccess, wantBody: true},
		{status: view.ScoringProcessError, wantBody: true},
	}
	for _, tt := range tests {
		t.Run(string(tt.status), func(t *testing.T) {
			score := finishedScore()
			score.ProcessStatus = tt.status
			score.Status = view.ScoringPassed
			repo := &scoringRepoStub{scores: map[int]*inMemoryScore{testRevision: {row: score}}}
			service := NewScoringService(repo, nil)

			body, err := service.GetScoringForVersion_deprecated(context.Background(), testPackageId, testVersionWithRevision)
			if err != nil {
				t.Fatalf("unexpected error: %s", err)
			}
			if (body != nil) != tt.wantBody {
				t.Fatalf("body = %#v, want a body: %t", body, tt.wantBody)
			}
			if body != nil && body.Status != view.ScoringPassed {
				t.Fatalf("status = %q, want %q", body.Status, view.ScoringPassed)
			}
		})
	}
}
