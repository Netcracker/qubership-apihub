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
	unreferencedDataBatchSize = 100
)

type unreferencedDataCleanupJobProcessor struct {
	unreferencedDataCleanupRepo repository.UnreferencedDataCleanupRepository
}

func NewUnreferencedDataJobProcessor(
	unreferencedDataCleanupRepo repository.UnreferencedDataCleanupRepository,
) JobProcessor {
	return &unreferencedDataCleanupJobProcessor{
		unreferencedDataCleanupRepo: unreferencedDataCleanupRepo,
	}
}

func (p *unreferencedDataCleanupJobProcessor) Initialize(ctx context.Context, jobId string, instanceId string, deleteBefore time.Time) error {
	err := p.unreferencedDataCleanupRepo.StoreCleanupRun(ctx, entity.UnreferencedDataCleanupEntity{
		RunId:      jobId,
		InstanceId: instanceId,
		Status:     string(statusRunning),
		StartedAt:  time.Now(),
	})
	if err != nil {
		logger.Errorf(ctx, "Failed to initialize cleanup run: %v", err)
		return err
	}
	return nil
}

func (p *unreferencedDataCleanupJobProcessor) Process(ctx context.Context, jobId string, _ time.Time, deletedItems *int) ([]string, error) {
	processingErrors := []string{}
	batchSize := unreferencedDataBatchSize

	logger.Info(ctx, "Starting cleanup of unreferenced operation data")
	for {
		select {
		case <-ctx.Done():
			errorMessage := getContextCancellationMessage(ctx)
			logger.Warnf(ctx, "job interrupted during operation data cleanup - %s", errorMessage)
			return processingErrors, fmt.Errorf("job interrupted - %s", errorMessage)
		default:
		}
		deletedItemsCount, err := p.unreferencedDataCleanupRepo.DeleteUnreferencedOperationData(ctx, jobId, batchSize)
		if err != nil {
			logger.Warnf(ctx, "Failed to delete operation data: %v", err)
			processingErrors = append(processingErrors, fmt.Sprintf("failed to delete operation data: %s", err.Error()))
			continue
		}

		if deletedItemsCount == 0 {
			logger.Debug(ctx, "No more operation data to delete")
			break
		}
		*deletedItems += deletedItemsCount
		logger.Infof(ctx, "Deleted %d items during operation data deletion", deletedItemsCount)
	}

	logger.Infof(ctx, "Starting cleanup of unreferenced operation group templates")
	for {
		select {
		case <-ctx.Done():
			errorMessage := getContextCancellationMessage(ctx)
			logger.Warnf(ctx, "job interrupted during operation group templates cleanup - %s", errorMessage)
			return processingErrors, fmt.Errorf("job interrupted - %s", errorMessage)
		default:
		}
		deletedItemsCount, err := p.unreferencedDataCleanupRepo.DeleteUnreferencedOperationGroupTemplates(ctx, jobId, batchSize)
		if err != nil {
			logger.Warnf(ctx, "Failed to delete operation group templates: %v", err)
			processingErrors = append(processingErrors, fmt.Sprintf("failed to delete operation group templates: %s", err.Error()))
			continue
		}

		if deletedItemsCount == 0 {
			logger.Debug(ctx, "No more operation group templates to delete")
			break
		}
		*deletedItems += deletedItemsCount
		logger.Infof(ctx, "Deleted %d items during operation group templates deletion", deletedItemsCount)
	}

	logger.Infof(ctx, "Starting cleanup of unreferenced source archives")
	for {
		select {
		case <-ctx.Done():
			errorMessage := getContextCancellationMessage(ctx)
			logger.Warnf(ctx, "job interrupted during source archives cleanup - %s", errorMessage)
			return processingErrors, fmt.Errorf("job interrupted - %s", errorMessage)
		default:
		}

		deletedItemsCount, err := p.unreferencedDataCleanupRepo.DeleteUnreferencedSrcArchives(ctx, jobId, batchSize)
		if err != nil {
			logger.Warnf(ctx, "Failed to delete source archives: %v", err)
			processingErrors = append(processingErrors, fmt.Sprintf("failed to delete source archives: %s", err.Error()))
			continue
		}

		if deletedItemsCount == 0 {
			logger.Debug(ctx, "No more source archives to delete")
			break
		}
		*deletedItems += deletedItemsCount
		logger.Infof(ctx, "Deleted %d items during source archives deletion", deletedItemsCount)
	}

	logger.Infof(ctx, "Starting cleanup of unreferenced publish data")
	for {
		select {
		case <-ctx.Done():
			errorMessage := getContextCancellationMessage(ctx)
			logger.Warnf(ctx, "job interrupted during publish data cleanup - %s", errorMessage)
			return processingErrors, fmt.Errorf("job interrupted - %s", errorMessage)
		default:
		}

		deletedItemsCount, err := p.unreferencedDataCleanupRepo.DeleteUnreferencedPublishedData(ctx, jobId, batchSize)
		if err != nil {
			logger.Warnf(ctx, "Failed to delete publish data: %v", err)
			processingErrors = append(processingErrors, fmt.Sprintf("failed to delete publish data: %s", err.Error()))
			continue
		}

		if deletedItemsCount == 0 {
			logger.Debug(ctx, "No more publish data to delete")
			break
		}
		*deletedItems += deletedItemsCount
		logger.Infof(ctx, "Deleted %d items during publish data deletion", deletedItemsCount)
	}

	logger.Infof(ctx, "Starting cleanup of unreferenced version internal document data")
	for {
		select {
		case <-ctx.Done():
			errorMessage := getContextCancellationMessage(ctx)
			logger.Warnf(ctx, "job interrupted during version internal document data cleanup - %s", errorMessage)
			return processingErrors, fmt.Errorf("job interrupted - %s", errorMessage)
		default:
		}

		deletedItemsCount, err := p.unreferencedDataCleanupRepo.DeleteUnreferencedVersionInternalDocumentData(ctx, jobId, batchSize)
		if err != nil {
			logger.Warnf(ctx, "Failed to delete version internal document data: %v", err)
			processingErrors = append(processingErrors, fmt.Sprintf("failed to delete version internal document data: %s", err.Error()))
			continue
		}

		if deletedItemsCount == 0 {
			logger.Debug(ctx, "No more version internal document data to delete")
			break
		}
		*deletedItems += deletedItemsCount
		logger.Infof(ctx, "Deleted %d items during version internal document data deletion", deletedItemsCount)
	}

	logger.Infof(ctx, "Starting cleanup of unreferenced comparison internal document data")
	for {
		select {
		case <-ctx.Done():
			errorMessage := getContextCancellationMessage(ctx)
			logger.Warnf(ctx, "job interrupted during comparison internal document data cleanup - %s", errorMessage)
			return processingErrors, fmt.Errorf("job interrupted - %s", errorMessage)
		default:
		}

		deletedItemsCount, err := p.unreferencedDataCleanupRepo.DeleteUnreferencedComparisonInternalDocumentData(ctx, jobId, batchSize)
		if err != nil {
			logger.Warnf(ctx, "Failed to delete comparison internal document data: %v", err)
			processingErrors = append(processingErrors, fmt.Sprintf("failed to delete comparison internal document data: %s", err.Error()))
			continue
		}

		if deletedItemsCount == 0 {
			logger.Debug(ctx, "No more comparison internal document data to delete")
			break
		}
		*deletedItems += deletedItemsCount
		logger.Infof(ctx, "Deleted %d items during comparison internal document data deletion", deletedItemsCount)
	}

	return processingErrors, nil
}

func (p *unreferencedDataCleanupJobProcessor) UpdateProgress(ctx context.Context, jobId string, status jobStatus, errorMessage string, deletedItems int, finishedAt *time.Time) error {
	updateCtx, cancel := createContextForUpdate(ctx)
	defer cancel()

	err := p.unreferencedDataCleanupRepo.UpdateCleanupRun(updateCtx, jobId, string(status), errorMessage, finishedAt)
	if err != nil {
		logger.Errorf(ctx, "failed to set '%s' status for cleanup job id %s: %s", status, jobId, err.Error())
		return err
	}
	return nil
}

func (p *unreferencedDataCleanupJobProcessor) GetVacuumTimeout() time.Duration {
	return 3 * time.Hour
}

func (p *unreferencedDataCleanupJobProcessor) PerformVacuum(ctx context.Context, jobId string) error {
	err := p.unreferencedDataCleanupRepo.VacuumAffectedTables(ctx, jobId)
	if err != nil {
		return err
	}
	return nil
}
