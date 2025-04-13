package service

import (
	"fmt"
	"sort"
	"sync"

	"github.com/Netcracker/qubership-apihub-agent/view"
	log "github.com/sirupsen/logrus"
)

type ServiceListCache interface {
	GetServicesList(namespace string, workspaceId string) ([]view.Service, view.StatusEnum, string)
	handleDiscoveryStart(namespace string, workspaceId string)
	addService(namespace string, workspaceId string, service view.Service)
	setResultStatus(namespace string, workspaceId string, status view.StatusEnum, details string)
	clearResultsForNamespace(namespace string, workspaceId string)
}

func NewServiceListCache() ServiceListCache {
	return &serviceListCacheImpl{cache: sync.Map{}, cacheMutex: sync.RWMutex{}, status: sync.Map{}, details: map[string]string{}}
}

type serviceListCacheImpl struct {
	// cache per namespace+workspace
	cache      sync.Map // TODO: replace with regular map
	cacheMutex sync.RWMutex
	// status per namespace+workspace
	status sync.Map // TODO: replace with regular map
	// details per namespace+workspace
	details map[string]string
}

func (s *serviceListCacheImpl) GetServicesList(namespace string, workspaceId string) ([]view.Service, view.StatusEnum, string) {
	s.cacheMutex.RLock()
	defer s.cacheMutex.RUnlock()
	id := getNamespaceWithWorkspaceId(namespace, workspaceId)

	val, exists := s.cache.Load(id)
	if !exists {
		return make([]view.Service, 0), view.StatusNone, ""
	}
	sVal, _ := s.status.Load(id)

	return val.([]view.Service), sVal.(view.StatusEnum), s.details[id]
}

func (s *serviceListCacheImpl) handleDiscoveryStart(namespace string, workspaceId string) {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()

	id := getNamespaceWithWorkspaceId(namespace, workspaceId)

	s.status.Store(id, view.StatusRunning)
	s.cache.Store(id, []view.Service{})
	delete(s.details, id)
}

func (s *serviceListCacheImpl) clearResultsForNamespace(namespace string, workspaceId string) {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()

	id := getNamespaceWithWorkspaceId(namespace, workspaceId)

	s.status.Store(id, view.StatusNone)
	s.cache.Store(id, []view.Service{})
	delete(s.details, id)
}

func (s *serviceListCacheImpl) addService(namespace string, workspaceId string, service view.Service) {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()

	id := getNamespaceWithWorkspaceId(namespace, workspaceId)

	val, exists := s.cache.Load(id)
	if !exists {
		services := []view.Service{service}
		s.cache.Store(id, services)
	} else {
		services := val.([]view.Service)
		services = append(services, service)

		sort.Slice(services, func(i, j int) bool {
			return services[i].Name < services[j].Name
		})

		s.cache.Store(id, services) // TODO: Need or not???
	}
}

func (s *serviceListCacheImpl) setResultStatus(namespace string, workspaceId string, status view.StatusEnum, details string) {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()

	id := getNamespaceWithWorkspaceId(namespace, workspaceId)

	val, exists := s.status.Load(id)
	if !exists {
		log.Warnf("Trying to update missing entry cache status for namespace %s and workspaceId %s", namespace, workspaceId)
		return
	}
	if val.(view.StatusEnum) == view.StatusRunning {
		s.status.Store(id, status)
		s.details[id] = details
	}
}

const sep = "@||@"

func getNamespaceWithWorkspaceId(namespace string, workspaceId string) string {
	return fmt.Sprintf("%s%s%s", namespace, sep, workspaceId)
}
