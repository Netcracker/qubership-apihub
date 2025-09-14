package service

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/Netcracker/qubership-api-linter-service/client"
	"github.com/Netcracker/qubership-api-linter-service/entity"
	"github.com/Netcracker/qubership-api-linter-service/repository"
	"github.com/Netcracker/qubership-api-linter-service/secctx"
	"github.com/Netcracker/qubership-api-linter-service/utils"
	"github.com/Netcracker/qubership-api-linter-service/view"
	log "github.com/sirupsen/logrus"
	"os"
	"path/filepath"
	"sync/atomic"
	"time"
)

type DocTaskProcessor interface {
	Start()
}

func NewDocTaskProcessor(docTaskRepo repository.DocLintTaskRepository, ruleSetRepository repository.RulesetRepository,
	docResultRepository repository.DocResultRepository, cl client.ApihubClient, spectralExecutor SpectralExecutor, executorId string) DocTaskProcessor {
	return &docTaskProcessorImpl{
		docTaskRepo:         docTaskRepo,
		ruleSetRepository:   ruleSetRepository,
		docResultRepository: docResultRepository,
		cl:                  cl,
		spectralExecutor:    spectralExecutor,
		executorId:          executorId,
	}
}

type docTaskProcessorImpl struct {
	docTaskRepo         repository.DocLintTaskRepository
	ruleSetRepository   repository.RulesetRepository
	docResultRepository repository.DocResultRepository
	cl                  client.ApihubClient
	spectralExecutor    SpectralExecutor

	executorId string
}

// TODO: maybe need some fast track
// TODO: read from ticker chan or from events chan

func (d docTaskProcessorImpl) Start() {
	// TODO: multiple threads or not?

	utils.SafeAsync(func() {
		ticker := time.NewTicker(time.Second * 5)

		running := atomic.Bool{}

		for range ticker.C {
			if running.Load() {
				log.Tracef("docTaskProcessorImpl: ticker skipped, running")
				continue
			}

			utils.SafeAsync(func() {
				running.Store(true)
				for {
					moreWork := d.processTask()
					if moreWork == false {
						break
					}
					log.Tracef("docTaskProcessorImpl: keep on running")
				}
				running.Store(false)
			})
		}
	})
}

func (d docTaskProcessorImpl) processTask() bool {
	task, err := d.docTaskRepo.FindFreeDocTask(context.Background(), d.executorId)
	if err != nil {
		log.Errorf("Error finding free doc task: %s", err)
		return false
	}
	if task != nil {
		d.processDocTask(secctx.MakeSysadminContext(context.Background()), *task)
		d.writeAsyncTestLog(task.Id)
		return true
	}
	return false
}

func (d docTaskProcessorImpl) handleError(ctx context.Context, docTaskId string, err error) {
	log.Infof("Doc task %s failed with error: %s", docTaskId, err)
	setErr := d.docTaskRepo.SetDocTaskStatus(ctx, docTaskId, view.TaskStatusError, err.Error(), d.executorId)
	if setErr != nil {
		log.Errorf("Error updating status of doc task %s: %s", docTaskId, err)
	}
}

func (d docTaskProcessorImpl) processDocTask(ctx context.Context, task entity.DocumentLintTask) {
	// TODO : hash could be in DocumentLintTask, it will allow to avoid downloading the doc and further processing
	// TODO: shortcut here

	runningC := make(chan struct{})
	defer func() {
		close(runningC)
	}()

	// Update last_active during long run
	utils.SafeAsync(func() {
		t := time.NewTicker(time.Second * 5)
		select {
		case <-ctx.Done():
			t.Stop()
			break
		case _, ok := <-t.C:
			if !ok {
				t.Stop()
				break
			}
			err := d.docTaskRepo.SetDocTaskStatus(ctx, task.Id, view.TaskStatusProcessing, "", d.executorId)
			if err != nil {
				log.Errorf("Error updating status of doc task %s: %s", task.Id, err)
			}
		case _, ok := <-runningC:
			if !ok {
				t.Stop()
				break
			}
		}
	})

	// TODO: get document metadata??

	data, err := d.cl.GetDocumentRawData(ctx, task.PackageId, fmt.Sprintf("%s@%d", task.Version, task.Revision), task.FileSlug)
	if err != nil {
		d.handleError(ctx, task.Id, err)
		return
	}

	if len(data) == 0 {
		d.handleError(ctx, task.Id, fmt.Errorf("document data is empty")) // TODO: save lint result!
		return
	}

	tempDir := filepath.Join(os.TempDir(), task.Id)
	if err := os.MkdirAll(tempDir, 0700); err != nil {
		d.handleError(ctx, task.Id, fmt.Errorf("error creating temp directory: %s", err))
		return
	}
	defer os.RemoveAll(tempDir)
	ext := filepath.Ext(task.FileId)
	fileName := "file" + ext

	filePath := filepath.Join(tempDir, fileName)
	if err := os.WriteFile(filePath, data, 0600); err != nil {
		d.handleError(ctx, task.Id, fmt.Errorf("error writing doc file: %s", err))
		return
	}

	docHash := utils.CreateSHA256Hash(data)

	rs, err := d.ruleSetRepository.GetRulesetWithData(ctx, task.RulesetId)
	if err != nil {
		d.handleError(ctx, task.Id, fmt.Errorf("error getting ruleset: %s", err))
		return
	}
	rulesetPath := filepath.Join(tempDir, rs.FileName)
	if err := os.WriteFile(rulesetPath, rs.Data, 0600); err != nil {
		d.handleError(ctx, task.Id, fmt.Errorf("error writing ruleset file: %s", err))
		return
	}

	status := view.StatusSuccess
	details := ""
	var result []byte
	var report []interface{}
	var summary view.SpectralResultSummary
	var sumAsMap map[string]interface{}

	if task.Linter == view.SpectralLinter {
		// it might take a long time due to linter lock or just long execution

		log.Infof("Processing doc %s for package %s, version %s@%d by spectral", task.FileId, task.PackageId, task.Version, task.Revision)
		resultPath, calcTime, err := d.spectralExecutor.LintLocalDoc(filePath, rulesetPath)
		if err != nil {
			status = view.StatusFailure
			details = fmt.Sprintf("error linting doc with spectral: %s", err)
		}

		if status == view.StatusSuccess {
			result, err = os.ReadFile(resultPath)
			if err != nil {
				status = view.StatusFailure
				details = fmt.Sprintf("error reading result file: %s", err)
			}
			log.Tracef("result file size is %d bytes", len(result))
		}

		if status == view.StatusSuccess {
			err = json.Unmarshal(result, &report)
			if err != nil {
				status = view.StatusFailure
				details = fmt.Sprintf("error unmarshalling result: %s", err)
			}
		}
		log.Infof("Doc task id = %s, Processing time = %+vms", task.Id, calcTime)

		if status == view.StatusSuccess {
			summary = calculateSpectralSummary(report)

			sumJson, err := json.Marshal(summary)
			if err != nil {
				status = view.StatusFailure
				details = fmt.Sprintf("error marshaling summary: %s", err)
			} else {
				err = json.Unmarshal(sumJson, &sumAsMap)
				if err != nil {
					status = view.StatusFailure
					details = fmt.Sprintf("error unmarshaling summary: %s", err)
				}
			}
		}

		LinterVersion := d.spectralExecutor.GetLinterVersion()
		log.Tracef("Spectral linter version is %s", LinterVersion)

		docEnt := entity.LintedDocument{
			PackageId:         task.PackageId,
			Version:           task.Version,
			Revision:          task.Revision,
			Slug:              task.FileSlug,
			FileId:            task.FileId,
			SpecificationType: task.APIType,
			RulesetId:         task.RulesetId,
			DataHash:          docHash,
			LintStatus:        status,
			LintDetails:       details,
		}

		verEnt := entity.LintedVersion{
			PackageId:   task.PackageId,
			Version:     task.Version,
			Revision:    task.Revision,
			LintStatus:  view.VersionStatusInProgress,
			LintDetails: "",
			LintedAt:    time.Now(),
		}

		var lintFileResult *entity.LintFileResult

		if status == view.StatusSuccess {
			lintFileResult = &entity.LintFileResult{
				DataHash:      docHash,
				RulesetId:     task.RulesetId,
				LinterVersion: LinterVersion,
				Data:          result,
				Summary:       sumAsMap,
			}
		}

		err = d.docResultRepository.SaveLintResult(context.Background(), task.Id, status, details, calcTime, verEnt, docEnt, lintFileResult, d.executorId)
		if err != nil {
			d.handleError(ctx, task.Id, fmt.Errorf("failed to save lint result with error: %s", err))
			return
		}
	} else {
		d.handleError(ctx, task.Id, fmt.Errorf("selected linter %s is not supported", task.Linter))
		return
	}
}

// TODO: temp! just for testing!
func (d docTaskProcessorImpl) writeAsyncTestLog(taskId string) {
	enabled := os.Getenv("TASK_LOG")
	if enabled == "" {
		return
	}
	fileName := "doc_task_log_" + d.executorId + ".txt"

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
