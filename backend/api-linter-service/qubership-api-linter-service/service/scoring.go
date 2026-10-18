package service

import (
	"context"
	"fmt"

	"github.com/Netcracker/qubership-api-linter-service/client"
	"github.com/Netcracker/qubership-api-linter-service/entity"
	"github.com/Netcracker/qubership-api-linter-service/repository"
	"github.com/Netcracker/qubership-api-linter-service/utils"
	"github.com/Netcracker/qubership-api-linter-service/view"
)

type ScoringService interface {
	GetScoringForVersion(ctx context.Context, packageId, version string) (*view.VersionScore, error)
	CalculateScore(ctx context.Context, packageId, version string, revision int) (view.VersionScore, error)
}

type scoringServiceImpl struct {
	versionResultRepo   repository.VersionResultRepository
	lintResultRepo      repository.LintResultRepository
	rulesetRepo         repository.RulesetRepository
	scoringRepository   repository.ScoringRepository
	linterConfigService LinterConfigService
	apihubClient        client.ApihubClient
}

func NewScoringService(
	versionResultRepo repository.VersionResultRepository,
	lintResultRepo repository.LintResultRepository,
	rulesetRepo repository.RulesetRepository,
	scoringRepository repository.ScoringRepository,
	linterConfigService LinterConfigService,
	apihubClient client.ApihubClient,
) ScoringService {
	return &scoringServiceImpl{
		versionResultRepo:   versionResultRepo,
		lintResultRepo:      lintResultRepo,
		rulesetRepo:         rulesetRepo,
		scoringRepository:   scoringRepository,
		linterConfigService: linterConfigService,
		apihubClient:        apihubClient,
	}
}

func (s *scoringServiceImpl) GetScoringForVersion(ctx context.Context, packageId, version string) (*view.VersionScore, error) {
	ver, rev, err := s.getVersionAndRevision(ctx, packageId, version)
	if err != nil {
		return nil, err
	}

	ent, err := s.scoringRepository.GetScoringForVersion(ctx, packageId, ver, rev)
	if err != nil {
		return nil, err
	}
	if ent == nil {
		return nil, nil
	}

	return &view.VersionScore{
		Status:                       ent.Status,
		Reasons:                      ent.Reasons,
		Debug:                        ent.Debug,
		BackwardCompatibilityDetails: ent.BackwardCompatibilityDetails,
		QualityCheckDetails:          ent.QualityCheckDetails,
	}, nil
}

func (s *scoringServiceImpl) calculateQualityCheck(ctx context.Context, packageId, version string, revision int) (map[view.OpApiType][]view.QualityCheckDetails, error) {
	lintedVer, lintedDocs, err := s.versionResultRepo.GetVersionAndDocsSummary(ctx, packageId, version, revision)
	if err != nil {
		return nil, fmt.Errorf("failed to get version and docs lint result: %w", err)
	}
	if lintedVer == nil || lintedDocs == nil {
		return nil, fmt.Errorf("version %s@%d lint result not found for package %s", version, revision, packageId)
	}

	idToRulesetMap, err := s.makeRulesetMap(ctx, makeRulesetIdsFromLintedDocs(lintedDocs))
	if err != nil {
		return nil, fmt.Errorf("failed to make ruleset map: %w", err)
	}

	result := map[view.OpApiType][]view.QualityCheckDetails{}

	for _, doc := range lintedDocs {
		opApiType := view.ApiTypeToOpApiType(doc.SpecificationType)
		if opApiType == "" {
			return nil, fmt.Errorf("unsupported API type: %s", doc.SpecificationType)
		}

		vd := s.buildValidationDetails(ctx, doc, idToRulesetMap)
		if vd != nil {
			result[opApiType] = append(result[opApiType], *vd)

		}
	}
	return result, nil
}

func (s *scoringServiceImpl) CalculateScore(ctx context.Context, packageId, version string, revision int) (view.VersionScore, error) {
	score := view.VersionScore{
		Status:                       view.ScoringPassed,
		BackwardCompatibilityDetails: nil,
		QualityCheckDetails:          nil,
	}
	var err error

	versionStr := fmt.Sprintf("%s@%d", version, revision)

	score.BackwardCompatibilityDetails, err = s.calculateBackwardsCompatibility(ctx, packageId, versionStr)
	if err != nil {
		score.Status = view.ScoringNotPassed
		score.Reasons = append(score.Reasons, "Internal error: failed to calculate backwards compatibility details.")
		score.Debug = append(score.Debug, err.Error())
	}

	score.QualityCheckDetails, err = s.calculateQualityCheck(ctx, packageId, version, revision)
	if err != nil {
		score.Status = view.ScoringNotPassed
		score.Reasons = append(score.Reasons, "Internal error: failed to calculate backwards compatibility details.")
		score.Debug = append(score.Debug, err.Error())
	}

	if score.Status != view.ScoringNotPassed {
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
	}
	return score, nil
}

func (s *scoringServiceImpl) buildValidationDetails(ctx context.Context, doc entity.LintedDocument, rulesetMap map[string]entity.Ruleset) *view.QualityCheckDetails {
	ruleset, ok := rulesetMap[doc.RulesetId]
	if !ok {
		return nil
	}

	// Optional linters are non-blocking: their internal/execution failures are recorded in
	// InternalError for visibility but must not push the score to not_passed. Issues found by an
	// optional linter that ran successfully still count (see the errors/warnings branch below).
	optional := s.linterConfigService.IsLinterOptional(ruleset.Linter)

	vd := &view.QualityCheckDetails{
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
		return vd
	}

	summary, err := s.lintResultRepo.GetLintResultSummary(ctx, doc.DataHash, doc.RulesetId)
	if err != nil {
		vd.InternalError = fmt.Sprintf("failed to get lint result: %s", err)
		if !optional {
			vd.Status = view.ScoringNotPassed
			vd.Reason = fmt.Sprintf("Validation internal error")
		}
		return vd
	}
	if summary == nil {
		return vd
	}

	issues, err := makeSpectralSummary(summary.Summary)
	if err != nil {
		vd.InternalError = fmt.Sprintf("failed to parse lint summary: %s", err)
		if !optional {
			vd.Status = view.ScoringNotPassed
			vd.Reason = fmt.Sprintf("Validation internal error")
		}
		return vd
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

	return vd
}

const breakingMessage = "found breaking change for package %s version %s operation %s:%s"

func (s *scoringServiceImpl) calculateBackwardsCompatibility(ctx context.Context, packageId, version string) (map[view.OpApiType]view.BackwardCompatibilityDetails, error) {
	result := map[view.OpApiType]view.BackwardCompatibilityDetails{}

	versionContent, err := s.apihubClient.GetVersion(ctx, packageId, version, true, true)
	if err != nil {
		return nil, fmt.Errorf("failed to get version %s for package %s : %s", version, packageId, err)
	}
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
	previousVersionContent, err := s.apihubClient.GetVersion(ctx, versionContent.PreviousVersionPackageId, versionContent.PreviousVersion, false, false)
	if err != nil {
		return nil, fmt.Errorf("failed to get previous version %s for package %s", versionContent.PreviousVersion, versionContent.PreviousVersionPackageId)
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
		limit := 100
		breakingForTransition := ""
		transitionMessage := ""

		for {
			changesRespIt, err :=
				s.apihubClient.GetVersionChanges(
					ctx,
					versionContent.PackageId,
					versionContent.Version,
					versionContent.PreviousVersionPackageId,
					versionContent.PreviousVersion,
					string(ot.ApiType),
					limit, page)
			if err != nil {
				return nil, fmt.Errorf("failed to get the changes for package %s version %s : %w", packageId, version, err)
			}
			if changesRespIt == nil {
				break
			}
			if changesResp == nil {
				changesResp = changesRespIt
			} else {
				changesResp.Operations = append(changesResp.Operations, changesRespIt.Operations...)
			}
			for key, value := range changesRespIt.Packages {
				changesResp.Packages[key] = value
			}
			if len(changesRespIt.Operations) < limit {
				break
			} else {
				page += 1
			}
		}

		// collect operation audience for the current version
		opMap, opMapErr := s.makeOperationMap(ctx, versionContent.PackageId, versionContent.Version, ot.ApiType)
		if opMapErr != nil {
			opMap = make(map[string]string)
		}
		// collect operation audience for the previous version operations
		popMap := make(map[string]string)
		popMap, opMapErr = s.makeOperationMap(ctx, previousVersionContent.PackageId, previousVersionContent.Version, ot.ApiType)
		if opMapErr != nil {
			popMap = make(map[string]string)
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

	return result, nil
}

func (s *scoringServiceImpl) makeRulesetMap(ctx context.Context, rulesetIds []string) (map[string]entity.Ruleset, error) {
	seen := make(map[string]bool)
	for _, id := range rulesetIds {
		seen[id] = true
	}
	rulesetMap := make(map[string]entity.Ruleset)
	for id := range seen {
		ruleset, err := s.rulesetRepo.GetRulesetById(ctx, id)
		if err != nil {
			return nil, fmt.Errorf("failed to get ruleset %s: %w", id, err)
		}
		if ruleset != nil {
			rulesetMap[id] = *ruleset
		}
	}
	return rulesetMap, nil
}

func (s *scoringServiceImpl) getVersionAndRevision(ctx context.Context, packageId string, version string) (string, int, error) {
	ver, rev, err := utils.SplitVersionRevision(version)
	if err != nil {
		return "", 0, err
	}

	if rev == 0 {
		versionView, err := s.apihubClient.GetVersion(ctx, packageId, version, false, false)
		if err != nil {
			return "", 0, err
		}
		if versionView == nil {
			return "", 0, fmt.Errorf("version %s not found for package %s", version, packageId)
		}
		ver, rev, err = utils.SplitVersionRevision(versionView.Version)
		if err != nil {
			return "", 0, err
		}
		if rev == 0 {
			return "", 0, fmt.Errorf("unable to identify latest revision for version %s", version)
		}
	}
	return ver, rev, nil
}

// makeOperationMap
// receives operation list from backend and make filter map for external operations
func (s *scoringServiceImpl) makeOperationMap(ctx context.Context, packageId, version string, apiType view.OpApiType) (map[string]string, error) {
	opLisReq := view.OperationListRequest{
		Page:       0,
		Limit:      100,
		Deprecated: "false",
	}
	ret := make(map[string]string)
	for {
		operations, errOpList := s.apihubClient.GetOperationsList(ctx, packageId, version, apiType, opLisReq)
		if errOpList != nil {
			break
		}
		if operations == nil || len(operations.Operations) == 0 {
			break
		}
		for _, op := range operations.Operations {
			ret[op.OperationId] = op.ApiAudience
		}
		opLisReq.Page++
	}
	return ret, nil
}

// isTransitionForbidden
// validates whether api audience transition forbidden or not
// returns true if transition is forbidden
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

// forbiddenTransitions forbidden transition map
var forbiddenTransitions = map[string]stringList{
	view.ApiAudienceExternal: {view.ApiAudienceInternal, view.ApiAudienceUnknown},
	view.ApiAudienceInternal: {view.ApiAudienceUnknown},
}
