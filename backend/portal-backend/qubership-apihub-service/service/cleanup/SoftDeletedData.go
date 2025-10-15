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
	softDeletedPackagesBatchSize  = 50
	softDeletedRevisionsBatchSize = 100
)

type softDeletedDataCleanupJobProcessor struct {
	publishedRepository    repository.PublishedRepository
	deletedDataCleanupRepo repository.SoftDeletedDataCleanupRepository
}

func NewSoftDeletedDataJobProcessor(
	publishedRepository repository.PublishedRepository,
	deletedDataCleanupRepo repository.SoftDeletedDataCleanupRepository,
) JobProcessor {
	return &softDeletedDataCleanupJobProcessor{
		publishedRepository:    publishedRepository,
		deletedDataCleanupRepo: deletedDataCleanupRepo,
	}
}

func (p *softDeletedDataCleanupJobProcessor) Initialize(ctx context.Context, jobId string, instanceId string, deleteBefore time.Time) error {
	err := p.deletedDataCleanupRepo.StoreCleanupRun(ctx, entity.SoftDeletedDataCleanupEntity{
		RunId:        jobId,
		InstanceId:   instanceId,
		Status:       string(statusRunning),
		DeleteBefore: deleteBefore,
		StartedAt:    time.Now(),
	})
	if err != nil {
		logger.Errorf(ctx, "Failed to initialize cleanup run: %v", err)
		return err
	}
	return nil
}

func (p *softDeletedDataCleanupJobProcessor) Process(ctx context.Context, jobId string, deleteBefore time.Time, deletedItems *int) ([]string, error) {
	processingErrors := []string{}

	logger.Infof(ctx, "Starting cleanup of packages deleted before %s", deleteBefore)

	packagesBatchSize := softDeletedPackagesBatchSize
	for {
		select {
		case <-ctx.Done():
			errorMessage := getContextCancellationMessage(ctx)
			logger.Warnf(ctx, "job interrupted during packages cleanup - %s", errorMessage)
			return processingErrors, fmt.Errorf("job interrupted - %s", errorMessage)
		default:
		}

		deletedItemsCount, err := p.publishedRepository.DeleteSoftDeletedPackagesBeforeDate(ctx, jobId, deleteBefore, packagesBatchSize)
		if err != nil {
			logger.Warnf(ctx, "Failed to delete packages: %v", err)
			processingErrors = append(processingErrors, fmt.Sprintf("failed to delete package: %s", err.Error()))
			continue
		}

		if deletedItemsCount == 0 {
			logger.Debug(ctx, "No more packages to delete")
			break
		}
		*deletedItems += deletedItemsCount
		logger.Infof(ctx, "Deleted %d items during package deletion", deletedItemsCount)
	}

	logger.Infof(ctx, "Starting cleanup of package revisions deleted before %s", deleteBefore)

	revisionsBatchSize := softDeletedRevisionsBatchSize
	for {
		select {
		case <-ctx.Done():
			errorMessage := getContextCancellationMessage(ctx)
			logger.Warnf(ctx, "job interrupted during revisions cleanup - %s", errorMessage)
			return processingErrors, fmt.Errorf("job interrupted - %s", errorMessage)
		default:
		}

		deletedItemsCount, err := p.publishedRepository.DeleteSoftDeletedPackageRevisionsBeforeDate(ctx, jobId, deleteBefore, revisionsBatchSize)
		if err != nil {
			logger.Warnf(ctx, "Failed to delete package revisions: %v", err)
			processingErrors = append(processingErrors, fmt.Sprintf("failed to delete revisions: %s", err.Error()))
			continue
		}

		if deletedItemsCount == 0 {
			logger.Debug(ctx, "No more package revisions to delete")
			break
		}
		*deletedItems += deletedItemsCount
		logger.Infof(ctx, "Deleted %d items during package revisions deletion", deletedItemsCount)
	}

	return processingErrors, nil
}

func (p *softDeletedDataCleanupJobProcessor) UpdateProgress(ctx context.Context, jobId string, status jobStatus, errorMessage string, deletedItems int, finishedAt *time.Time) error {
	updateCtx, cancel := createContextForUpdate(ctx)
	defer cancel()

	err := p.deletedDataCleanupRepo.UpdateCleanupRun(updateCtx, jobId, string(status), errorMessage, finishedAt)
	if err != nil {
		logger.Errorf(ctx, "failed to set '%s' status for cleanup job: %s", status, err.Error())
		return err
	}
	return nil
}

func (p *softDeletedDataCleanupJobProcessor) GetVacuumTimeout() time.Duration {
	return 6 * time.Hour
}

func (p *softDeletedDataCleanupJobProcessor) PerformVacuum(ctx context.Context, jobId string) error {
	err := p.deletedDataCleanupRepo.VacuumAffectedTables(ctx, jobId)
	if err != nil {
		return err
	}
	return nil
}
