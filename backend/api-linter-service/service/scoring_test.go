package service

import (
	"context"
	"encoding/json"
	"slices"
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
			score.ProcessDetails.ProcessStatus = tt.status
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

func TestGetScoringForVersion_DebugPlacementAndV1Projection(t *testing.T) {
	t.Run("section and process debug in v2, flattened in v1", func(t *testing.T) {
		score := finishedScore()
		score.Status = view.ScoringNotPassed
		score.ProcessDetails.ProcessStatus = view.ScoringProcessError
		score.ProcessDetails.PublicationIntegrity.ProcessStatus = view.ScoringProcessError
		score.ProcessDetails.PublicationIntegrity.Debug = []string{"failed to get version content: 503"}
		score.ProcessDetails.BackwardsCompatibility.ProcessStatus = view.ScoringProcessError
		score.ProcessDetails.BackwardsCompatibility.Debug = []string{"failed to get changes: 500"}
		score.ProcessDetails.QualityCheck.ProcessStatus = view.ScoringProcessError
		score.ProcessDetails.QualityCheck.Debug = []string{"lint task failed: x", "1 required lint result(s) unavailable"}
		score.ProcessDetails.Debug = []string{"scoring task failed: restart count exceeded limit, last error: timeout"}

		repo := &scoringRepoStub{scores: map[int]*inMemoryScore{testRevision: {row: score}}}
		svc := NewScoringService(repo, nil)

		v2, err := svc.GetScoringForVersion(context.Background(), testPackageId, testVersionWithRevision)
		if err != nil {
			t.Fatalf("v2 error: %s", err)
		}
		v2Raw, err := json.Marshal(v2)
		if err != nil {
			t.Fatalf("marshal v2: %s", err)
		}
		var v2Map map[string]any
		if err := json.Unmarshal(v2Raw, &v2Map); err != nil {
			t.Fatalf("unmarshal v2: %s", err)
		}
		if _, hasTopDebug := v2Map["debug"]; hasTopDebug {
			t.Fatalf("v2 response must not have top-level debug: %s", v2Raw)
		}
		if !slices.Equal(v2.ProcessDetails.PublicationIntegrity.Debug, []string{"failed to get version content: 503"}) {
			t.Fatalf("integrity debug = %#v", v2.ProcessDetails.PublicationIntegrity.Debug)
		}
		if !slices.Equal(v2.ProcessDetails.BackwardsCompatibility.Debug, []string{"failed to get changes: 500"}) {
			t.Fatalf("BWC debug = %#v", v2.ProcessDetails.BackwardsCompatibility.Debug)
		}
		if !slices.Equal(v2.ProcessDetails.QualityCheck.Debug, []string{"lint task failed: x", "1 required lint result(s) unavailable"}) {
			t.Fatalf("quality debug = %#v", v2.ProcessDetails.QualityCheck.Debug)
		}
		if !slices.Equal(v2.ProcessDetails.Debug, []string{"scoring task failed: restart count exceeded limit, last error: timeout"}) {
			t.Fatalf("process debug = %#v", v2.ProcessDetails.Debug)
		}

		v1, err := svc.GetScoringForVersion_deprecated(context.Background(), testPackageId, testVersionWithRevision)
		if err != nil {
			t.Fatalf("v1 error: %s", err)
		}
		wantFlat := []string{
			"publicationIntegrity: failed to get version content: 503",
			"backwardsCompatibility: failed to get changes: 500",
			"qualityCheck: lint task failed: x",
			"qualityCheck: 1 required lint result(s) unavailable",
			"scoring task failed: restart count exceeded limit, last error: timeout",
		}
		if !slices.Equal(v1.Debug, wantFlat) {
			t.Fatalf("v1 debug = %#v, want %#v", v1.Debug, wantFlat)
		}
	})

	t.Run("clean score omits debug in v2 and returns empty array in v1", func(t *testing.T) {
		score := finishedScore()
		score.Status = view.ScoringPassed
		repo := &scoringRepoStub{scores: map[int]*inMemoryScore{testRevision: {row: score}}}
		svc := NewScoringService(repo, nil)

		v2, err := svc.GetScoringForVersion(context.Background(), testPackageId, testVersionWithRevision)
		if err != nil {
			t.Fatalf("v2 error: %s", err)
		}
		v2Raw, err := json.Marshal(v2)
		if err != nil {
			t.Fatalf("marshal v2: %s", err)
		}
		var v2Map map[string]any
		if err := json.Unmarshal(v2Raw, &v2Map); err != nil {
			t.Fatalf("unmarshal v2: %s", err)
		}
		pd := v2Map["processDetails"].(map[string]any)
		for _, sectionName := range []string{"publicationIntegrity", "backwardsCompatibility", "qualityCheck"} {
			if _, ok := pd[sectionName].(map[string]any)["debug"]; ok {
				t.Fatalf("clean %s must omit debug: %s", sectionName, v2Raw)
			}
		}
		if _, ok := pd["debug"]; ok {
			t.Fatalf("clean processDetails must omit debug: %s", v2Raw)
		}

		v1, err := svc.GetScoringForVersion_deprecated(context.Background(), testPackageId, testVersionWithRevision)
		if err != nil {
			t.Fatalf("v1 error: %s", err)
		}
		if v1.Debug == nil || len(v1.Debug) != 0 {
			t.Fatalf("v1 debug = %#v, want empty non-nil slice", v1.Debug)
		}
	})

	t.Run("legacy migrated debug stays unprefixed in both v2 and v1", func(t *testing.T) {
		score := finishedScore()
		score.Status = view.ScoringNotPassed
		score.ProcessDetails.ProcessStatus = view.ScoringProcessError
		score.ProcessDetails.Debug = []string{"legacy error from pre-upgrade score"}
		repo := &scoringRepoStub{scores: map[int]*inMemoryScore{testRevision: {row: score}}}
		svc := NewScoringService(repo, nil)

		v2, err := svc.GetScoringForVersion(context.Background(), testPackageId, testVersionWithRevision)
		if err != nil {
			t.Fatalf("v2 error: %s", err)
		}
		if !slices.Equal(v2.ProcessDetails.Debug, []string{"legacy error from pre-upgrade score"}) {
			t.Fatalf("v2 process debug = %#v", v2.ProcessDetails.Debug)
		}
		v1, err := svc.GetScoringForVersion_deprecated(context.Background(), testPackageId, testVersionWithRevision)
		if err != nil {
			t.Fatalf("v1 error: %s", err)
		}
		if !slices.Equal(v1.Debug, []string{"legacy error from pre-upgrade score"}) {
			t.Fatalf("v1 debug = %#v", v1.Debug)
		}
	})
}
