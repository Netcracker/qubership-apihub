package service

import (
	"context"
	"fmt"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/client"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/entity"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/repository"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/utils"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/view"
)

type ScoringService interface {
	GetScoringForVersion_deprecated(ctx context.Context, packageId, version string) (*view.VersionScore_deprecated, error)
	GetScoringForVersion(ctx context.Context, packageId, version string) (*view.VersionScore, error)
}

type scoringServiceImpl struct {
	scoringRepository repository.ScoringRepository
	apihubClient      client.ApihubClient
}

func NewScoringService(
	scoringRepository repository.ScoringRepository,
	apihubClient client.ApihubClient,
) ScoringService {
	return &scoringServiceImpl{
		scoringRepository: scoringRepository,
		apihubClient:      apihubClient,
	}
}

func (s *scoringServiceImpl) GetScoringForVersion_deprecated(ctx context.Context, packageId, version string) (*view.VersionScore_deprecated, error) {
	ver, rev, err := s.getVersionAndRevision(ctx, packageId, version)
	if err != nil {
		return nil, err
	}

	ent, err := s.scoringRepository.GetScoringForVersion(ctx, packageId, ver, rev)
	if err != nil {
		return nil, err
	}
	// TODO: the 404 during a re-validation is a behaviour change of v1, to discuss during review.
	if ent == nil || ent.ProcessStatus == view.ScoringProcessInProgress {
		return nil, nil
	}
	return entity.MakeVersionScoreView_deprecated(ent), nil
}

func (s *scoringServiceImpl) GetScoringForVersion(ctx context.Context, packageId, version string) (*view.VersionScore, error) {
	ver, rev, err := s.getVersionAndRevision(ctx, packageId, version)
	if err != nil {
		return nil, err
	}

	ent, err := s.scoringRepository.GetScoringForVersion(ctx, packageId, ver, rev)
	if err != nil {
		return nil, err
	}
	return entity.MakeVersionScoreView(ent), nil
}

func (s *scoringServiceImpl) getVersionAndRevision(ctx context.Context, packageId string, version string) (string, int, error) {
	ver, rev, err := utils.SplitVersionRevision(version)
	if err != nil {
		return "", 0, err
	}

	if rev == 0 {
		versionView, err := s.apihubClient.GetVersion(ctx, packageId, version, false, false)
		if err != nil {
			return "", 0, err
		}
		if versionView == nil {
			return "", 0, fmt.Errorf("version %s not found for package %s", version, packageId)
		}
		ver, rev, err = utils.SplitVersionRevision(versionView.Version)
		if err != nil {
			return "", 0, err
		}
		if rev == 0 {
			return "", 0, fmt.Errorf("unable to identify latest revision for version %s", version)
		}
	}
	return ver, rev, nil
}
