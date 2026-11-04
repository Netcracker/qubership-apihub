package service

import (
	"context"
	"fmt"
	"runtime/debug"
	"slices"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/client"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/entity"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/repository"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/secctx"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/utils"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/view"
	log "github.com/sirupsen/logrus"
)

const (
	scoringTaskPollInterval      = 5 * time.Second
	scoringTaskHeartbeatInterval = 5 * time.Second
	scoringTaskWorkInterval      = 5 * time.Second

	versionContentMissingError = "version content not available"

	changelogUnreliableBwcReason = "Changelog against the previous version has errors, so the backwards compatibility result is unreliable."

	versionChangesPageLimit = 100

	bwcInternalErrorReason            = "Internal error: failed to calculate backwards compatibility details."
	qualityInternalErrorReason        = "Internal error: failed to calculate quality check details."
	versionContentInternalErrorReason = "Internal error: failed to get version content."

	changelogHasErrorsReason          = "Changelog against the previous version has errors."
	versionHasPublicationErrorsReason = "Version has publication errors."

	contractDisplayDDL = "DDL"
	contractDisplayMCP = "MCP"
)

func NewScoringTaskProcessor(
	scoringTaskRepo repository.ScoringTaskRepository,
	scoringRepo repository.ScoringRepository,
	verTaskRepo repository.VersionLintTaskRepository,
	docTaskRepo repository.DocLintTaskRepository,
	versionResultRepo repository.VersionResultRepository,
	lintResultRepo repository.LintResultRepository,
	rulesetRepo repository.RulesetRepository,
	linterConfigService LinterConfigService,
	apihubClient client.ApihubClient,
	executorId string,
	scoringTaskNotify <-chan struct{},
) {
	p := &scoringTaskProcessorImpl{
		scoringTaskRepo:     scoringTaskRepo,
		scoringRepo:         scoringRepo,
		verTaskRepo:         verTaskRepo,
		docTaskRepo:         docTaskRepo,
		versionResultRepo:   versionResultRepo,
		lintResultRepo:      lintResultRepo,
		rulesetRepo:         rulesetRepo,
		linterConfigService: linterConfigService,
		apihubClient:        apihubClient,
		executorId:          executorId,
		runningBwc:          make(map[string]bool),
		startBwcRun:         func(run func()) { utils.SafeAsync(run) },
		scoringTaskNotify:   scoringTaskNotify,
	}
	ctx := secctx.MakeSysadminContext(context.Background())

	utils.SafeAsync(func() {
		t := time.NewTicker(scoringTaskPollInterval)
		defer t.Stop()
		for {
			select {
			case <-t.C:
			case <-p.scoringTaskNotify:
			}
			p.acquireTasks(ctx)
		}
	})

	utils.SafeAsync(func() {
		t := time.NewTicker(scoringTaskHeartbeatInterval)
		defer t.Stop()
		for range t.C {
			if err := p.scoringTaskRepo.RefreshLeases(ctx, p.executorId); err != nil {
				log.Errorf("Failed to refresh the leases of scoring tasks: %s", err)
			}
		}
	})

	utils.SafeAsync(func() {
		t := time.NewTicker(scoringTaskWorkInterval)
		defer t.Stop()
		p.workLoop(ctx, t.C)
	})
}

// workLoop recovers every tick on its own, for a panic before any task is at hand; processTick recovers each task
// itself. The loop must keep running while the heartbeat keeps the leases alive.
func (p *scoringTaskProcessorImpl) workLoop(ctx context.Context, ticks <-chan time.Time) {
	for range ticks {
		func() {
			defer func() {
				if r := recover(); r != nil {
					log.Errorf("Scoring work tick failed with panic: %v\n%s", r, debug.Stack())
				}
			}()
			p.processTick(ctx)
		}()
	}
}

type scoringTaskProcessorImpl struct {
	scoringTaskRepo     repository.ScoringTaskRepository
	scoringRepo         repository.ScoringRepository
	verTaskRepo         repository.VersionLintTaskRepository
	docTaskRepo         repository.DocLintTaskRepository
	versionResultRepo   repository.VersionResultRepository
	lintResultRepo      repository.LintResultRepository
	rulesetRepo         repository.RulesetRepository
	linterConfigService LinterConfigService
	apihubClient        client.ApihubClient
	executorId          string

	runningBwcMu sync.Mutex
	runningBwc   map[string]bool
	startBwcRun  func(run func())

	scoringTaskNotify <-chan struct{}
}

func (p *scoringTaskProcessorImpl) acquireTasks(ctx context.Context) {
	for {
		task, exhausted, err := p.scoringTaskRepo.ClaimFreeScoringTask(ctx, p.executorId)
		if err != nil {
			log.Errorf("Failed to claim free scoring task: %s", err)
			return
		}
		if task == nil {
			return
		}
		if exhausted {
			p.failScoringTask(ctx, *task, fmt.Sprintf("restart count exceeded limit, last error: %s", task.Details))
			continue
		}
		log.Debugf("Scoring task %s for [ %s | %s@%d ] is claimed", task.Id, task.PackageId, task.Version, task.Revision)
	}
}

func (p *scoringTaskProcessorImpl) processTick(ctx context.Context) {
	tasks, err := p.scoringTaskRepo.GetProcessingTasks(ctx, p.executorId)
	if err != nil {
		log.Errorf("Failed to get owned scoring tasks: %s", err)
		return
	}
	for _, task := range tasks {
		func() {
			defer func() {
				if r := recover(); r != nil {
					log.Errorf("Scoring task %s failed with panic: %v\n%s", task.Id, r, debug.Stack())
					// Counted like any failed attempt, so a task that always panics reaches the restart limit.
					p.attemptFailed(ctx, task, fmt.Errorf("panic: %v", r))
				}
			}()

			score, err := p.scoringRepo.GetScoringForVersion(ctx, task.PackageId, task.Version, task.Revision)
			if err != nil {
				p.attemptFailed(ctx, task, fmt.Errorf("failed to get score: %w", err))
				return
			}
			// Before the restart limit: a refused write leaves the task open, so only this check closes a lost task,
			// including exhausted tasks.
			var lost string
			if score == nil {
				lost = "score row missing"
			} else if score.ScoringTaskId != task.Id {
				lost = fmt.Sprintf("superseded by scoring task %s", score.ScoringTaskId)
			}
			if lost != "" {
				if err := p.scoringTaskRepo.CloseLostTask(ctx, task.Id, p.executorId, lost); err != nil {
					log.Errorf("Failed to close scoring task %s (%s): %s", task.Id, lost, err)
				} else {
					log.Infof("Scoring task %s is closed: %s", task.Id, lost)
				}
				return
			}

			if task.RestartCount >= repository.MaxScoringTaskRestarts {
				p.failScoringTask(ctx, task, fmt.Sprintf("restart count exceeded limit, last error: %s", task.Details))
				return
			}

			if !score.PublicationIntegrityStatus.IsTerminal() || !score.BackwardCompatibilityStatus.IsTerminal() {
				p.runningBwcMu.Lock()
				alreadyRunning := p.runningBwc[task.Id]
				p.runningBwc[task.Id] = true
				p.runningBwcMu.Unlock()
				if !alreadyRunning {
					partsSnapshot := *score
					p.startBwcRun(func() {
						defer func() {
							p.runningBwcMu.Lock()
							delete(p.runningBwc, task.Id)
							p.runningBwcMu.Unlock()
						}()
						p.runIntegrityAndBwcChecks(ctx, task, partsSnapshot)
					})
				}
			}

			if !score.QualityCheckStatus.IsTerminal() {
				lintTask, err := p.verTaskRepo.GetTaskById(ctx, task.VersionLintTaskId)
				if err != nil {
					p.attemptFailed(ctx, task, fmt.Errorf("failed to get lint task %s: %w", task.VersionLintTaskId, err))
					return
				}
				var docTasks []entity.DocumentLintTask
				if lintTask != nil {
					docTasks, err = p.docTaskRepo.GetDocTasksForVersionTasks(ctx, []string{lintTask.Id})
					if err != nil {
						p.attemptFailed(ctx, task, fmt.Errorf("failed to get document tasks of lint task %s: %w", lintTask.Id, err))
						return
					}
				}
				var newTasks []entity.DocumentLintTask
				handledIds := task.HandledDocTaskIds
				for _, docTask := range docTasks {
					if docTask.Status != view.TaskStatusSuccess && docTask.Status != view.TaskStatusError {
						continue
					}
					if slices.Contains(task.HandledDocTaskIds, docTask.Id) {
						continue
					}
					newTasks = append(newTasks, docTask)
					handledIds = append(handledIds, docTask.Id)
				}
				details, status, partErr, err := p.calculateQualityCheck(ctx, lintTask, newTasks)
				if err != nil {
					p.attemptFailed(ctx, task, fmt.Errorf("failed to calculate quality check: %w", err))
					return
				}
				if len(newTasks) > 0 || status != score.QualityCheckStatus {
					score, err = p.scoringTaskRepo.UpdateQualityCheck(ctx, task, handledIds, func(row *entity.VersionScore) {
						if !row.QualityCheckStatus.IsTerminal() {
							if row.QualityCheckDetails == nil {
								row.QualityCheckDetails = map[view.OpApiType][]view.QualityCheckDetails{}
							}
							for apiType, entries := range details {
								row.QualityCheckDetails[apiType] = append(row.QualityCheckDetails[apiType], entries...)
							}
							if status == view.ScoringProcessError && len(row.QualityCheckDetails) == 0 {
								row.QualityCheckDetails = nil
							}
							row.QualityCheckStatus = status
							row.QualityCheckError = partErr
						}
						recomputeOverallStatus(row)
					})
					if err != nil {
						p.attemptFailed(ctx, task, err)
						return
					}
					if score == nil {
						log.Infof("Scoring task %s: quality check write refused; task ownership was lost or the score row was replaced or deleted", task.Id)
						return
					}
				}
			}

			if !score.PartsFinished() {
				return
			}
			completed, err := p.scoringTaskRepo.CompleteScoring(ctx, task, recomputeOverallStatus)
			if err != nil {
				p.attemptFailed(ctx, task, err)
				return
			}
			if completed {
				log.Infof("Scoring task %s for [ %s | %s@%d ] is completed", task.Id, task.PackageId, task.Version, task.Revision)
			}
		}()
	}
}

func (p *scoringTaskProcessorImpl) runIntegrityAndBwcChecks(ctx context.Context, task entity.VersionScoringTask, score entity.VersionScore) {
	// A panic counts as a failed attempt, so a part that always panics reaches the restart limit instead of being
	// retried forever.
	defer func() {
		if r := recover(); r != nil {
			p.attemptFailed(ctx, task, fmt.Errorf("panic: %v", r))
		}
	}()

	version := fmt.Sprintf("%s@%d", task.Version, task.Revision)
	versionContent, err := p.apihubClient.GetVersion(ctx, task.PackageId, version, true, true)
	if err == nil && versionContent == nil {
		err = fmt.Errorf("version %s not found for package %s", version, task.PackageId)
	}
	if err != nil {
		p.attemptFailed(ctx, task, fmt.Errorf("failed to get version content: %w", err))
		return
	}

	if !score.PublicationIntegrityStatus.IsTerminal() {
		integrity := calculatePublicationIntegrity(versionContent)
		written, err := p.scoringTaskRepo.UpdateScore(ctx, task, func(row *entity.VersionScore) {
			if !row.PublicationIntegrityStatus.IsTerminal() {
				row.PublicationIntegrityDetails = &integrity
				row.PublicationIntegrityStatus = view.ScoringProcessCompleted
			}
			recomputeOverallStatus(row)
		})
		if err != nil {
			p.attemptFailed(ctx, task, err)
			return
		}
		if written == nil {
			log.Infof("Scoring task %s: publication integrity write refused; task ownership was lost or the score row was replaced or deleted", task.Id)
			return
		}
	}

	if score.BackwardCompatibilityStatus.IsTerminal() {
		return
	}
	bwc, err := p.calculateBackwardsCompatibility(ctx, task.PackageId, version, versionContent)
	if err != nil {
		p.attemptFailed(ctx, task, err)
		return
	}
	written, err := p.scoringTaskRepo.UpdateScore(ctx, task, func(row *entity.VersionScore) {
		if !row.BackwardCompatibilityStatus.IsTerminal() {
			row.BackwardCompatibilityDetails = bwc
			row.BackwardCompatibilityStatus = view.ScoringProcessCompleted
		}
		recomputeOverallStatus(row)
	})
	if err != nil {
		p.attemptFailed(ctx, task, err)
		return
	}
	if written == nil {
		log.Infof("Scoring task %s: backwards compatibility write refused; task ownership was lost or the score row was replaced or deleted", task.Id)
	}
}

func (p *scoringTaskProcessorImpl) failScoringTask(ctx context.Context, task entity.VersionScoringTask, details string) {
	partErr := fmt.Sprintf("scoring task failed: %s", details)
	failed, err := p.scoringTaskRepo.ScoringFailed(ctx, task, details, func(row *entity.VersionScore) {
		// BWC runs only after the version content was read for integrity, so a pending integrity part means the
		// content never arrived.
		bwcErr := partErr
		if !row.PublicationIntegrityStatus.IsTerminal() {
			bwcErr = versionContentMissingError
			row.PublicationIntegrityStatus = view.ScoringProcessError
			row.PublicationIntegrityError = partErr
		}
		if !row.BackwardCompatibilityStatus.IsTerminal() {
			row.BackwardCompatibilityStatus = view.ScoringProcessError
			row.BackwardCompatibilityError = bwcErr
		}
		if !row.QualityCheckStatus.IsTerminal() {
			row.QualityCheckStatus = view.ScoringProcessError
			row.QualityCheckError = partErr
		}
		row.ProcessStatus = view.ScoringProcessCompleted
		recomputeOverallStatus(row)
	})
	if err != nil {
		log.Errorf("Failed to mark scoring task %s as failed, retrying on the next tick: %s", task.Id, err)
		return
	}
	if !failed {
		log.Infof("Scoring task %s: failure write refused; task ownership was lost or the score row was replaced or deleted", task.Id)
		return
	}
	log.Errorf("Scoring task %s for [ %s | %s@%d ] failed: %s", task.Id, task.PackageId, task.Version, task.Revision, details)
}

func (p *scoringTaskProcessorImpl) attemptFailed(ctx context.Context, task entity.VersionScoringTask, err error) {
	log.Errorf("Scoring task %s attempt failed: %s", task.Id, err)
	owned, incErr := p.scoringTaskRepo.IncRestartCount(ctx, task.Id, p.executorId, err.Error())
	if incErr != nil {
		log.Errorf("Failed to increment the restart count of scoring task %s: %s", task.Id, incErr)
		return
	}
	if !owned {
		log.Infof("Scoring task %s is no longer owned by executor %s", task.Id, p.executorId)
	}
}

func (p *scoringTaskProcessorImpl) calculateQualityCheck(ctx context.Context, lintTask *entity.VersionLintTask, tasks []entity.DocumentLintTask) (map[view.OpApiType][]view.QualityCheckDetails, view.ScoringProcessStatus, string, error) {
	if lintTask == nil {
		return nil, view.ScoringProcessError, "lint task not found", nil
	}

	status := view.ScoringProcessInProgress
	partErr := ""
	switch lintTask.Status {
	case view.TaskStatusSuccess:
		status = view.ScoringProcessCompleted
	case view.TaskStatusError:
		status = view.ScoringProcessError
		partErr = fmt.Sprintf("lint task failed: %s", lintTask.Details)
	}
	if len(tasks) == 0 {
		return nil, status, partErr, nil
	}

	var rulesetIds []string
	for _, task := range tasks {
		if task.Status == view.TaskStatusSuccess {
			rulesetIds = append(rulesetIds, task.RulesetId)
		}
	}
	sort.Slice(tasks, func(i, j int) bool {
		if tasks[i].FileSlug != tasks[j].FileSlug {
			return tasks[i].FileSlug < tasks[j].FileSlug
		}
		return tasks[i].Linter < tasks[j].Linter
	})

	rulesetMap, err := p.makeRulesetMap(ctx, rulesetIds)
	if err != nil {
		return nil, "", "", fmt.Errorf("failed to make ruleset map: %w", err)
	}
	_, lintedDocs, err := p.versionResultRepo.GetVersionAndDocsSummary(ctx, lintTask.PackageId, lintTask.Version, lintTask.Revision)
	if err != nil {
		return nil, "", "", fmt.Errorf("failed to get version and docs lint result: %w", err)
	}
	type lintedDocKey struct {
		fileId    string
		rulesetId string
	}
	lintedDocMap := make(map[lintedDocKey]entity.LintedDocument, len(lintedDocs))
	for _, doc := range lintedDocs {
		lintedDocMap[lintedDocKey{fileId: doc.FileId, rulesetId: doc.RulesetId}] = doc
	}

	details := map[view.OpApiType][]view.QualityCheckDetails{}
	for _, task := range tasks {
		opApiType := view.ApiTypeToOpApiType(task.APIType)
		if opApiType == "" {
			return nil, "", "", fmt.Errorf("unsupported API type: %s", task.APIType)
		}

		var vd view.QualityCheckDetails
		if task.Status == view.TaskStatusError {
			vd = view.QualityCheckDetails{
				Linter:        task.Linter,
				Status:        view.ScoringPassed,
				Optional:      p.linterConfigService.IsLinterOptional(task.Linter),
				InternalError: task.Details,
			}
			if !vd.Optional {
				vd.Status = view.ScoringNotPassed
				vd.Reason = fmt.Sprintf("Validation internal error for linter %s.", task.Linter)
			}
		} else {
			doc, ok := lintedDocMap[lintedDocKey{fileId: task.FileId, rulesetId: task.RulesetId}]
			if !ok {
				return nil, "", "", fmt.Errorf("no lint result for document %s and ruleset %s of finished task %s", task.FileSlug, task.RulesetId, task.Id)
			}
			vd, err = p.buildValidationDetails(ctx, doc, rulesetMap[task.RulesetId])
			if err != nil {
				return nil, "", "", err
			}
		}
		details[opApiType] = append(details[opApiType], vd)
	}

	return details, status, partErr, nil
}

func (p *scoringTaskProcessorImpl) buildValidationDetails(ctx context.Context, doc entity.LintedDocument, ruleset entity.Ruleset) (view.QualityCheckDetails, error) {
	// Optional linters are non-blocking: their internal/execution failures are recorded in
	// InternalError for visibility but must not push the score to not_passed. Issues found by an
	// optional linter that ran successfully still count (see the errors/warnings branch below).
	optional := p.linterConfigService.IsLinterOptional(ruleset.Linter)

	vd := view.QualityCheckDetails{
		Linter:        ruleset.Linter,
		Status:        view.ScoringPassed,
		Optional:      optional,
		Reason:        "",
		ErrorsCount:   0,
		WarningsCount: 0,
		InternalError: "",
	}

	if doc.LintStatus == view.StatusError {
		vd.InternalError = doc.LintDetails
		if !optional {
			vd.Status = view.ScoringNotPassed
			vd.Reason = fmt.Sprintf("Validation internal error for linter %s.", ruleset.Linter)
		}
		return vd, nil
	}

	summary, err := p.lintResultRepo.GetLintResultSummary(ctx, doc.DataHash, doc.RulesetId)
	if err != nil {
		return vd, fmt.Errorf("failed to get lint result summary for document %s and ruleset %s: %w", doc.Slug, doc.RulesetId, err)
	}
	if summary == nil {
		return vd, fmt.Errorf("no lint result summary for document %s and ruleset %s", doc.Slug, doc.RulesetId)
	}

	issues, err := makeSpectralSummary(summary.Summary)
	if err != nil {
		vd.InternalError = fmt.Sprintf("failed to parse lint summary: %s", err)
		if !optional {
			vd.Status = view.ScoringNotPassed
			vd.Reason = "Validation internal error"
		}
		return vd, nil
	}

	vd.ErrorsCount = issues.Error
	vd.WarningsCount = issues.Warning

	if issues.Error > 0 {
		vd.Status = view.ScoringNotPassed
		vd.Reason = fmt.Sprintf("Version contain %d errors for linter %s.", issues.Error, ruleset.Linter)
	} else if issues.Warning > 0 {
		vd.Status = view.ScoringPassedWithDefects
		vd.Reason = fmt.Sprintf("Version contain %d warnings for linter %s.", issues.Warning, ruleset.Linter)
	}

	return vd, nil
}

const breakingMessage = "found breaking change for package %s version %s operation %s:%s"

func (p *scoringTaskProcessorImpl) calculateBackwardsCompatibility(ctx context.Context, packageId, version string, versionContent *view.VersionContent) (map[view.OpApiType]view.BackwardCompatibilityDetails, error) {
	result := map[view.OpApiType]view.BackwardCompatibilityDetails{}

	if versionContent == nil {
		return nil, fmt.Errorf("version %s not found for package %s", version, packageId)
	}

	if versionContent.PreviousVersion == "" {
		// No ability to implement generic previous version validation for all cases. Just skip BWC check.
		return result, nil
	}

	if versionContent.PreviousVersionPackageId == "" {
		versionContent.PreviousVersionPackageId = packageId
	}
	previousVersionContent, err := p.apihubClient.GetVersion(ctx, versionContent.PreviousVersionPackageId, versionContent.PreviousVersion, false, false)
	if err != nil {
		return nil, fmt.Errorf("failed to get previous version %s for package %s: %w", versionContent.PreviousVersion, versionContent.PreviousVersionPackageId, err)
	}
	if previousVersionContent == nil {
		return nil, fmt.Errorf("(previous) version %s not found for package %s", versionContent.PreviousVersion, versionContent.PreviousVersionPackageId)
	}

	// TODO: switch to ApiAudienceTransitions ???
	// TODO: calculate breaking for audience on Apihub or builder???

	for _, ot := range versionContent.OperationTypes {
		bwc := view.BackwardCompatibilityDetails{
			Status:            view.ScoringPassed,
			Reason:            "",
			Breaking:          0,
			BreakingInternal:  0,
			BreakingExternal:  0,
			BreakingUnknown:   0,
			Internal2Unknown:  0,
			External2Internal: 0,
			External2Unknown:  0,
		}

		var changesResp *view.VersionChangesView = nil
		page := 0
		breakingForTransition := ""
		transitionMessage := ""

		for {
			changesRespIt, err :=
				p.apihubClient.GetVersionChanges(
					ctx,
					versionContent.PackageId,
					versionContent.Version,
					versionContent.PreviousVersionPackageId,
					versionContent.PreviousVersion,
					string(ot.ApiType),
					versionChangesPageLimit, page)
			if err != nil {
				return nil, fmt.Errorf("failed to get the changes for package %s version %s : %w", packageId, version, err)
			}
			if changesRespIt == nil {
				return nil, fmt.Errorf("no response for page %d of the %s changes of package %s version %s", page, ot.ApiType, packageId, version)
			}
			if changesResp == nil {
				changesResp = changesRespIt
			} else {
				changesResp.Operations = append(changesResp.Operations, changesRespIt.Operations...)
			}
			for key, value := range changesRespIt.Packages {
				changesResp.Packages[key] = value
			}
			if len(changesRespIt.Operations) < versionChangesPageLimit {
				break
			} else {
				page += 1
			}
		}

		// collect operation audience for the current version
		opMap, err := p.makeOperationMap(ctx, versionContent.PackageId, versionContent.Version, ot.ApiType)
		if err != nil {
			return nil, err
		}
		// collect operation audience for the previous version operations
		popMap, err := p.makeOperationMap(ctx, previousVersionContent.PackageId, previousVersionContent.Version, ot.ApiType)
		if err != nil {
			return nil, err
		}
		// iterate all changes
		if changesResp != nil {
			for _, cr := range changesResp.Operations {
				var opID string
				if cr.CurrentOperation != nil {
					opID = cr.CurrentOperation.OperationId
				} else {
					opID = cr.PreviousOperation.OperationId
				}

				var crApiAudience, prevAudience, apiAudience string
				var found, foundPrev bool
				if cr.CurrentOperation != nil {
					// current operation audience
					crApiAudience, found = opMap[cr.CurrentOperation.OperationId]
					if !found {
						crApiAudience = view.ApiAudienceUnknown
					}
					apiAudience = crApiAudience
				}
				if cr.PreviousOperation != nil {
					// previous operation audience
					prevAudience, foundPrev = popMap[cr.PreviousOperation.OperationId]
					if !foundPrev {
						prevAudience = view.ApiAudienceUnknown
					}
					if apiAudience == "" {
						apiAudience = prevAudience
					}
				}

				if crApiAudience != "" && prevAudience != "" {
					if prevAudience == view.ApiAudienceExternal {
						switch crApiAudience {
						case view.ApiAudienceInternal:
							bwc.External2Internal++
						case view.ApiAudienceUnknown:
							bwc.External2Unknown++
						}
					} else {
						if prevAudience == view.ApiAudienceInternal && crApiAudience == view.ApiAudienceUnknown {
							bwc.Internal2Unknown++
						}
					}
					if isTransitionForbidden(crApiAudience, prevAudience) && transitionMessage == "" {
						transitionMessage = fmt.Sprintf("found forbidden API audience transition for package %s version %s operation %s:%s=>%s", packageId, version, opID, crApiAudience, prevAudience)
					}
				}

				// skip non-breaking
				if cr.ChangeSummary.Breaking < 1 {
					continue
				}
				// count breaking
				bwc.Breaking += cr.ChangeSummary.Breaking
				switch apiAudience {
				case view.ApiAudienceInternal:
					bwc.BreakingInternal += cr.ChangeSummary.Breaking
				case view.ApiAudienceExternal:
					{
						bwc.BreakingExternal += cr.ChangeSummary.Breaking
						if breakingForTransition == "" {
							breakingForTransition = fmt.Sprintf(breakingMessage, packageId, version, opID, apiAudience)
						}
					}
				case view.ApiAudienceUnknown:
					{
						bwc.BreakingUnknown += cr.ChangeSummary.Breaking
						if breakingForTransition == "" {
							breakingForTransition = fmt.Sprintf(breakingMessage, packageId, version, opID, apiAudience)
						}
					}
				}
			}
		}

		if bwc.Breaking == 0 {
			// no breaking changes totally
			if bwc.Internal2Unknown == 0 && bwc.External2Internal == 0 && bwc.External2Unknown == 0 {
				bwc.Status = view.ScoringPassed
			} else {
				bwc.Status = view.ScoringPassedWithDefects
				bwc.Reason = fmt.Sprintf("%d operations changed audience from external to internal, %d operations changed audience from external to unknown, %d operations changed audience from internal to unknown.", bwc.External2Internal, bwc.External2Unknown, bwc.Internal2Unknown)
			}
		} else {
			// there are some breaking changes
			reasonTransitionPart := ""
			if bwc.External2Internal != 0 || bwc.External2Unknown != 0 {
				reasonTransitionPart += fmt.Sprintf("%d operations changed audience from external to internal, %d operations changed audience from external to unknown.", bwc.External2Internal, bwc.External2Unknown)
			}

			if bwc.BreakingExternal != 0 {
				bwc.Status = view.ScoringNotPassed
				bwc.Reason = fmt.Sprintf("Version contains %d breaking change(s) in external operation(s).", bwc.BreakingExternal)
				if bwc.BreakingUnknown != 0 {
					bwc.Reason += fmt.Sprintf(" Version contains %d breaking change(s) in unknown operation(s).", bwc.BreakingUnknown)
				}
			} else {
				// breaking changes are for internal and/or unknown operations
				if bwc.BreakingUnknown != 0 {
					bwc.Status = view.ScoringNotPassed
					bwc.Reason = fmt.Sprintf("Version contains %d breaking change(s) in unknown operation(s).", bwc.BreakingUnknown)
				} else {
					bwc.Status = view.ScoringPassedWithDefects
					bwc.Reason = fmt.Sprintf("Version contains breaking change(s) in internal(%d) operation(s).", bwc.BreakingInternal)
				}
			}
			if reasonTransitionPart != "" {
				bwc.Reason += " " + reasonTransitionPart
			}
		}

		result[ot.ApiType] = bwc
	}

	if versionContent.ChangelogHasErrors {
		// The comparison is incomplete, so the counts above cannot be trusted. Keep them for
		// context, but never report the section as passed.
		for apiType, bwc := range result {
			bwc.Status = view.ScoringNotPassed
			if bwc.Reason == "" {
				bwc.Reason = changelogUnreliableBwcReason
			} else {
				bwc.Reason = changelogUnreliableBwcReason + " " + bwc.Reason
			}
			result[apiType] = bwc
		}
	}

	return result, nil
}

func (p *scoringTaskProcessorImpl) makeRulesetMap(ctx context.Context, rulesetIds []string) (map[string]entity.Ruleset, error) {
	seen := make(map[string]bool)
	for _, id := range rulesetIds {
		seen[id] = true
	}
	rulesetMap := make(map[string]entity.Ruleset)
	for id := range seen {
		ruleset, err := p.rulesetRepo.GetRulesetById(ctx, id)
		if err != nil {
			return nil, fmt.Errorf("failed to get ruleset %s: %w", id, err)
		}
		if ruleset == nil {
			return nil, fmt.Errorf("ruleset %s not found", id)
		}
		rulesetMap[id] = *ruleset
	}
	return rulesetMap, nil
}

func (p *scoringTaskProcessorImpl) makeOperationMap(ctx context.Context, packageId, version string, apiType view.OpApiType) (map[string]string, error) {
	opLisReq := view.OperationListRequest{
		Page:       0,
		Limit:      100,
		Deprecated: "false",
	}
	ret := make(map[string]string)
	for {
		operations, err := p.apihubClient.GetOperationsList(ctx, packageId, version, apiType, opLisReq)
		if err != nil {
			return nil, fmt.Errorf("failed to get page %d of the %s operations of package %s version %s: %w", opLisReq.Page, apiType, packageId, version, err)
		}
		// The client turns a 404 into a nil response; only a non-nil empty page ends the list.
		if operations == nil {
			return nil, fmt.Errorf("page %d of the %s operations of package %s version %s not found", opLisReq.Page, apiType, packageId, version)
		}
		if len(operations.Operations) == 0 {
			break
		}
		for _, op := range operations.Operations {
			ret[op.OperationId] = op.ApiAudience
		}
		opLisReq.Page++
	}
	return ret, nil
}

func isTransitionForbidden(currentAudience, prevAudience string) bool {
	if flist, found := forbiddenTransitions[currentAudience]; found {
		for _, v := range flist {
			if v == prevAudience {
				return true
			}
		}
	}
	return false
}

type stringList []string

var forbiddenTransitions = map[string]stringList{
	view.ApiAudienceExternal: {view.ApiAudienceInternal, view.ApiAudienceUnknown},
	view.ApiAudienceInternal: {view.ApiAudienceUnknown},
}

func recomputeOverallStatus(score *entity.VersionScore) {
	score.Debug = []string{}
	for _, partErr := range []string{score.PublicationIntegrityError, score.BackwardCompatibilityError, score.QualityCheckError} {
		if partErr != "" {
			score.Debug = append(score.Debug, partErr)
		}
	}

	score.Status = ""
	score.Reasons = []string{}
	if score.ProcessStatus != view.ScoringProcessCompleted {
		return
	}

	score.Status = view.ScoringPassed
	// applyScoringDetails derives the status and the reason from this section.
	if score.PublicationIntegrityStatus == view.ScoringProcessError && score.PublicationIntegrityDetails == nil {
		score.PublicationIntegrityDetails = &view.PublicationIntegrityDetails{
			Status: view.ScoringNotPassed,
			Reason: versionContentInternalErrorReason,
		}
	}
	if score.BackwardCompatibilityStatus == view.ScoringProcessError {
		score.Status = view.ScoringNotPassed
		score.Reasons = append(score.Reasons, bwcInternalErrorReason)
	}
	if score.QualityCheckStatus == view.ScoringProcessError {
		score.Status = view.ScoringNotPassed
		score.Reasons = append(score.Reasons, qualityInternalErrorReason)
	}
	applyScoringDetails(score)
}

func calculatePublicationIntegrity(vc *view.VersionContent) view.PublicationIntegrityDetails {
	details := view.PublicationIntegrityDetails{
		Status: view.ScoringPassed,
	}
	if vc == nil {
		return details
	}

	details.HasErrors = vc.HasErrors
	details.ChangelogHasErrors = vc.ChangelogHasErrors
	details.ApiTypes = apiTypesFromOperationTypes(vc.OperationTypes)
	details.Contracts = contractsFromSummary(vc.ContractsSummary)

	if isUnsoundPublication(details) {
		details.Status = view.ScoringNotPassed
	}
	details.Reason = strings.Join(publicationIntegrityReasons(vc.OperationTypes, details), " ")
	return details
}

func publicationIntegrityReasons(operationTypes []view.VersionOperationType, details view.PublicationIntegrityDetails) []string {
	var reasons []string

	for _, ot := range operationTypes {
		flag := details.ApiTypes[ot.ApiType]
		if flag.HasErrors && flag.Reason != "" {
			reasons = append(reasons, flag.Reason)
		}
	}

	if details.Contracts != nil {
		if details.Contracts.DDL != nil && details.Contracts.DDL.HasErrors && details.Contracts.DDL.Reason != "" {
			reasons = append(reasons, details.Contracts.DDL.Reason)
		}
		if details.Contracts.MCP != nil && details.Contracts.MCP.HasErrors && details.Contracts.MCP.Reason != "" {
			reasons = append(reasons, details.Contracts.MCP.Reason)
		}
	}

	if details.ChangelogHasErrors {
		reasons = append(reasons, changelogHasErrorsReason)
	}
	// The version level flag can be set for a problem that belongs to no document and no API type,
	// so it is reported even when a typed flag is set too.
	if details.HasErrors {
		reasons = append(reasons, versionHasPublicationErrorsReason)
	}
	return reasons
}

func applyScoringDetails(score *entity.VersionScore) {
	if score.PublicationIntegrityDetails != nil {
		if score.PublicationIntegrityDetails.Status == view.ScoringNotPassed {
			score.Status = view.ScoringNotPassed
		}
		if score.PublicationIntegrityDetails.Reason != "" {
			score.Reasons = append(score.Reasons, score.PublicationIntegrityDetails.Reason)
		}
	}

	for _, bwc := range score.BackwardCompatibilityDetails {
		if bwc.Status == view.ScoringNotPassed {
			score.Status = view.ScoringNotPassed
		}
		if score.Status == view.ScoringPassed && bwc.Status == view.ScoringPassedWithDefects {
			score.Status = view.ScoringPassedWithDefects
		}
		if bwc.Reason != "" {
			score.Reasons = append(score.Reasons, bwc.Reason)
		}
	}

	for _, qcArr := range score.QualityCheckDetails {
		for _, qc := range qcArr {
			if qc.Status == view.ScoringNotPassed {
				score.Status = view.ScoringNotPassed
			}
			if score.Status == view.ScoringPassed && qc.Status == view.ScoringPassedWithDefects {
				score.Status = view.ScoringPassedWithDefects
			}
			if qc.Reason != "" {
				score.Reasons = append(score.Reasons, qc.Reason)
			}
		}
	}

	// Sections repeat the same sentence per API kind, so the summary keeps the first occurrence only.
	score.Reasons = dedupReasons(score.Reasons)
}

func dedupReasons(reasons []string) []string {
	if len(reasons) < 2 {
		return reasons
	}
	seen := make(map[string]bool, len(reasons))
	deduped := make([]string, 0, len(reasons))
	for _, reason := range reasons {
		if seen[reason] {
			continue
		}
		seen[reason] = true
		deduped = append(deduped, reason)
	}
	return deduped
}

func isUnsoundPublication(details view.PublicationIntegrityDetails) bool {
	if details.HasErrors || details.ChangelogHasErrors {
		return true
	}
	for _, flag := range details.ApiTypes {
		if flag.HasErrors {
			return true
		}
	}
	if details.Contracts == nil {
		return false
	}
	if details.Contracts.DDL != nil && details.Contracts.DDL.HasErrors {
		return true
	}
	if details.Contracts.MCP != nil && details.Contracts.MCP.HasErrors {
		return true
	}
	return false
}

func apiTypesFromOperationTypes(operationTypes []view.VersionOperationType) map[view.OpApiType]view.PublicationErrorFlag {
	if len(operationTypes) == 0 {
		return nil
	}
	apiTypes := make(map[view.OpApiType]view.PublicationErrorFlag, len(operationTypes))
	for _, ot := range operationTypes {
		flag := view.PublicationErrorFlag{HasErrors: ot.HasErrors}
		if ot.HasErrors {
			flag.Reason = fmt.Sprintf("%s documents have publication errors.", ot.ApiType.DisplayName())
		}
		apiTypes[ot.ApiType] = flag
	}
	return apiTypes
}

func contractsFromSummary(summary *view.ContractsSummaryView) *view.PublicationContractsDetails {
	if summary == nil {
		return nil
	}
	contracts := &view.PublicationContractsDetails{}
	hasAny := false
	if summary.DDL != nil {
		hasAny = true
		flag := view.PublicationErrorFlag{HasErrors: summary.DDL.HasErrors}
		if summary.DDL.HasErrors {
			flag.Reason = fmt.Sprintf("%s contracts have publication errors.", contractDisplayDDL)
		}
		contracts.DDL = &flag
	}
	if len(summary.MCP) > 0 {
		hasAny = true
		mcpHasErrors := false
		for _, endpoint := range summary.MCP {
			if endpoint.HasErrors {
				mcpHasErrors = true
				break
			}
		}
		flag := view.PublicationErrorFlag{HasErrors: mcpHasErrors}
		if mcpHasErrors {
			flag.Reason = fmt.Sprintf("%s contracts have publication errors.", contractDisplayMCP)
		}
		contracts.MCP = &flag
	}
	if !hasAny {
		return nil
	}
	return contracts
}
