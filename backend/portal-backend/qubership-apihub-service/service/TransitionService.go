package service

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/secctx"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"
)

type TransitionService interface {
	MoveOrRenamePackage(ctx context.Context, fromId string, toId string, overwriteHistory bool) (string, error)
	GetMoveStatus(ctx context.Context, id string) (*view.TransitionStatus, error)
	ListCompletedActivities(ctx context.Context, offset int, limit int) ([]view.TransitionStatus, error)
	ListPackageTransitions(ctx context.Context) ([]view.PackageTransition, error)
}

func NewTransitionService(transRepo repository.TransitionRepository, pubRepo repository.PublishedRepository, systemInfoService SystemInfoService) TransitionService {
	return &transitionServiceImpl{transRepo: transRepo, pubRepo: pubRepo, systemInfoService: systemInfoService}
}

type transitionServiceImpl struct {
	transRepo         repository.TransitionRepository
	pubRepo           repository.PublishedRepository
	systemInfoService SystemInfoService
}

// runTransitionMove runs a transition move under a safety-net bound, then persists the terminal
// status on an independent short-lived context so a timed-out move can't leave the transition
// stuck at 'running'
func (p transitionServiceImpl) runTransitionMove(ctx context.Context, id string, move func(ctx context.Context) (int, error)) {
	bgCtx, cancel := context.WithTimeout(secctx.Detach(ctx), p.systemInfoService.GetTransitionMoveTimeout())
	defer cancel()
	objAffected, err := move(bgCtx)
	err = utils.WrapContextError(bgCtx, err)

	finCtx, finCancel := context.WithTimeout(secctx.Detach(ctx), statusFinalizationTimeout)
	defer finCancel()
	if err != nil {
		if terr := p.transRepo.TrackTransitionFailed(finCtx, id, err.Error()); terr != nil {
			log.Errorf("failed to track transition action: %s", terr)
		}
		return
	}
	if terr := p.transRepo.TrackTransitionCompleted(finCtx, id, objAffected); terr != nil {
		log.Errorf("failed to track transition action: %s", terr)
	}
}

func (p transitionServiceImpl) MoveOrRenamePackage(ctx context.Context, fromId string, toId string, overwriteHistory bool) (string, error) {
	if fromId == toId {
		return "", fmt.Errorf("incorrect input: from==to")
	}

	fromPackage, err := p.pubRepo.GetPackage(ctx, fromId)
	if err != nil {
		return "", err
	}
	if fromPackage == nil {
		return "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.FromPackageNotFound,
			Message: exception.FromPackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": fromId},
		}
	}
	// mind existing, but deleted packages
	toPackage, err := p.pubRepo.GetPackageIncludingDeleted(ctx, toId)
	if err != nil {
		return "", err
	}
	if toPackage != nil {
		deletedAtStr := ""
		if toPackage.DeletedAt != nil {
			deletedAtStr = fmt.Sprintf("(deleted at %s)", toPackage.DeletedAt)
		}
		return "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ToPackageExists,
			Message: exception.ToPackageExistsMsg,
			Params:  map[string]interface{}{"packageId": toId, "deletedAt": deletedAtStr},
		}
	}

	if !overwriteHistory {
		redirectPackageId, err := p.transRepo.GetNewPackageId(ctx, toId)
		if err != nil {
			return "", err
		}
		if redirectPackageId != "" {
			oldIds, err := p.transRepo.GetOldPackageIds(ctx, fromId)
			if err != nil {
				return "", err
			}
			isRenameBack := false
			for _, oldId := range oldIds {
				if oldId == toId { // rename package back, it's allowed case
					isRenameBack = true
					break
				}
			}
			if !isRenameBack {
				// new package id is going to overlap existing one which is not allowed
				return "", &exception.CustomError{
					Status:  http.StatusNotFound,
					Code:    exception.ToPackageRedirectExists,
					Message: exception.ToPackageRedirectExistsMsg,
					Params:  map[string]interface{}{"packageId": toId, "newPackageId": redirectPackageId},
				}
			}
		}
	}

	fromParts := strings.Split(fromId, ".")

	toParts := strings.Split(toId, ".")
	toWorkspace := len(toParts) == 1

	isMove := false
	isRename := false

	if len(fromParts) != len(toParts) {
		isMove = true
		isRename = fromParts[len(fromParts)-1] != toParts[len(toParts)-1]
	} else {
		for i, fromPart := range fromParts {
			toPart := toParts[i]
			if i == len(fromParts)-1 {
				// last id segment, i.e. alias
				if fromPart != toPart {
					isRename = true
				}
			} else {
				// intermediate id segment, i.e. one of parent ids
				if fromPart != toPart {
					isMove = true
				}
			}
		}
	}

	if isMove && !toWorkspace {
		toParentId := strings.Join(toParts[:len(toParts)-1], ".")
		toParentPackage, err := p.pubRepo.GetPackage(ctx, toParentId)
		if err != nil {
			return "", err
		}
		if toParentPackage == nil {
			return "", &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.ToParentPackageNotFound,
				Message: exception.ToParentPackageNotFoundMsg,
				Params:  map[string]interface{}{"packageId": toParentId},
			}
		}
	}

	/*
		allowed moves(package id will be changed in all cases):
			workspace -> workspace (rename, i.e. change alias)
			workspace -> group (convert workspace to group, i.e. add parent)

			group -> group (change alias => rename, change parent => move)
			group -> workspace (convert group to workspace, i.e. remove parent)

			package -> package (change alias => rename, change parent => move)

			dashboard -> dashboard (change alias => rename, change parent => move)
	*/

	id := uuid.New().String()
	trType := ""

	switch fromPackage.Kind {
	case entity.KIND_WORKSPACE:
		if toWorkspace {
			trType = "rename_workspace"
		} else {
			trType = "convert_workspace_to_group"
		}
		err = p.transRepo.TrackTransitionStarted(ctx, id, trType, fromId, toId)
		if err != nil {
			return "", fmt.Errorf("failed to track transition action: %s", err)
		}
		// TODO: implement async job that will take non-finished transition tasks from DB instead of a direct call
		utils.SafeAsync(func() {
			p.runTransitionMove(ctx, id, func(ctx context.Context) (int, error) {
				return p.transRepo.MoveGroupingPackage(ctx, fromId, toId)
			})
		})
		return id, nil
	case entity.KIND_PACKAGE:
		if toWorkspace {
			return "", fmt.Errorf("convertation of package %s to workspace %s is not supported", fromId, toId)
		} else {
			if isMove && isRename {
				trType = "move_and_rename_package"
			} else if isMove {
				trType = "move_package"
			} else if isRename {
				trType = "rename_package"
			}
			err = p.transRepo.TrackTransitionStarted(ctx, id, trType, fromId, toId)
			if err != nil {
				return "", fmt.Errorf("failed to track transition action: %s", err)
			}
			// TODO: implement async job that will take non-finished transition tasks from DB instead of a direct call
			utils.SafeAsync(func() {
				p.runTransitionMove(ctx, id, func(ctx context.Context) (int, error) {
					return p.transRepo.MovePackage(ctx, fromId, toId, overwriteHistory)
				})
			})
			return id, nil
		}
	case entity.KIND_GROUP:
		if toWorkspace {
			trType = "convert_group_to_workspace"
		} else {
			if isMove && isRename {
				trType = "move_and_rename_group"
			} else if isMove {
				trType = "move_group"
			} else if isRename {
				trType = "rename_group"
			}
		}
		err = p.transRepo.TrackTransitionStarted(ctx, id, trType, fromId, toId)
		if err != nil {
			return "", fmt.Errorf("failed to track transition action: %s", err)
		}
		// TODO: implement async job that will take non-finished transition tasks from DB instead of a direct call
		utils.SafeAsync(func() {
			p.runTransitionMove(ctx, id, func(ctx context.Context) (int, error) {
				return p.transRepo.MoveGroupingPackage(ctx, fromId, toId)
			})
		})
		return id, nil
	case entity.KIND_DASHBOARD:
		if toWorkspace {
			return "", fmt.Errorf("convertation of dashboard %s to workspace %s is not supported", fromId, toId)
		} else {
			if isMove && isRename {
				trType = "move_and_rename_dashboard"
			} else if isMove {
				trType = "move_dashboard"
			} else if isRename {
				trType = "rename_dashboard"
			}
			err = p.transRepo.TrackTransitionStarted(ctx, id, trType, fromId, toId)
			if err != nil {
				return "", fmt.Errorf("failed to track transition action: %s", err)
			}
			// TODO: implement async job that will take non-finished transition tasks from DB instead of a direct call
			utils.SafeAsync(func() {
				p.runTransitionMove(ctx, id, func(ctx context.Context) (int, error) {
					return p.transRepo.MovePackage(ctx, fromId, toId, overwriteHistory)
				})
			})
			return id, nil
		}
	default:
		return "", fmt.Errorf("unsupported 'from' package kind=%s", fromPackage.Kind)
	}
}

func (p transitionServiceImpl) GetMoveStatus(ctx context.Context, id string) (*view.TransitionStatus, error) {
	ent, err := p.transRepo.GetTransitionStatus(ctx, id)
	if err != nil {
		return nil, err
	}
	if ent == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.TransitionActivityNotFound,
			Message: exception.TransitionActivityNotFoundMsg,
			Params:  map[string]interface{}{"id": id},
		}
	}
	return entity.MakeTransitionStatusView(ent), nil
}

func (p transitionServiceImpl) ListCompletedActivities(ctx context.Context, completedSerialOffset int, limit int) ([]view.TransitionStatus, error) {
	entities, err := p.transRepo.ListCompletedTransitions(ctx, completedSerialOffset, limit)
	if err != nil {
		return nil, err
	}
	result := make([]view.TransitionStatus, len(entities))
	for i := range entities {
		result[i] = *entity.MakeTransitionStatusView(&entities[i])
	}
	return result, nil
}

func (p transitionServiceImpl) ListPackageTransitions(ctx context.Context) ([]view.PackageTransition, error) {
	entities, err := p.transRepo.ListPackageTransitions(ctx)
	if err != nil {
		return nil, err
	}
	result := make([]view.PackageTransition, len(entities))
	for i := range entities {
		result[i] = *entity.MakePackageTransitionView(&entities[i])
	}
	return result, nil
}
