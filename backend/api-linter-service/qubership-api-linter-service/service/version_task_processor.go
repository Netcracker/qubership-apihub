package service

import (
	"context"
	"fmt"
	"github.com/Netcracker/qubership-api-linter-service/client"
	"github.com/Netcracker/qubership-api-linter-service/entity"
	"github.com/Netcracker/qubership-api-linter-service/repository"
	"github.com/Netcracker/qubership-api-linter-service/secctx"
	"github.com/Netcracker/qubership-api-linter-service/utils"
	"github.com/Netcracker/qubership-api-linter-service/view"
	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"
	"os"
	"sync/atomic"
	"time"
)

type VersionTaskProcessor interface {
	StartVersionLintTask(taskId string) error
}

func NewVersionTaskProcessor(verRepo repository.VersionLintTaskRepository, docRepo repository.DocLintTaskRepository, verResRepo repository.VersionResultRepository, cl client.ApihubClient, linterSelectorService LinterSelectorService, executorId string) VersionTaskProcessor {
	svc := &versionTaskProcessorImpl{
		verRepo:               verRepo,
		docRepo:               docRepo,
		verResRepo:            verResRepo,
		cl:                    cl,
		linterSelectorService: linterSelectorService,
		executorId:            executorId,
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
	executorId            string
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

	type linterAndRuleset struct {
		linter    view.Linter
		rulesetId string
		err       error
	}

	typeToLinter := make(map[view.ApiType]linterAndRuleset)
	for _, doc := range docs.Documents {
		_, exists := typeToLinter[doc.Type]
		if !exists {
			linter, rulesetId, err := v.linterSelectorService.SelectLinterAndRuleset(ctx, doc.Type)

			typeToLinter[doc.Type] = linterAndRuleset{
				linter:    linter,
				rulesetId: rulesetId,
				err:       err,
			}
		}
	}

	var docTasks []entity.DocumentLintTask

	for _, doc := range docs.Documents {
		if !supportedApiType(doc.Type) {
			log.Infof("Skipping document %s for [ %s | %s ] with unsupported api type: %s", doc.Slug, task.PackageId, task.Version, doc.Type)
			continue
		}

		lr := typeToLinter[doc.Type]

		status := view.TaskStatusNotStarted
		details := ""
		executorId := ""

		if lr.err != nil {
			status = view.TaskStatusError
			details = lr.err.Error()
			executorId = v.executorId
		}

		if lr.rulesetId == "" {
			status = view.TaskStatusError
			details = fmt.Sprintf("No suitable ruleset was found. Linter=%s", lr.linter)
			executorId = v.executorId
		}

		docTaskEnt := entity.DocumentLintTask{
			Id:                uuid.NewString(),
			VersionLintTaskId: taskId,
			PackageId:         task.PackageId,
			Version:           task.Version,
			Revision:          task.Revision,
			FileId:            doc.FieldId,
			FileSlug:          doc.Slug,
			APIType:           doc.Type,
			Linter:            lr.linter,
			RulesetId:         lr.rulesetId,
			Status:            status,
			Details:           details,
			CreatedAt:         time.Now(),
			ExecutorId:        executorId,
			LastActive:        nil,
			RestartCount:      0,
			Priority:          0,
			LintTimeMs:        0,
		}

		docTasks = append(docTasks, docTaskEnt)
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

	log.Infof("Version lint task for [ %s | %s ] (id = %s) is processed, %d doc lint task(s) created. Processing time = %dms", task.PackageId, task.Version, taskId, len(docTasks), time.Since(start).Milliseconds())
}

func supportedApiType(at view.ApiType) bool {
	switch at {
	case view.OpenAPI20Type, view.OpenAPI30Type, view.OpenAPI31Type:
		return true
	default:
		return false
	}
}

func (v versionTaskProcessorImpl) acquireFreeTasks() {
	t := time.NewTicker(time.Second * 5)

	running := atomic.Bool{}
	for range t.C {
		if running.Load() {
			log.Tracef("versionTaskProcessorImpl: ticker skipped, running")
			continue
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
		v.writeAsyncTestLog(task.Id)
		return true
	}
	return false
}

func (v versionTaskProcessorImpl) checkDocReady() {
	t := time.NewTicker(time.Second * 5)
	ctx := context.Background()
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

				if numFailed > 0 {
					log.Infof("Version lint (task = %s) is failed because of failed doc tasks", verLintTask.Id)
					lintedVerEnt.LintStatus = view.VersionStatusError
					lintedVerEnt.LintDetails = fmt.Sprintf("%d doc task(s) failed", numFailed)
				} else {
					log.Infof("Version lint (task = %s) successfully completed", verLintTask.Id)
					lintedVerEnt.LintStatus = view.VersionStatusSuccess
					lintedVerEnt.LintDetails = ""
				}
				lintedVerEnt.LintedAt = time.Now()

				err = v.verRepo.VersionLintCompleted(ctx, verLintTask.Id, lintedVerEnt)
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
		log.Error("Failed to process version task %s with status = %s: %s. No more retries.", verLintTask.Id, verLintTask.Status, taskErr)
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

// TODO: temp! just for testing!
func (v versionTaskProcessorImpl) writeAsyncTestLog(taskId string) {
	enabled := os.Getenv("TASK_LOG")
	if enabled == "" {
		return
	}
	fileName := "ver_task_log_" + v.executorId + ".txt"

	// Open the file in append mode, create it if it doesn't exist, with write-only permissions
	file, err := os.OpenFile(fileName, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Errorf("failed to open test log entry file %s", fileName)
		return
	}
	defer file.Close()

	if _, err := file.WriteString(taskId + "\n"); err != nil {
		log.Errorf("failed to write test log entry to file %s", fileName)
		return
	}
}
