package cleanup

import (
	"context"
	"fmt"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/metrics"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service/cleanup/logger"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

const (
	revisionsPageSize                = 100
	revisionsProgressUpdateThreshold = 1000
)

type revisionsCleanupJobProcessor struct {
	publishedRepository      repository.PublishedRepository
	versionCleanupRepository repository.VersionCleanupRepository
	monitoringService        service.MonitoringService
	deleteLastRevision       bool
	deleteReleaseRevision    bool
}

func NewRevisionsCleanupJobProcessor(
	publishedRepository repository.PublishedRepository,
	versionCleanupRepository repository.VersionCleanupRepository,
	monitoringService service.MonitoringService,
	deleteLastRevision bool,
	deleteReleaseRevision bool,
) JobProcessor {
	return &revisionsCleanupJobProcessor{
		publishedRepository:      publishedRepository,
		versionCleanupRepository: versionCleanupRepository,
		monitoringService:        monitoringService,
		deleteLastRevision:       deleteLastRevision,
		deleteReleaseRevision:    deleteReleaseRevision,
	}
}

func (p *revisionsCleanupJobProcessor) Initialize(ctx context.Context, jobId string, instanceId string, deleteBefore time.Time) error {
	err := p.versionCleanupRepository.StoreVersionCleanupRun(ctx, entity.VersionCleanupEntity{
		RunId:        jobId,
		InstanceId:   instanceId,
		Status:       string(statusRunning),
		PackageId:    nil,
		DeleteBefore: deleteBefore,
	})
	if err != nil {
		logger.Errorf(ctx, "Failed to store revisions cleanup run: %v", err)
		return err
	}
	return nil
}

func (p *revisionsCleanupJobProcessor) Process(ctx context.Context, jobId string, deleteBefore time.Time, deletedItems *int) ([]string, error) {
	logger.Debugf(ctx, "Will delete revisions older than %s", deleteBefore)

	page, limit := 0, revisionsPageSize
	processingErrors := []string{}
	packageCount := 0
	lastUpdateCount := *deletedItems

	for {
		select {
		case <-ctx.Done():
			errorMessage := getContextCancellationMessage(ctx)
			logger.Warnf(ctx, "job interrupted - %s", errorMessage)
			return processingErrors, fmt.Errorf("job interrupted - %s", errorMessage)
		default:
		}

		getPackageListReq := view.PackageListReq{
			Kind:         []string{entity.KIND_PACKAGE, entity.KIND_DASHBOARD},
			Limit:        limit,
			OnlyFavorite: false,
			OnlyShared:   false,
			Offset:       page * limit,
			ParentId:     "*",
		}

		packages, err := p.publishedRepository.GetFilteredPackagesWithOffset(ctx, getPackageListReq, "")
		if err != nil {
			logger.Errorf(ctx, "Failed to get packages for revisions cleanup: %s", err.Error())
			return nil, fmt.Errorf("failed to get packages: %s", err.Error())
		}

		if len(packages) == 0 {
			break
		}

		logger.Debugf(ctx, "Processing page %d", page+1)

		for idx, pkg := range packages {
			select {
			case <-ctx.Done():
				errorMessage := getContextCancellationMessage(ctx)
				logger.Warnf(ctx, "job interrupted during package processing - %s", errorMessage)
				return processingErrors, fmt.Errorf("job interrupted - %s", errorMessage)
			default:
			}

			logger.Debugf(ctx, "Processing package %d/%d: %s", idx+1, len(packages), pkg.Id)
			count, releaseCount, err := p.publishedRepository.DeletePackageRevisionsBeforeDate(ctx, pkg.Id, deleteBefore, p.deleteLastRevision, p.deleteReleaseRevision, "job_revisions_cleanup|"+jobId)
			if err != nil {
				logger.Warnf(ctx, "Failed to delete revisions of package %s during revisions cleanup: %v", pkg.Id, err)
				processingErrors = append(processingErrors, fmt.Sprintf("package %s: %s", pkg.Id, err.Error()))
			}
			if releaseCount > 0 {
				for i := 0; i < releaseCount; i++ {
					p.monitoringService.IncreaseBusinessMetricCounter("job_revisions_cleanup|"+jobId, metrics.ReleaseVersionsDeleted, pkg.Id)
				}
			}
			*deletedItems += count
			packageCount++
		}

		logger.Debugf(ctx, "Completed processing page %d, total deleted items so far: %d", page+1, *deletedItems)

		if packageCount >= revisionsProgressUpdateThreshold && *deletedItems > lastUpdateCount {
			if err := p.UpdateProgress(ctx, jobId, "", "", *deletedItems, nil); err != nil {
				logger.Warnf(ctx, "Failed to update progress for revisions cleanup: %v", err)
			} else {
				lastUpdateCount = *deletedItems
			}
			packageCount = 0
		}

		page++
	}

	return processingErrors, nil
}

func (p *revisionsCleanupJobProcessor) UpdateProgress(ctx context.Context, jobId string, status jobStatus, errorMessage string, deletedItems int, finishedAt *time.Time) error {
	updateCtx, cancel := createContextForUpdate(ctx)
	defer cancel()

	err := p.versionCleanupRepository.UpdateVersionCleanupRun(updateCtx, jobId, string(status), errorMessage, deletedItems, finishedAt)
	if err != nil {
		logger.Errorf(ctx, "failed to set '%s' status for cleanup job: %s", status, err.Error())
		return err
	}
	return nil
}

func (p *revisionsCleanupJobProcessor) GetVacuumTimeout() time.Duration {
	return 0 //revisions cleanup doesn't need vacuum
}

func (p *revisionsCleanupJobProcessor) PerformVacuum(ctx context.Context, jobId string) error {
	return nil //revisions cleanup doesn't need vacuum
}
