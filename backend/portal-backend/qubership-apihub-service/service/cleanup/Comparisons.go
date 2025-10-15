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
	"fmt"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service/cleanup/logger"
)

const (
	comparisonsPageSize                = 100
	comparisonsProgressUpdateThreshold = 1000
)

type comparisonsCleanupJobProcessor struct {
	publishedRepository   repository.PublishedRepository
	comparisonCleanupRepo repository.ComparisonCleanupRepository
}

func NewComparisonsCleanupJobProcessor(
	publishedRepository repository.PublishedRepository,
	comparisonCleanupRepo repository.ComparisonCleanupRepository,
) JobProcessor {
	return &comparisonsCleanupJobProcessor{
		publishedRepository:   publishedRepository,
		comparisonCleanupRepo: comparisonCleanupRepo,
	}
}

func (p *comparisonsCleanupJobProcessor) Initialize(ctx context.Context, jobId string, instanceId string, deleteBefore time.Time) error {
	err := p.comparisonCleanupRepo.StoreComparisonCleanupRun(ctx, entity.ComparisonCleanupEntity{
		RunId:        jobId,
		InstanceId:   instanceId,
		Status:       string(statusRunning),
		DeleteBefore: deleteBefore,
		StartedAt:    time.Now(),
	})
	if err != nil {
		logger.Errorf(ctx, "Failed to store comparison cleanup run: %v", err)
		return err
	}
	return nil
}

func (p *comparisonsCleanupJobProcessor) Process(ctx context.Context, jobId string, deleteBefore time.Time, deletedItems *int) ([]string, error) {
	logger.Debugf(ctx, "Will delete comparisons older than %s", deleteBefore)

	page, limit := 0, comparisonsPageSize
	var errors []string
	comparisonCount := 0
	lastUpdateCount := *deletedItems

	for {
		select {
		case <-ctx.Done():
			errorMessage := getContextCancellationMessage(ctx)
			logger.Warnf(ctx, "job interrupted - %s", errorMessage)
			return errors, fmt.Errorf("job interrupted - %s", errorMessage)
		default:
		}

		candidates, err := p.publishedRepository.GetVersionComparisonsCleanupCandidates(ctx, limit, page*limit)
		if err != nil {
			logger.Errorf(ctx, "Error getting comparison candidates: %v", err)
			errors = append(errors, fmt.Sprintf("Error getting comparison candidates: %v", err))
			return errors, err
		}
		if len(candidates) == 0 {
			break
		}

		logger.Debugf(ctx, "Processing %d page", page+1)

		for _, candidate := range candidates {
			select {
			case <-ctx.Done():
				errorMessage := getContextCancellationMessage(ctx)
				logger.Warnf(ctx, "job interrupted - %s", errorMessage)
				return errors, fmt.Errorf("job interrupted - %s", errorMessage)
			default:
			}

			deleteCandidate := false
			if candidate.RevisionNotPublished {
				logger.Tracef(ctx, "Deleting comparison %s because revision is not published", candidate.ComparisonId)
				deleteCandidate = true
			} else if candidate.LastActive.Before(deleteBefore) && (candidate.ActualPreviousVersion == nil || candidate.ActualPreviousPackageId == nil ||
				*candidate.ActualPreviousVersion != candidate.PreviousVersion || *candidate.ActualPreviousPackageId != candidate.PreviousPackageId) {
				logger.Tracef(ctx, "Comparison %s is ad-hoc, deleting", candidate.ComparisonId)
				deleteCandidate = true
			} else if candidate.ActualPreviousPackageId != nil && candidate.ActualPreviousVersion != nil &&
				candidate.PreviousPackageId == *candidate.ActualPreviousPackageId &&
				candidate.PreviousVersion == *candidate.ActualPreviousVersion &&
				candidate.PreviousRevision != candidate.PreviousMaxRevision {
				logger.Tracef(ctx, "Comparison %s is not actual changelog, deleting", candidate.ComparisonId)
				deleteCandidate = true
			}

			if deleteCandidate {
				deleted, err := p.publishedRepository.DeleteVersionComparison(ctx, candidate.ComparisonId)
				if err != nil {
					logger.Warnf(ctx, "Error deleting comparison %s: %v", candidate.ComparisonId, err)
					errors = append(errors, fmt.Sprintf("Error deleting comparison %s: %v", candidate.ComparisonId, err))
				} else if deleted {
					logger.Debugf(ctx, "Deleted version comparison %s, packageId: %s, version: %s, revision: %d, previousPackageId: %s, previousVersion: %s, previousRevision: %d",
						candidate.ComparisonId, candidate.PackageId, candidate.Version, candidate.Revision, candidate.PreviousPackageId, candidate.PreviousVersion, candidate.PreviousRevision)
					*deletedItems++
				} else {
					logger.Tracef(ctx, "Comparison %s was not deleted (referenced by another comparison or already deleted)", candidate.ComparisonId)
				}
			}
			comparisonCount++
		}

		logger.Debugf(ctx, "Completed processing page %d, total deleted items so far: %d", page+1, *deletedItems)

		if comparisonCount >= comparisonsProgressUpdateThreshold && *deletedItems > lastUpdateCount {
			if err := p.UpdateProgress(ctx, jobId, "", "", *deletedItems, nil); err != nil {
				logger.Warnf(ctx, "Failed to update progress for comparisons cleanup: %v", err)
			} else {
				lastUpdateCount = *deletedItems
			}
			comparisonCount = 0
		}

		page++
	}

	return errors, nil
}

func (p *comparisonsCleanupJobProcessor) UpdateProgress(ctx context.Context, jobId string, status jobStatus, errorMessage string, deletedItems int, finishedAt *time.Time) error {
	updateCtx, cancel := createContextForUpdate(ctx)
	defer cancel()

	err := p.comparisonCleanupRepo.UpdateComparisonCleanupRun(updateCtx, jobId, string(status), errorMessage, deletedItems, finishedAt)
	if err != nil {
		logger.Errorf(ctx, "failed to set '%s' status for cleanup job: %s", status, err.Error())
		return err
	}
	return nil
}

func (p *comparisonsCleanupJobProcessor) GetVacuumTimeout() time.Duration {
	return 3 * time.Hour
}

func (p *comparisonsCleanupJobProcessor) PerformVacuum(ctx context.Context, jobId string) error {
	err := p.comparisonCleanupRepo.VacuumComparisonTables(ctx)
	if err != nil {
		return err
	}
	return nil
}
