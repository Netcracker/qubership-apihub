package service

import (
	"context"
	"fmt"
	"sync/atomic"
	"time"

	"github.com/Netcracker/qubership-api-linter-service/client"
	"github.com/Netcracker/qubership-api-linter-service/entity"
	"github.com/Netcracker/qubership-api-linter-service/repository"
	"github.com/Netcracker/qubership-api-linter-service/secctx"
	"github.com/Netcracker/qubership-api-linter-service/utils"
	"github.com/Netcracker/qubership-api-linter-service/view"
	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"
)

type VersionTaskProcessor interface {
	StartVersionLintTask(taskId string) error
}

func NewVersionTaskProcessor(verRepo repository.VersionLintTaskRepository, docRepo repository.DocLintTaskRepository, verResRepo repository.VersionResultRepository, cl client.ApihubClient, linterSelectorService LinterSelectorService, scoringService ScoringService, executorId string, docTaskNotify chan<- struct{}, versionTaskNotify <-chan struct{}) VersionTaskProcessor {
	svc := &versionTaskProcessorImpl{
		verRepo:               verRepo,
		docRepo:               docRepo,
		verResRepo:            verResRepo,
		cl:                    cl,
		linterSelectorService: linterSelectorService,
		scoringService:        scoringService,
		executorId:            executorId,
		docTaskNotify:         docTaskNotify,
		versionTaskNotify:     versionTaskNotify,
	}

	utils.SafeAsync(func() {
		svc.acquireFreeTasks()
	})

	utils.SafeAsync(func() {
		svc.checkDocReady()
	})

	return svc
}

type versionTaskProcessorImpl struct {
	verRepo               repository.VersionLintTaskRepository
	docRepo               repository.DocLintTaskRepository
	verResRepo            repository.VersionResultRepository
	cl                    client.ApihubClient
	linterSelectorService LinterSelectorService
	scoringService        ScoringService
	executorId            string
	docTaskNotify         chan<- struct{}
	versionTaskNotify     <-chan struct{}
}

func (v versionTaskProcessorImpl) StartVersionLintTask(taskId string) error {
	utils.SafeAsync(func() {
		v.processVersionLintTask(taskId)
	})
	return nil
}

func (v versionTaskProcessorImpl) processVersionLintTask(taskId string) {
	log.Debugf("Start processing version Lint task %s", taskId)
	start := time.Now()

	ctx := secctx.MakeSysadminContext(context.Background())

	task, err := v.verRepo.GetTaskById(ctx, taskId)
	if err != nil {
		log.Errorf("Failed to get task by id %s: %s", taskId, err)
		return
	}
	if task.ExecutorId != v.executorId {
		log.Errorf("Version lint task id=%s executorId=%s does not match current executorId=%s", taskId, task.ExecutorId, v.executorId)
		return
	}

	// TODO: update last_active for version task periodically in goroutine?

	version := fmt.Sprintf("%s@%d", task.Version, task.Revision)

	docs, err := v.cl.GetVersionDocuments(ctx, task.PackageId, version)
	if err != nil {
		v.handleProcessingFailed(ctx, *task, fmt.Errorf("failed to get version documents: %s", err))
		return
	}
	if docs == nil {
		v.handleProcessingFailed(ctx, *task, fmt.Errorf("failed to get version documents: not found"))
		return
	}

	typeToLinters := make(map[view.ApiType][]view.LinterAndRuleset)
	for _, doc := range docs.Documents {
		_, exists := typeToLinters[doc.Type]
		if !exists {
			lr := v.linterSelectorService.SelectLintersAndRuleset(ctx, doc.Type, task.PackageId)
			if linters, ok := typeToLinters[doc.Type]; ok {
				linters = append(linters, lr...)
				typeToLinters[doc.Type] = linters
			} else {
				typeToLinters[doc.Type] = lr
			}
		}
	}

	var docTasks []entity.DocumentLintTask

	for _, doc := range docs.Documents {
		linters := typeToLinters[doc.Type]

		for _, lr := range linters {
			status := view.TaskStatusNotStarted
			details := ""
			executorId := ""

			if lr.Err != nil {
				status = view.TaskStatusError
				details = lr.Err.Error()
				executorId = v.executorId
			}

			if lr.Linter == view.UnknownLinter {
				if lr.Err != nil {
					v.handleProcessingFailed(ctx, *task, fmt.Errorf("failed to select linter: %w", lr.Err))
					return
				}
				log.Infof("Skipping document %s for [ %s | %s ] with unsupported api type: %s", doc.Slug, task.PackageId, task.Version, doc.Type)
				continue
			}

			if lr.RulesetId == "" {
				status = view.TaskStatusError
				details = fmt.Sprintf("No suitable ruleset was found. Linter=%s", lr.Linter)
				executorId = v.executorId
			}

			docTaskEnt := entity.DocumentLintTask{
				Id:                uuid.NewString(),
				VersionLintTaskId: taskId,
				PackageId:         task.PackageId,
				Version:           task.Version,
				Revision:          task.Revision,
				FileId:            doc.FileId,
				FileSlug:          doc.Slug,
				APIType:           doc.Type,
				Linter:            lr.Linter,
				RulesetId:         lr.RulesetId,
				Status:            status,
				Details:           details,
				CreatedAt:         time.Now(),
				ExecutorId:        executorId,
				LastActive:        nil,
				RestartCount:      0,
				Priority:          0,
				LintTimeMs:        0,
				Recalculate:       task.Recalculate,
			}

			docTasks = append(docTasks, docTaskEnt)
		}
	}

	if len(docTasks) == 0 {
		err = v.verRepo.EmptyVersionCompleted(ctx, *task)
		if err != nil {
			v.handleProcessingFailed(ctx, *task, err)
			return
		}
		log.Infof("Version lint task for [ %s | %s ] (id = %s) processing finished, no suitable documents to lint", task.PackageId, task.Version, taskId)
		return
	}

	err = v.docRepo.SaveDocTasksAndUpdVer(ctx, docTasks, taskId)
	if err != nil {
		v.handleProcessingFailed(ctx, *task, fmt.Errorf("failed to save doc tasks: %s", err))
		return
	}

	// Signal doc task processor to wake up and start processing immediately
	select {
	case v.docTaskNotify <- struct{}{}:
	default:
		// channel full or no receiver - worker will pick up on next tick
	}

	log.Infof("Version lint task for [ %s | %s ] (id = %s) is processed, %d doc lint task(s) created. Processing time = %dms", task.PackageId, task.Version, taskId, len(docTasks), time.Since(start).Milliseconds())
}

func (v versionTaskProcessorImpl) acquireFreeTasks() {
	t := time.NewTicker(time.Second * 5)
	defer t.Stop()

	running := atomic.Bool{}
	for {
		if running.Load() {
			log.Tracef("versionTaskProcessorImpl: ticker skipped, running")
			<-t.C
			continue
		}

		select {
		case <-t.C:
			// periodic poll
		case <-v.versionTaskNotify:
			// interrupt sleep and start processing immediately when version lint task is created
			log.Tracef("versionTaskProcessorImpl: woken by version task notify")
		}

		utils.SafeAsync(func() {
			running.Store(true)
			for {
				moreWork := v.processTask()
				if moreWork == false {
					break
				}
				log.Tracef("versionTaskProcessorImpl: keep on running")
			}
			running.Store(false)
		})
	}
}

func (v versionTaskProcessorImpl) processTask() bool {
	ctx := context.Background()
	task, err := v.verRepo.FindFreeVersionTask(ctx, v.executorId)
	if err != nil {
		log.Errorf("Failed to find free version task: %s", err)
		return false
	}
	if task != nil {
		v.processVersionLintTask(task.Id)
		return true
	}
	return false
}

func (v versionTaskProcessorImpl) checkDocReady() {
	t := time.NewTicker(time.Second * 5)
	ctx := secctx.MakeSysadminContext(context.Background())

	for range t.C {
		verLintTasks, err := v.verRepo.GetWaitingForDocTasks(ctx, v.executorId) // FIXME: problem with dead executor here!!
		if err != nil {
			log.Errorf("Failed to get version tasks in waiting for docs status: %s", err)
			continue
		}
		if len(verLintTasks) == 0 {
			continue
		}
		var verTaskIds []string

		for _, task := range verLintTasks {
			verTaskIds = append(verTaskIds, task.Id)
		}

		docLintTasks, err := v.docRepo.GetDocTasksForVersionTasks(ctx, verTaskIds)
		if err != nil {
			log.Errorf("Failed to get doc lint tasks for readiness check: %s", err)
			continue
		}

		// don't expect many entries, so just iterating
		for _, verLintTask := range verLintTasks {
			var numSucceed int
			var numFailed int
			var numNotReady int
			for _, docLintTask := range docLintTasks {
				if docLintTask.VersionLintTaskId != verLintTask.Id {
					continue
				}
				switch docLintTask.Status {
				case view.TaskStatusSuccess:
					numSucceed++
					break
				case view.TaskStatusError:
					numFailed++
					break
				case view.TaskStatusNotStarted, view.TaskStatusProcessing:
					numNotReady++
					break
				default:
					log.Warnf("handleDocReady(): unexpected doc lint task status: %s", docLintTask.Status)
					break
				}
			}
			if numNotReady > 0 {
				// version task is not ready yet
				err = v.verRepo.UpdateLastActive(ctx, verLintTask.Id, v.executorId)
				if err != nil {
					log.Errorf("Failed to update version lint task %s status to %s: %v", verLintTask.Id, view.TaskStatusWaitingForDocs, err)
					continue
				}
			} else {
				// version task is ready
				lintedVerEnt, err := v.verResRepo.GetLintedVersion(ctx, verLintTask.PackageId, verLintTask.Version, verLintTask.Revision)
				if err != nil {
					v.handleProcessingFailed(ctx, verLintTask, err)
					continue
				}

				var score view.VersionScore
				if numFailed > 0 {
					log.Infof("Version lint (task = %s) is failed because of failed doc tasks", verLintTask.Id)
					lintedVerEnt.LintStatus = view.VersionStatusError
					lintedVerEnt.LintDetails = fmt.Sprintf("%d doc task(s) failed", numFailed)
				} else {
					log.Infof("Version lint (task = %s) successfully completed", verLintTask.Id)
					lintedVerEnt.LintStatus = view.VersionStatusSuccess
					lintedVerEnt.LintDetails = ""
				}

				// calculate even for failed lint
				score, err = v.scoringService.CalculateScore(ctx, verLintTask.PackageId, verLintTask.Version, verLintTask.Revision)
				if err != nil {
					log.Errorf("Version scoring failed: %s. (task = %s)", err, verLintTask.Id)
					lintedVerEnt.LintStatus = view.VersionStatusError
					lintedVerEnt.LintDetails = fmt.Sprintf("scoring failed: %s", err)
				}
				log.Infof("Version scoring status=%s. (task = %s)", score.Status, verLintTask.Id)

				lintedVerEnt.LintedAt = time.Now()

				scoreEnt := entity.VersionScore{
					PackageId:                    lintedVerEnt.PackageId,
					Version:                      lintedVerEnt.Version,
					Revision:                     lintedVerEnt.Revision,
					ScoredAt:                     time.Now(),
					Status:                       score.Status,
					Reasons:                      score.Reasons,
					Debug:                        score.Debug,
					BackwardCompatibilityDetails: score.BackwardCompatibilityDetails,
					QualityCheckDetails:          score.QualityCheckDetails,
				}

				err = v.verRepo.VersionLintCompleted(ctx, verLintTask.Id, lintedVerEnt, &scoreEnt)
				if err != nil {
					v.handleProcessingFailed(ctx, verLintTask, err)
					continue
				}
			}
		}
	}
}

func (v versionTaskProcessorImpl) handleProcessingFailed(ctx context.Context, verLintTask entity.VersionLintTask, taskErr error) {
	if verLintTask.RestartCount >= 2 {
		log.Errorf("Failed to process version task %s with status = %s: %s. No more retries.", verLintTask.Id, verLintTask.Status, taskErr)
		updErr := v.verRepo.VersionLintFailed(ctx, verLintTask.Id, fmt.Sprintf("failed to save version lint finished status: %s", taskErr))
		if updErr != nil {
			log.Errorf("Failed to update version lint task %s status to %s: %v", verLintTask.Id, view.TaskStatusError, updErr)
			return
		}
	} else {
		log.Errorf("Failed to process version task %s with status = %s: %s. Going to retry.", verLintTask.Id, verLintTask.Status, taskErr)
		updErr := v.verRepo.IncRestartCount(ctx, verLintTask.Id)
		if updErr != nil {
			log.Errorf("Failed to increment version lint task %s restart count : %v", verLintTask.Id, updErr)
		}
		return
	}
}
