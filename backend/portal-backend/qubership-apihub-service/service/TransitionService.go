// Copyright 2024-2025 NetCracker Technology Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package service

import (
	"fmt"
	"net/http"
	"strings"

	context2 "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"
)

type TransitionService interface {
	MoveOrRenamePackage(userCtx context2.SecurityContext, fromId string, toId string, overwriteHistory bool) (string, error)
	GetMoveStatus(id string) (*view.TransitionStatus, error)
	ListCompletedActivities(offset int, limit int) ([]view.TransitionStatus, error)
	ListPackageTransitions() ([]view.PackageTransition, error)
}

func NewTransitionService(transRepo repository.TransitionRepository, pubRepo repository.PublishedRepository) TransitionService {
	return &transitionServiceImpl{transRepo: transRepo, pubRepo: pubRepo}
}

type transitionServiceImpl struct {
	transRepo repository.TransitionRepository
	pubRepo   repository.PublishedRepository
}

func (p transitionServiceImpl) MoveOrRenamePackage(userCtx context2.SecurityContext, fromId string, toId string, overwriteHistory bool) (string, error) {
	if fromId == toId {
		return "", fmt.Errorf("incorrect input: from==to")
	}

	fromPackage, err := p.pubRepo.GetPackage(fromId)
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

	toPackage, err := p.pubRepo.GetPackage(toId)
	if err != nil {
		return "", err
	}
	if toPackage != nil {
		return "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ToPackageExists,
			Message: exception.ToPackageExistsMsg,
			Params:  map[string]interface{}{"packageId": fromId},
		}
	}

	if !overwriteHistory {
		redirectPackageId, err := p.transRepo.GetNewPackageId(toId)
		if err != nil {
			return "", err
		}
		if redirectPackageId != "" {
			oldIds, err := p.transRepo.GetOldPackageIds(fromId)
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
		toParentPackage, err := p.pubRepo.GetPackage(toParentId)
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
		err = p.transRepo.TrackTransitionStarted(userCtx, id, trType, fromId, toId)
		if err != nil {
			return "", fmt.Errorf("failed to track transition action: %s", err)
		}
		// TODO: implement async job that will take non-finished transition tasks from DB instead of a direct call
		utils.SafeAsync(func() {
			objAffected, err := p.transRepo.MoveGroupingPackage(fromId, toId)
			if err != nil {
				err = p.transRepo.TrackTransitionFailed(id, err.Error())
				if err != nil {
					log.Errorf("failed to track transition action: %s", err)
				}
			} else {
				err = p.transRepo.TrackTransitionCompleted(id, objAffected)
				if err != nil {
					log.Errorf("failed to track transition action: %s", err)
				}
			}
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
			err = p.transRepo.TrackTransitionStarted(userCtx, id, trType, fromId, toId)
			if err != nil {
				return "", fmt.Errorf("failed to track transition action: %s", err)
			}
			// TODO: implement async job that will take non-finished transition tasks from DB instead of a direct call
			utils.SafeAsync(func() {
				objAffected, err := p.transRepo.MovePackage(fromId, toId, overwriteHistory)
				if err != nil {
					err = p.transRepo.TrackTransitionFailed(id, err.Error())
					if err != nil {
						log.Errorf("failed to track transition action: %s", err)
					}
				} else {
					err = p.transRepo.TrackTransitionCompleted(id, objAffected)
					if err != nil {
						log.Errorf("failed to track transition action: %s", err)
					}
				}
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
		err = p.transRepo.TrackTransitionStarted(userCtx, id, trType, fromId, toId)
		if err != nil {
			return "", fmt.Errorf("failed to track transition action: %s", err)
		}
		// TODO: implement async job that will take non-finished transition tasks from DB instead of a direct call
		utils.SafeAsync(func() {
			objAffected, err := p.transRepo.MoveGroupingPackage(fromId, toId)
			if err != nil {
				err = p.transRepo.TrackTransitionFailed(id, err.Error())
				if err != nil {
					log.Errorf("failed to track transition action: %s", err)
				}
			} else {
				err = p.transRepo.TrackTransitionCompleted(id, objAffected)
				if err != nil {
					log.Errorf("failed to track transition action: %s", err)
				}
			}
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
			err = p.transRepo.TrackTransitionStarted(userCtx, id, trType, fromId, toId)
			if err != nil {
				return "", fmt.Errorf("failed to track transition action: %s", err)
			}
			// TODO: implement async job that will take non-finished transition tasks from DB instead of a direct call
			utils.SafeAsync(func() {
				objAffected, err := p.transRepo.MovePackage(fromId, toId, overwriteHistory)
				if err != nil {
					err = p.transRepo.TrackTransitionFailed(id, err.Error())
					if err != nil {
						log.Errorf("failed to track transition action: %s", err)
					}
				} else {
					err = p.transRepo.TrackTransitionCompleted(id, objAffected)
					if err != nil {
						log.Errorf("failed to track transition action: %s", err)
					}
				}
			})
			return id, nil
		}
	default:
		return "", fmt.Errorf("unsupported 'from' package kind=%s", fromPackage.Kind)
	}
}

func (p transitionServiceImpl) GetMoveStatus(id string) (*view.TransitionStatus, error) {
	ent, err := p.transRepo.GetTransitionStatus(id)
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

func (p transitionServiceImpl) ListCompletedActivities(completedSerialOffset int, limit int) ([]view.TransitionStatus, error) {
	entities, err := p.transRepo.ListCompletedTransitions(completedSerialOffset, limit)
	if err != nil {
		return nil, err
	}
	result := make([]view.TransitionStatus, len(entities))
	for i := range entities {
		result[i] = *entity.MakeTransitionStatusView(&entities[i])
	}
	return result, nil
}

func (p transitionServiceImpl) ListPackageTransitions() ([]view.PackageTransition, error) {
	entities, err := p.transRepo.ListPackageTransitions()
	if err != nil {
		return nil, err
	}
	result := make([]view.PackageTransition, len(entities))
	for i := range entities {
		result[i] = *entity.MakePackageTransitionView(&entities[i])
	}
	return result, nil
}
