package service

import (
	"encoding/json"
	"slices"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/agent/view"
	"github.com/shaj13/libcache"
	_ "github.com/shaj13/libcache/lru"
	log "github.com/sirupsen/logrus"
)

type ServiceListCache interface {
	GetServicesList(namespace string, workspaceId string, scope view.DiscoveryRequest) ServicesListResult
	handleDiscoveryStart(namespace string, workspaceId string, scope view.DiscoveryRequest)
	addService(namespace string, workspaceId string, scope view.DiscoveryRequest, service view.Service)
	setResultStatus(namespace string, workspaceId string, scope view.DiscoveryRequest, status view.StatusEnum, details string)
	clearResultsForNamespace(namespace string, workspaceId string, scope view.DiscoveryRequest)
}

type ServicesListResult struct {
	Services          []view.Service
	Status            view.StatusEnum
	Details           string
	RequestedServices []string
	RequestedLabels   []string
}

type serviceCacheEntry struct {
	services          []view.Service
	status            view.StatusEnum
	details           string
	requestedServices []string
	requestedLabels   []string
}

func NewServiceListCache(ttl time.Duration) ServiceListCache {
	cache := libcache.LRU.New(1000)
	cache.SetTTL(ttl)
	cache.RegisterOnExpired(func(key, _ interface{}) {
		cache.Delete(key)
	})
	return &serviceListCacheImpl{cache: cache}
}

type serviceListCacheImpl struct {
	cache      libcache.Cache
	cacheMutex sync.Mutex
}

func (s *serviceListCacheImpl) GetServicesList(namespace string, workspaceId string, scope view.DiscoveryRequest) ServicesListResult {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()

	id := getCacheKey(namespace, workspaceId, scope)

	val, exists := s.cache.Peek(id)
	if !exists {
		return ServicesListResult{Services: make([]view.Service, 0), Status: view.StatusNone}
	}

	entry := val.(*serviceCacheEntry)
	services := make([]view.Service, len(entry.services))
	copy(services, entry.services)

	var requestedServices []string
	if len(entry.requestedServices) > 0 {
		requestedServices = slices.Clone(entry.requestedServices)
	}
	var requestedLabels []string
	if len(entry.requestedLabels) > 0 {
		requestedLabels = slices.Clone(entry.requestedLabels)
	}

	return ServicesListResult{
		Services:          services,
		Status:            entry.status,
		Details:           entry.details,
		RequestedServices: requestedServices,
		RequestedLabels:   requestedLabels,
	}
}

func (s *serviceListCacheImpl) handleDiscoveryStart(namespace string, workspaceId string, scope view.DiscoveryRequest) {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()

	id := getCacheKey(namespace, workspaceId, scope)

	var requestedServices []string
	if len(scope.Services) > 0 {
		requestedServices = slices.Clone(scope.Services)
	}
	var requestedLabels []string
	if len(scope.Labels) > 0 {
		requestedLabels = slices.Clone(scope.Labels)
	}

	s.cache.Store(id, &serviceCacheEntry{
		services:          []view.Service{},
		status:            view.StatusRunning,
		requestedServices: requestedServices,
		requestedLabels:   requestedLabels,
	})
}

func (s *serviceListCacheImpl) clearResultsForNamespace(namespace string, workspaceId string, scope view.DiscoveryRequest) {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()

	id := getCacheKey(namespace, workspaceId, scope)

	s.cache.Store(id, &serviceCacheEntry{
		services: []view.Service{},
		status:   view.StatusNone,
	})
}

func (s *serviceListCacheImpl) addService(namespace string, workspaceId string, scope view.DiscoveryRequest, service view.Service) {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()

	id := getCacheKey(namespace, workspaceId, scope)

	val, exists := s.cache.Peek(id)
	if !exists {
		// Storing a new entry here would leave it with no status, which would stop
		// setResultStatus from ever publishing one.
		log.Debugf("Discarding service %s for namespace %s and workspaceId %s: cache entry is gone", service.Id, namespace, workspaceId)
		return
	}

	entry := val.(*serviceCacheEntry)
	entry.services = append(entry.services, service)

	sort.Slice(entry.services, func(i, j int) bool {
		return entry.services[i].Name < entry.services[j].Name
	})
}

func (s *serviceListCacheImpl) setResultStatus(namespace string, workspaceId string, scope view.DiscoveryRequest, status view.StatusEnum, details string) {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()

	id := getCacheKey(namespace, workspaceId, scope)

	val, exists := s.cache.Peek(id)
	if !exists {
		log.Warnf("Trying to update missing entry cache status for namespace %s and workspaceId %s", namespace, workspaceId)
		return
	}

	entry := val.(*serviceCacheEntry)
	if entry.status == view.StatusRunning {
		entry.status = status
		entry.details = details
	}
}

type serviceCacheKey struct {
	Namespace string   `json:"namespace"`
	Workspace string   `json:"workspace"`
	Services  []string `json:"services,omitempty"`
	Labels    []string `json:"labels,omitempty"`
}

func getCacheKey(namespace string, workspaceId string, scope view.DiscoveryRequest) string {
	key, _ := json.Marshal(serviceCacheKey{
		Namespace: namespace,
		Workspace: workspaceId,
		Services:  canonicalScopeItems(scope.Services),
		Labels:    canonicalScopeItems(scope.Labels),
	})
	return string(key)
}

func canonicalScopeItems(items []string) []string {
	canonical := make([]string, 0, len(items))
	for _, item := range items {
		if trimmed := strings.TrimSpace(item); trimmed != "" {
			canonical = append(canonical, trimmed)
		}
	}
	if len(canonical) == 0 {
		return nil
	}
	slices.Sort(canonical)
	return slices.Compact(canonical)
}
