package service

import (
	"context"
	"runtime/debug"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/repository"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/utils"
	log "github.com/sirupsen/logrus"
)

const validationProcessPollInterval = 5 * time.Second

func NewValidationProcessWorker(
	processRepo repository.ValidationProcessRepository,
	validationProcessNotify <-chan struct{},
	versionTaskNotify chan<- struct{},
	scoringTaskNotify chan<- struct{},
) {
	w := &validationProcessWorker{
		processRepo:       processRepo,
		versionTaskNotify: versionTaskNotify,
		scoringTaskNotify: scoringTaskNotify,
	}
	ctx := context.Background()

	utils.SafeAsync(func() {
		t := time.NewTicker(validationProcessPollInterval)
		defer t.Stop()
		for {
			select {
			case <-t.C:
			case <-validationProcessNotify:
			}
			// Only this loop starts validation processes, so a panic in one pass must not stop it.
			func() {
				defer func() {
					if r := recover(); r != nil {
						log.Errorf("Validation process pass failed with panic: %v\n%s", r, debug.Stack())
					}
				}()
				w.runPass(ctx)
			}()
		}
	})
}

type validationProcessWorker struct {
	processRepo       repository.ValidationProcessRepository
	versionTaskNotify chan<- struct{}
	scoringTaskNotify chan<- struct{}
}

func (w *validationProcessWorker) runPass(ctx context.Context) {
	if err := w.processRepo.FinishCompletedProcesses(ctx); err != nil {
		log.Errorf("Failed to finish completed validation processes: %s", err)
	}

	revisions, err := w.processRepo.GetQueuedRevisions(ctx)
	if err != nil {
		log.Errorf("Failed to get revisions with queued validation processes: %s", err)
		return
	}

	anyStarted := false
	for _, revision := range revisions {
		started, err := w.processRepo.StartNextProcess(ctx, revision.PackageId, revision.Version, revision.Revision)
		if err != nil {
			log.Errorf("Failed to start the next validation process of [ %s | %s@%d ]: %s", revision.PackageId, revision.Version, revision.Revision, err)
			continue
		}
		if started {
			log.Debugf("Validation process of [ %s | %s@%d ] is started", revision.PackageId, revision.Version, revision.Revision)
			anyStarted = true
		}
	}
	if !anyStarted {
		return
	}

	select {
	case w.versionTaskNotify <- struct{}{}:
	default:
	}
	select {
	case w.scoringTaskNotify <- struct{}{}:
	default:
	}
}
