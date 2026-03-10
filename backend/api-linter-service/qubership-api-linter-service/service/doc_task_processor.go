package service

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/Netcracker/qubership-api-linter-service/client"
	"github.com/Netcracker/qubership-api-linter-service/entity"
	"github.com/Netcracker/qubership-api-linter-service/repository"
	"github.com/Netcracker/qubership-api-linter-service/secctx"
	"github.com/Netcracker/qubership-api-linter-service/utils"
	"github.com/Netcracker/qubership-api-linter-service/view"
	log "github.com/sirupsen/logrus"
	"golang.org/x/sync/errgroup"
	"gopkg.in/yaml.v3"
)

type DocTaskProcessor interface {
	Start()
}

func NewDocTaskProcessor(docTaskRepo repository.DocLintTaskRepository, ruleSetRepository repository.RulesetRepository,
	docResultRepository repository.DocResultRepository, lintResultRepository repository.LintResultRepository,
	cl client.ApihubClient, spectralExecutor SpectralExecutor, aiOasExecutor AiOasExecutor, executorId string, spectralLinterWorkers, aiLinterWorkers int, docTaskNotify <-chan struct{}) DocTaskProcessor {
	return &docTaskProcessorImpl{
		docTaskRepo:           docTaskRepo,
		ruleSetRepository:     ruleSetRepository,
		docResultRepository:   docResultRepository,
		lintResultRepository:  lintResultRepository,
		cl:                    cl,
		spectralExecutor:      spectralExecutor,
		aiOasExecutor:         aiOasExecutor,
		executorId:            executorId,
		spectralLinterWorkers: spectralLinterWorkers,
		aiLinterWorkers:       aiLinterWorkers,
		docTaskNotify:         docTaskNotify,
	}
}

type docTaskProcessorImpl struct {
	docTaskRepo          repository.DocLintTaskRepository
	ruleSetRepository    repository.RulesetRepository
	docResultRepository  repository.DocResultRepository
	lintResultRepository repository.LintResultRepository
	cl                   client.ApihubClient
	spectralExecutor     SpectralExecutor
	aiOasExecutor        AiOasExecutor

	executorId            string
	spectralLinterWorkers int
	aiLinterWorkers       int
	docTaskNotify         <-chan struct{}
}

func (d docTaskProcessorImpl) Start() {
	for i := 0; i < d.spectralLinterWorkers; i++ {
		workerExecutorId := "spectral_" + strconv.Itoa(i) + "_" + d.executorId
		utils.SafeAsync(func() {
			d.runWorkerLoop(workerExecutorId, view.SpectralLinter)
			log.Infof("docTaskProcessorImpl: Spectral worker %s exited", workerExecutorId)
		})
	}

	for i := 0; i < d.aiLinterWorkers; i++ {
		workerExecutorId := "ai_" + strconv.Itoa(i) + "_" + d.executorId
		utils.SafeAsync(func() {
			d.runWorkerLoop(workerExecutorId, view.AiLinter)
			log.Infof("docTaskProcessorImpl: AI worker %s exited", workerExecutorId)
		})
	}
	log.Infof("docTaskProcessorImpl: started %d Spectral and %d AI linter workers", d.spectralLinterWorkers, d.aiLinterWorkers)
}

func (d docTaskProcessorImpl) runWorkerLoop(workerExecutorId string, linters ...view.Linter) {
	ticker := time.NewTicker(time.Second * 5)
	defer ticker.Stop()

	running := atomic.Bool{}
	for {
		if running.Load() {
			log.Tracef("docTaskProcessorImpl id=%s: worker skipped, still running", workerExecutorId)
			<-ticker.C
			continue
		}

		select {
		case <-ticker.C:
			// periodic poll
		case _, ok := <-d.docTaskNotify:
			if !ok {
				log.Errorf("docTaskProcessorImpl id=%s: notification channel is closed, worker stopped", workerExecutorId)
				return
			}
			// interrupt sleep and start processing immediately when doc lint task is created
			log.Tracef("docTaskProcessorImpl id=%s: woken by doc task notify", workerExecutorId)
		}
		running.Store(true)
		utils.SafeAsync(func() {
			for {
				moreWork := d.processTask(workerExecutorId, linters...)
				if !moreWork {
					break
				}
				log.Tracef("docTaskProcessorImpl: keep on running")
			}
			running.Store(false)
		})
	}
}

func (d docTaskProcessorImpl) processTask(workerExecutorId string, linters ...view.Linter) bool {
	task, err := d.docTaskRepo.FindFreeDocTask(context.Background(), workerExecutorId, linters...)
	if err != nil {
		log.Errorf("Error finding free doc task: %s", err)
		return false
	}
	if task != nil {
		d.processDocTask(secctx.MakeSysadminContext(context.Background()), *task)
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
		lintTimeMs, verEnt, docEnt, nil, task.ExecutorId)
	if err != nil {
		log.Errorf("Handle error for doc task %s failed: unable to save lint result: %s", task.Id, err)
	}
}

func (d docTaskProcessorImpl) processDocTask(ctx context.Context, task entity.DocumentLintTask) {
	start := time.Now()

	runningC := make(chan struct{})
	defer func() {
		close(runningC)
	}()

	// Update last_active during long run
	utils.SafeAsync(func() {
		t := time.NewTicker(time.Second * 5)

		for {
			select {
			case <-ctx.Done():
				t.Stop()
				return
			case _, ok := <-t.C:
				if !ok {
					t.Stop()
					return
				}
				err := d.docTaskRepo.SetDocTaskStatus(ctx, task.Id, view.TaskStatusProcessing, "", task.ExecutorId)
				if err != nil {
					log.Errorf("Error updating status of doc task %s: %s", task.Id, err)
				}
				log.Tracef("Keepalive for doc task %s", task.Id)
			case _, ok := <-runningC:
				if !ok {
					t.Stop()
					return
				}
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

	docHash := utils.CreateSHA256Hash(data)

	if !task.Recalculate {
		// Validation shortcut: reuse cached result if document (by hash) + ruleset was already linted with same linter version
		currentLinterVersion := d.getLinterVersion(task.Linter)
		cached, err := d.lintResultRepository.GetLintResult(ctx, docHash, task.RulesetId)
		if err != nil {
			log.Warnf("Failed to check lint cache for task %s: %s", task.Id, err)
		}
		if cached != nil && cached.LinterVersion == currentLinterVersion {
			log.Infof("Linter %s: using cached lint result for doc %s (task id = %s), hash = %s", task.Linter, task.FileId, task.Id, docHash)
			d.saveLintResultFromCache(ctx, task, docHash, cached, time.Since(start).Milliseconds())
			return
		}
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
	var LinterVersion string
	var calcTimeMs int64
	logDetails := ""

	if task.Linter == view.SpectralLinter {
		// TODO: move prepare file here?

		// it might take a long time due to linter lock or just long execution
		var resultPath string

		log.Infof("Processing by spectral doc %s (task id = %s) for package %s, version %s@%d. executorId=%s", task.FileId, task.Id, task.PackageId, task.Version, task.Revision, task.ExecutorId)
		resultPath, calcTimeMs, err = d.spectralExecutor.LintLocalDoc(filePath, rulesetPath)
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

		if details != "" {
			logDetails = fmt.Sprintf("details = %s, ", details)
		}

		LinterVersion = d.spectralExecutor.GetLinterVersion()
		log.Tracef("Spectral linter version is %s", LinterVersion)
	}

	if task.Linter == view.AiLinter {
		doc, err := d.cl.GetDocumentDetails(ctx, task.PackageId, fmt.Sprintf("%s@%d", task.Version, task.Revision), task.FileSlug)
		if err != nil {
			status = view.StatusError
			details = fmt.Sprintf("error getting document details: %s", err)
		}

		var rulesetData view.AiRuleset

		if status == view.StatusSuccess {
			err = yaml.Unmarshal(rs.Data, &rulesetData)
			if err != nil {
				status = view.StatusError
				details = fmt.Sprintf("failed to unmarshal AI ruleset: %s", err)
			}
		}

		var issues []view.ValidationIssue
		issueKeys := map[string]struct{}{}

		if status == view.StatusSuccess {
			log.Infof("Processing by AI linter doc %s (task id = %s) operations count = %d for package %s, version %s@%d. executorId=%s", task.FileId, task.Id, len(doc.Operations), task.PackageId, task.Version, task.Revision, task.ExecutorId)

			var mu sync.Mutex
			g, gCtx := errgroup.WithContext(ctx)
			for _, opIt := range doc.Operations {
				op := opIt
				g.Go(func() error {
					operation, err := d.cl.GetOperationWithData(gCtx, task.PackageId, fmt.Sprintf("%s@%d", task.Version, task.Revision), view.RestApiType, op.OperationId)
					if err != nil {
						return fmt.Errorf("error getting document details: %w", err)
					}

					log.Tracef("Linting operation %s via AI for doc %s (task id = %s) for package %s, version %s@%d. executorId=%s", op.OperationId, task.FileId, task.Id, task.PackageId, task.Version, task.Revision, task.ExecutorId)
					opIssues, opCalcTime, err := d.aiOasExecutor.LintOperationForDoc(gCtx, string(operation.Data), rulesetData)
					if err != nil {
						return fmt.Errorf("error linting doc with AI: %w", err)
					}

					mu.Lock()
					for _, opIssue := range opIssues {
						key := strings.Join(opIssue.Path, ".") + "|" + opIssue.Message // TODO any other data?
						if _, exists := issueKeys[key]; exists {
							log.Debugf("Excluded as duplicate issue with path %+v and message = '%s' ", opIssue.Path, opIssue.Message)
							continue
						}
						issueKeys[key] = struct{}{}
						issues = append(issues, opIssue)
					}
					calcTimeMs += opCalcTime
					mu.Unlock()
					return nil
				})
			}

			if err := g.Wait(); err != nil {
				status = view.StatusError
				details = err.Error()
			}

			if status == view.StatusSuccess {
				var dCalcTime int64
				issuesCountBefore := len(issues)
				log.Tracef("Deduplicating %d issues via AI for doc %s (task id = %s) for package %s, version %s@%d. executorId=%s", len(issues), task.FileId, task.Id, task.PackageId, task.Version, task.Revision, task.ExecutorId)
				issues, dCalcTime, err = d.aiOasExecutor.DeduplicateIssues(ctx, issues)
				if err != nil {
					status = view.StatusError
					details = fmt.Errorf("failed to deduplicate issues: %w", err).Error()
				} else {
					issuesCountAfter := len(issues)
					if issuesCountBefore != issuesCountAfter {
						log.Infof("Deduplicated AI linter issues from %d to %d", issuesCountBefore, issuesCountAfter)
					}
				}
				calcTimeMs += dCalcTime
			}
		}

		if status == view.StatusSuccess {
			for _, issue := range issues {
				switch issue.Severity {
				case "error":
					summary.ErrorCount += 1
				case "warning":
					summary.WarningCount += 1
				case "info":
					summary.InfoCount += 1
				case "hint":
					summary.HintCount += 1
				}
			}

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

		if details != "" {
			logDetails = fmt.Sprintf("details = %s, ", details)
		}

		LinterVersion = d.aiOasExecutor.GetLinterVersion()

		issuesB, err := json.Marshal(issues)
		if err != nil {
			status = view.StatusError
			details = fmt.Sprintf("error marshaling issues: %s", err)
		}

		result = issuesB
	}

	if LinterVersion != "" { // if lint was performed
		log.Infof("%s lint finished for doc %s (task id = %s), status = %s, %sProcessing time = %+vms", task.Linter, task.FileId, task.Id, status, logDetails, calcTimeMs)

		log.Tracef("%s linter version is %s", task.Linter, LinterVersion)

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

		err = d.docResultRepository.SaveLintResult(context.Background(), task.Id, status, details, calcTimeMs, verEnt, docEnt, lintFileResult, task.ExecutorId)
		if err != nil {
			d.handleError(ctx, task, fmt.Errorf("failed to save lint result with error: %s", err), time.Since(start).Milliseconds())
			return
		}
	} else {
		d.handleError(ctx, task, fmt.Errorf("selected linter %s is not supported", task.Linter), time.Since(start).Milliseconds())
		return
	}
}

func (d docTaskProcessorImpl) getLinterVersion(linter view.Linter) string {
	switch linter {
	case view.SpectralLinter:
		return d.spectralExecutor.GetLinterVersion()
	case view.AiLinter:
		return d.aiOasExecutor.GetLinterVersion()
	default:
		return ""
	}
}

func (d docTaskProcessorImpl) saveLintResultFromCache(ctx context.Context, task entity.DocumentLintTask, docHash string, cached *entity.LintFileResult, lintTimeMs int64) {
	docEnt := entity.LintedDocument{
		PackageId:         task.PackageId,
		Version:           task.Version,
		Revision:          task.Revision,
		Slug:              task.FileSlug,
		FileId:            task.FileId,
		SpecificationType: task.APIType,
		RulesetId:         task.RulesetId,
		DataHash:          docHash,
		LintStatus:        view.StatusSuccess,
		LintDetails:       "",
	}

	verEnt := entity.LintedVersion{
		PackageId:   task.PackageId,
		Version:     task.Version,
		Revision:    task.Revision,
		LintStatus:  view.VersionStatusInProgress,
		LintDetails: "",
		LintedAt:    time.Now(),
	}

	lintFileResult := &entity.LintFileResult{
		DataHash:      docHash,
		RulesetId:     task.RulesetId,
		LinterVersion: cached.LinterVersion,
		Data:          cached.Data,
		Summary:       cached.Summary,
	}

	err := d.docResultRepository.SaveLintResult(ctx, task.Id, view.StatusSuccess, "", lintTimeMs, verEnt, docEnt, lintFileResult, task.ExecutorId)
	if err != nil {
		log.Errorf("Failed to save cached lint result for task %s: %s", task.Id, err)
	}
}
