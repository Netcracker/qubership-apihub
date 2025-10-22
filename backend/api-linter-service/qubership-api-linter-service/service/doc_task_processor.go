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

func (d docTaskProcessorImpl) handleError(ctx context.Context, task entity.DocumentLintTask, err error, lintTimeMs int64) {
	log.Infof("Doc task %s failed with error: %s", task.Id, err)

	docEnt := entity.LintedDocument{
		PackageId:         task.PackageId,
		Version:           task.Version,
		Revision:          task.Revision,
		Slug:              task.FileSlug,
		FileId:            task.FileId,
		SpecificationType: task.APIType,
		RulesetId:         task.RulesetId,
		DataHash:          "", // set to empty string because in some error cases it is not available
		LintStatus:        view.StatusError,
		LintDetails:       err.Error(),
	}

	verEnt := entity.LintedVersion{
		PackageId:   task.PackageId,
		Version:     task.Version,
		Revision:    task.Revision,
		LintStatus:  view.VersionStatusInProgress,
		LintDetails: "",
		LintedAt:    time.Now(),
	}

	err = d.docResultRepository.SaveLintResult(ctx, task.Id, view.StatusError, err.Error(),
		lintTimeMs, verEnt, docEnt, nil, d.executorId)
	if err != nil {
		log.Errorf("Handle error for doc task %s failed: unable to save lint result: %s", task.Id, err)
	}
}

func (d docTaskProcessorImpl) processDocTask(ctx context.Context, task entity.DocumentLintTask) {
	// TODO : hash could be in DocumentLintTask, it will allow to avoid downloading the doc and further processing
	// TODO: shortcut by hash here? or validate anyway?
	start := time.Now()

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

	data, err := d.cl.GetDocumentRawData(ctx, task.PackageId, fmt.Sprintf("%s@%d", task.Version, task.Revision), task.FileSlug)
	if err != nil {
		d.handleError(ctx, task, err, time.Since(start).Milliseconds())
		return
	}

	if len(data) == 0 {
		d.handleError(ctx, task, fmt.Errorf("document data is empty"), time.Since(start).Milliseconds())
		return
	}

	tempDir := filepath.Join(os.TempDir(), task.Id)
	if err := os.MkdirAll(tempDir, 0700); err != nil {
		d.handleError(ctx, task, fmt.Errorf("error creating temp directory: %s", err), time.Since(start).Milliseconds())
		return
	}
	defer os.RemoveAll(tempDir)
	ext := filepath.Ext(task.FileId)
	fileName := "file" + ext // Some linters (e.g. Spectral) have a problem with some characters is file names, so generating a safe one.
	filePath := filepath.Join(tempDir, fileName)
	if err := os.WriteFile(filePath, data, 0600); err != nil {
		d.handleError(ctx, task, fmt.Errorf("error writing doc file: %s", err), time.Since(start).Milliseconds())
		return
	}

	docHash := utils.CreateSHA256Hash(data)

	rs, err := d.ruleSetRepository.GetRulesetWithData(ctx, task.RulesetId)
	if err != nil {
		d.handleError(ctx, task, fmt.Errorf("error getting ruleset: %s", err), time.Since(start).Milliseconds())
		return
	}
	rsExt := filepath.Ext(rs.FileName)
	rulesetFileName := "ruleset" + rsExt // Some linters (e.g. Spectral) have a problem with some characters is file names, so generating a safe one.
	rulesetPath := filepath.Join(tempDir, rulesetFileName)
	if err := os.WriteFile(rulesetPath, rs.Data, 0600); err != nil {
		d.handleError(ctx, task, fmt.Errorf("error writing ruleset file: %s", err), time.Since(start).Milliseconds())
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

		log.Infof("Processing doc %s (task id = %s) for package %s, version %s@%d by spectral", task.FileId, task.Id, task.PackageId, task.Version, task.Revision)
		resultPath, calcTime, err := d.spectralExecutor.LintLocalDoc(filePath, rulesetPath)
		if err != nil {
			status = view.StatusError
			details = fmt.Sprintf("error linting doc with spectral: %s", err)
		}

		if status == view.StatusSuccess {
			result, err = os.ReadFile(resultPath)
			if err != nil {
				status = view.StatusError
				details = fmt.Sprintf("error reading result file: %s", err)
			}
			log.Tracef("result file size is %d bytes", len(result))
		}

		if status == view.StatusSuccess {
			err = json.Unmarshal(result, &report)
			if err != nil {
				status = view.StatusError
				details = fmt.Sprintf("error unmarshalling result: %s", err)
			}
		}

		if status == view.StatusSuccess {
			summary = calculateSpectralSummary(report)

			sumJson, err := json.Marshal(summary)
			if err != nil {
				status = view.StatusError
				details = fmt.Sprintf("error marshaling summary: %s", err)
			} else {
				err = json.Unmarshal(sumJson, &sumAsMap)
				if err != nil {
					status = view.StatusError
					details = fmt.Sprintf("error unmarshaling summary: %s", err)
				}
			}
		}

		logDetails := ""
		if details != "" {
			logDetails = fmt.Sprintf("details = %s, ", details)
		}
		log.Infof("Lint finished for doc %s (task id = %s), status = %s, %sProcessing time = %+vms", task.FileId, task.Id, status, logDetails, calcTime)

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
			d.handleError(ctx, task, fmt.Errorf("failed to save lint result with error: %s", err), time.Since(start).Milliseconds())
			return
		}
	} else {
		d.handleError(ctx, task, fmt.Errorf("selected linter %s is not supported", task.Linter), time.Since(start).Milliseconds())
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
