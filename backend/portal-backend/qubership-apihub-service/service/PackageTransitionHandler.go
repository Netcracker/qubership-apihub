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
