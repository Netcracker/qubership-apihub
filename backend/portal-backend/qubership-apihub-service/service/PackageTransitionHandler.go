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
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	log "github.com/sirupsen/logrus"
)

type PackageTransitionHandler interface {
	HandleMissingPackageId(id string) (string, error)
}

func NewPackageTransitionHandler(repo repository.TransitionRepository) PackageTransitionHandler {
	return &packageTransitionHandlerImpl{repo: repo}
}

type packageTransitionHandlerImpl struct {
	repo repository.TransitionRepository
}

func (p packageTransitionHandlerImpl) HandleMissingPackageId(id string) (string, error) {
	newId, err := p.repo.GetNewPackageId(id)
	if err != nil {
		return "", err
	}
	log.Debugf("Transition handler: new package id %s found for %s", newId, id)
	return newId, nil
}
