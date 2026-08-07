package service

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/secctx"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	log "github.com/sirupsen/logrus"
)

const activityTrackingTimeout = 30 * time.Second

type ActivityTrackingService interface {
	TrackEvent(ctx context.Context, event view.ActivityTrackingEvent) // return no error due to async processing

	GetActivityHistory(ctx context.Context, req view.ActivityHistoryReq) (*view.PkgActivityResponse, error)
	GetEventsForPackage(ctx context.Context, packageId string, includeRefs bool, limit int, page int, textFilter string, types []string) (*view.PkgActivityResponse, error)
}

func NewActivityTrackingService(repo repository.ActivityTrackingRepository, publishedRepo repository.PublishedRepository, userService UserService) ActivityTrackingService {
	return &activityTrackingServiceImpl{repo: repo, publishedRepo: publishedRepo, userService: userService}
}

type activityTrackingServiceImpl struct {
	repo          repository.ActivityTrackingRepository
	publishedRepo repository.PublishedRepository
	userService   UserService
}

func (a activityTrackingServiceImpl) TrackEvent(ctx context.Context, event view.ActivityTrackingEvent) {
	// Detach from the request but keep a safety-net bound; a single telemetry insert should be quick.
	bgCtx, cancel := context.WithTimeout(secctx.Detach(ctx), activityTrackingTimeout)
	utils.SafeAsync(func() {
		defer cancel()
		a.trackEventInternal(bgCtx, event)
	})
}

func (a activityTrackingServiceImpl) GetActivityHistory(ctx context.Context, req view.ActivityHistoryReq) (*view.PkgActivityResponse, error) {
	var ids []string

	if req.OnlyFavorite || req.OnlyShared || len(req.Kind) > 0 {
		packagesFilter := view.PackageListReq{
			OnlyFavorite: req.OnlyFavorite,
			OnlyShared:   req.OnlyShared,
			Kind:         req.Kind,
		}
		packages, err := a.publishedRepo.GetFilteredPackagesWithOffset(ctx, packagesFilter, secctx.GetUserId(ctx))
		if err != nil {
			return nil, fmt.Errorf("failed to get packages by filer : %v.Error - %w", packagesFilter, err)
		}
		if packages == nil || len(packages) == 0 {
			return &view.PkgActivityResponse{Events: make([]view.PkgActivityResponseItem, 0)}, err
		}

		for _, pkg := range packages {
			ids = append(ids, pkg.Id)
		}
	}

	// TODO: security check! need to check view rights

	atTypes := view.ConvertEventTypes(req.Types)

	ents, err := a.repo.GetEventsForPackages(ctx, ids, req.Limit, req.Page, req.TextFilter, atTypes)
	if err != nil {
		return nil, fmt.Errorf("failed to get events for packages: %w", err)
	}
	if ents == nil || len(ents) == 0 {
		return &view.PkgActivityResponse{Events: make([]view.PkgActivityResponseItem, 0)}, err
	}

	return a.makePkgActivityResponse(ents)
}

func (a activityTrackingServiceImpl) GetEventsForPackage(ctx context.Context, packageId string, includeRefs bool, limit int, page int, textFilter string, typeGroups []string) (*view.PkgActivityResponse, error) {
	pkgEnt, err := a.publishedRepo.GetPackage(ctx, packageId)
	if err != nil {
		return nil, fmt.Errorf("failed to get package %s for events: %w", packageId, err)
	}
	if pkgEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId},
		}
	}

	var ids []string
	if includeRefs {
		childIds, err := a.publishedRepo.GetAllChildPackageIdsIncludingParent(ctx, packageId)
		if err != nil {
			return nil, err
		}
		ids = append(ids, childIds...)
	} else {
		ids = append(ids, packageId)
	}

	atTypes := view.ConvertEventTypes(typeGroups)

	ents, err := a.repo.GetEventsForPackages(ctx, ids, limit, page, textFilter, atTypes)
	if err != nil {
		return nil, err
	}

	return a.makePkgActivityResponse(ents)
}

func (a activityTrackingServiceImpl) makePkgActivityResponse(ents []entity.EnrichedActivityTrackingEntity) (*view.PkgActivityResponse, error) {
	result := view.PkgActivityResponse{}
	result.Events = make([]view.PkgActivityResponseItem, len(ents))
	for i, ent := range ents {
		if ent.Type == string(view.ATETPublishNewRevision) ||
			ent.Type == string(view.ATETPublishNewVersion) ||
			ent.Type == string(view.ATETPatchVersionMeta) ||
			ent.Type == string(view.ATETDeleteVersion) ||
			ent.Type == string(view.ATETDeleteRevision) ||
			ent.Type == string(view.ATETCreateManualGroup) ||
			ent.Type == string(view.ATETDeleteManualGroup) ||
			ent.Type == string(view.ATETOperationsGroupParameters) ||
			ent.Type == string(view.ATETUpdateDocumentShareability) {
			if ent.Data != nil && getVersion(ent.Data) != "" {
				if ent.NotLatestRevision {
					ent.Data["notLatestRevision"] = true
				}
				ent.Data["version"] = view.MakeVersionRefKey(getVersion(ent.Data), getRevision(ent.Data))
				delete(ent.Data, "revision")
			}
		}
		if ent.Type == string(view.ATETPatchVersionMeta) {
			versionMeta := ent.Data["versionMeta"].([]interface{})
			for j, field := range versionMeta {
				fieldStr := field.(string)
				if fieldStr == "versionLabels" {
					newLabelsI, newLabelsPresent := ent.Data["newVersionLabels"]
					oldLabelsI, oldLabelsPresent := ent.Data["oldVersionLabels"]
					if newLabelsPresent && oldLabelsPresent {
						newLabels := newLabelsI.([]interface{})
						oldLabels := oldLabelsI.([]interface{})
						newLabelsStr := make([]string, len(newLabels))
						oldLabelsStr := make([]string, len(oldLabels))
						for k, v := range newLabels {
							newLabelsStr[k] = v.(string)
						}
						for k, v := range oldLabels {
							oldLabelsStr[k] = v.(string)
						}
						field = fmt.Sprintf("%s from [%s] to [%s]", field, strings.Join(oldLabelsStr, ", "), strings.Join(newLabelsStr, ", "))
						versionMeta[j] = field
					}
				}
				if fieldStr == "status" {
					oldStatus, oldStatusPresent := ent.Data["oldStatus"]
					newStatus, newStatusPresent := ent.Data["newStatus"]
					if oldStatusPresent && newStatusPresent {
						field = fmt.Sprintf("%s from '%s' to '%s'", field, oldStatus, newStatus)
						versionMeta[j] = field
					}
				}
			}
			ent.Data["versionMeta"] = versionMeta
		}
		result.Events[i] = entity.MakeActivityTrackingEventView(ent)
	}
	return &result, nil
}

func (a activityTrackingServiceImpl) trackEventInternal(ctx context.Context, event view.ActivityTrackingEvent) {
	ent := entity.MakeActivityTrackingEventEntity(event)
	err := utils.WrapContextError(ctx, a.repo.CreateEvent(ctx, &ent))
	if err != nil {
		log.Errorf("Failed to save tracked event %+v to DB with err: %s", ent, err)
	}
}

func getVersion(m map[string]interface{}) string {
	if versionName, ok := m["version"].(string); ok {
		return versionName
	}
	return ""
}

func getRevision(m map[string]interface{}) int {
	if revision, ok := m["revision"].(float64); ok {
		return int(revision)
	}
	if revision, ok := m["revision"].(int); ok {
		return revision
	}
	return 0
}
