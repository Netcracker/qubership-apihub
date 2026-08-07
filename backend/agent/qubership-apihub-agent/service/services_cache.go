package service

import (
	"fmt"
	"slices"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub-agent/view"
	"github.com/shaj13/libcache"
	_ "github.com/shaj13/libcache/lru"
	log "github.com/sirupsen/logrus"
)

type ServiceListCache interface {
	GetServicesList(namespace string, workspaceId string, requestedServices []string) ServicesListResult
	handleDiscoveryStart(namespace string, workspaceId string, requestedServices []string)
	addService(namespace string, workspaceId string, requestedServices []string, service view.Service)
	setResultStatus(namespace string, workspaceId string, requestedServices []string, status view.StatusEnum, details string)
	clearResultsForNamespace(namespace string, workspaceId string, requestedServices []string)
}

type ServicesListResult struct {
	Services          []view.Service
	Status            view.StatusEnum
	Details           string
	RequestedServices []string
}

type serviceCacheEntry struct {
	services          []view.Service
	status            view.StatusEnum
	details           string
	requestedServices []string
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

func (s *serviceListCacheImpl) GetServicesList(namespace string, workspaceId string, requestedServices []string) ServicesListResult {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()

	id := getCacheKey(namespace, workspaceId, requestedServices)

	val, exists := s.cache.Peek(id)
	if !exists {
		return ServicesListResult{Services: make([]view.Service, 0), Status: view.StatusNone}
	}

	entry := val.(*serviceCacheEntry)
	services := make([]view.Service, len(entry.services))
	copy(services, entry.services)
	requested := make([]string, len(entry.requestedServices))
	copy(requested, entry.requestedServices)

	return ServicesListResult{
		Services:          services,
		Status:            entry.status,
		Details:           entry.details,
		RequestedServices: requested,
	}
}

func (s *serviceListCacheImpl) handleDiscoveryStart(namespace string, workspaceId string, requestedServices []string) {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()

	id := getCacheKey(namespace, workspaceId, requestedServices)

	s.cache.Store(id, &serviceCacheEntry{
		services:          []view.Service{},
		status:            view.StatusRunning,
		requestedServices: requestedServices,
	})
}

func (s *serviceListCacheImpl) clearResultsForNamespace(namespace string, workspaceId string, requestedServices []string) {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()

	id := getCacheKey(namespace, workspaceId, requestedServices)

	s.cache.Store(id, &serviceCacheEntry{
		services: []view.Service{},
		status:   view.StatusNone,
	})
}

func (s *serviceListCacheImpl) addService(namespace string, workspaceId string, requestedServices []string, service view.Service) {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()

	id := getCacheKey(namespace, workspaceId, requestedServices)

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

func (s *serviceListCacheImpl) setResultStatus(namespace string, workspaceId string, requestedServices []string, status view.StatusEnum, details string) {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()

	id := getCacheKey(namespace, workspaceId, requestedServices)

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

const sep = "@||@"

func getCacheKey(namespace string, workspaceId string, requestedServices []string) string {
	key := fmt.Sprintf("%s%s%s", namespace, sep, workspaceId)

	canonical := canonicalRequestedServices(requestedServices)
	if len(canonical) == 0 {
		return key
	}
	return key + sep + strings.Join(canonical, sep)
}

func canonicalRequestedServices(requestedServices []string) []string {
	canonical := make([]string, 0, len(requestedServices))
	for _, serviceName := range requestedServices {
		if trimmed := strings.TrimSpace(serviceName); trimmed != "" {
			canonical = append(canonical, trimmed)
		}
	}
	sort.Strings(canonical)
	return slices.Compact(canonical)
}
