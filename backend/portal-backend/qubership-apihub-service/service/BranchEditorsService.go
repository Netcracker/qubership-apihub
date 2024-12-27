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
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/cache"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/websocket"
	"github.com/buraksezer/olric"
	log "github.com/sirupsen/logrus"
)

type BranchEditorsService interface {
	AddBranchEditor(projectId string, branchName string, userId string) error
	GetBranchEditors(projectId string, branchName string) ([]view.User, error)
	RemoveBranchEditor(projectId string, branchName string, userId string) error
	RemoveBranchEditors(projectId string, branchName string) error
}

func NewBranchEditorsService(userService UserService,
	wsBranchService WsBranchService,
	branchRepository repository.BranchRepository, op cache.OlricProvider) BranchEditorsService {

	bs := &branchEditorsServiceImpl{
		userService:      userService,
		wsBranchService:  wsBranchService,
		branchRepository: branchRepository,
		op:               op,
		isReadyWg:        sync.WaitGroup{},
	}

	bs.isReadyWg.Add(1)
	utils.SafeAsync(func() {
		bs.initWhenOlricReady()
	})

	return bs
}

const keySeparator = "|@@|"

type branchEditorsServiceImpl struct {
	userService      UserService
	wsBranchService  WsBranchService
	branchRepository repository.BranchRepository

	op        cache.OlricProvider
	isReadyWg sync.WaitGroup
	olricC    *olric.Olric

	editors *olric.DMap
}

func (b *branchEditorsServiceImpl) initWhenOlricReady() {
	var err error
	hasErrors := false

	b.olricC = b.op.Get()
	b.editors, err = b.olricC.NewDMap("Editors")
	if err != nil {
		log.Errorf("Failed to creare dmap Editors: %s", err.Error())
		hasErrors = true
	}

	drafts, _ := b.branchRepository.GetBranchDrafts()
	for _, draft := range drafts {
		if len(draft.Editors) > 0 {
			err = b.editors.Put(draft.ProjectId+keySeparator+draft.BranchName, draft.Editors)
			if err != nil {
				log.Errorf("Failed to add editors to dmap: %s", err.Error())
				hasErrors = true
			}
		}
	}

	if hasErrors {
		log.Infof("Failed to init BranchEditorsService, going to retry")
		time.Sleep(time.Second * 5)
		b.initWhenOlricReady()
		return
	}

	b.isReadyWg.Done()
	log.Infof("BranchEditorsService is ready")
}

func (b *branchEditorsServiceImpl) AddBranchEditor(projectId string, branchName string, userId string) error {
	b.isReadyWg.Wait()

	isAdded, editors, err := b.addBranchEditorToCache(projectId, branchName, userId)
	if err != nil {
		return fmt.Errorf("failed to add editor to cache %s", err)
	}
	if isAdded {
		utils.SafeAsync(func() {
			err = b.branchRepository.SetDraftEditors(projectId, branchName, editors)
			if err != nil {
				log.Errorf("failed to set editors for project %s and branch %s to db: %s", projectId, branchName, err.Error())
			}

			b.wsBranchService.NotifyProjectBranchUsers(projectId, branchName,
				websocket.BranchEditorAddedPatch{
					Type:   websocket.BranchEditorAddedType,
					UserId: userId,
				})
		})
	}
	return nil
}

func (b *branchEditorsServiceImpl) GetBranchEditors(projectId string, branchName string) ([]view.User, error) {
	b.isReadyWg.Wait()

	userIds, err := b.getBranchEditorsFromCache(projectId, branchName)
	if err != nil {
		return nil, fmt.Errorf("failed to get editors from cache: %s", err)
	}
	if userIds == nil {
		return make([]view.User, 0), nil
	}
	users, err := b.userService.GetUsersByIds(userIds)
	if err != nil {
		return nil, err
	}
	return users, nil
}

func (b *branchEditorsServiceImpl) RemoveBranchEditor(projectId string, branchName string, userId string) error {
	b.isReadyWg.Wait()

	isRemoved, editors, err := b.removeBranchEditorFromCache(projectId, branchName, userId)
	if err != nil {
		return fmt.Errorf("failed to remove editor from cache: %s", err)
	}
	if isRemoved {
		utils.SafeAsync(func() {
			err = b.branchRepository.SetDraftEditors(projectId, branchName, editors)
			if err != nil {
				log.Errorf("failed to set editors for project %s and branch %s to db: %s", projectId, branchName, err.Error())
			}

			b.wsBranchService.NotifyProjectBranchUsers(projectId, branchName,
				websocket.BranchEditorRemovedPatch{
					Type:   websocket.BranchEditorRemovedType,
					UserId: userId,
				})
		})
	}
	return nil
}

func (b *branchEditorsServiceImpl) RemoveBranchEditors(projectId string, branchName string) error {
	b.isReadyWg.Wait()

	err := b.removeBranchEditorsFromCache(projectId, branchName)
	if err != nil {
		return fmt.Errorf("failed to remove editors from cache: %s", err)
	}
	return nil
}

func (b *branchEditorsServiceImpl) addBranchEditorToCache(projectId string, branchName string, userId string) (bool, []string, error) {
	key := projectId + keySeparator + branchName

	val, err := b.editors.Get(key)
	if err != nil {
		if errors.Is(err, olric.ErrKeyNotFound) {
			// ok
		} else {
			return false, nil, err
		}
	}
	var branchEditors []string
	if val != nil {
		branchEditors = val.([]string)
		if utils.SliceContains(branchEditors, userId) {
			return false, nil, nil
		}
	} else {
		branchEditors = []string{}
	}
	branchEditors = append(branchEditors, userId)
	err = b.editors.Put(key, branchEditors)
	if err != nil {
		return false, nil, err
	}
	return true, branchEditors, nil
}

func (b *branchEditorsServiceImpl) getBranchEditorsFromCache(projectId string, branchName string) ([]string, error) {
	key := projectId + keySeparator + branchName

	val, err := b.editors.Get(key)
	if err != nil {
		if errors.Is(err, olric.ErrKeyNotFound) {
			return nil, nil
		} else {
			return nil, err
		}
	}

	return val.([]string), nil
}

func (b *branchEditorsServiceImpl) removeBranchEditorFromCache(projectId string, branchName string, userId string) (bool, []string, error) {
	key := projectId + keySeparator + branchName

	val, err := b.editors.Get(key)
	if err != nil {
		if errors.Is(err, olric.ErrKeyNotFound) {
			return false, nil, nil
		} else {
			return false, nil, err
		}
	}
	branchEditors := val.([]string)

	if index := utils.SliceIndex(branchEditors, userId); index != -1 {
		branchEditors = append(branchEditors[:index], branchEditors[index+1:]...)
		err = b.editors.Put(key, branchEditors)
		if err != nil {
			return false, nil, err
		}
		return true, branchEditors, nil
	}
	return false, nil, nil
}

func (b *branchEditorsServiceImpl) removeBranchEditorsFromCache(projectId string, branchName string) error {
	key := projectId + keySeparator + branchName
	return b.editors.Delete(key)
}
