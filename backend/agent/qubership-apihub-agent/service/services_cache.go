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
	"sort"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub-agent/view"
	"github.com/shaj13/libcache"
	_ "github.com/shaj13/libcache/lru"
	log "github.com/sirupsen/logrus"
)

type ServiceListCache interface {
	GetServicesList(namespace string, workspaceId string) ([]view.Service, view.StatusEnum, string)
	handleDiscoveryStart(namespace string, workspaceId string)
	addService(namespace string, workspaceId string, service view.Service)
	setResultStatus(namespace string, workspaceId string, status view.StatusEnum, details string)
	clearResultsForNamespace(namespace string, workspaceId string)
}

type serviceCacheEntry struct {
	services []view.Service
	status   view.StatusEnum
	details  string
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

func (s *serviceListCacheImpl) GetServicesList(namespace string, workspaceId string) ([]view.Service, view.StatusEnum, string) {
	id := getNamespaceWithWorkspaceId(namespace, workspaceId)

	val, exists := s.cache.Peek(id)
	if !exists {
		return make([]view.Service, 0), view.StatusNone, ""
	}

	entry := val.(*serviceCacheEntry)
	return entry.services, entry.status, entry.details
}

func (s *serviceListCacheImpl) handleDiscoveryStart(namespace string, workspaceId string) {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()

	id := getNamespaceWithWorkspaceId(namespace, workspaceId)

	s.cache.Store(id, &serviceCacheEntry{
		services: []view.Service{},
		status:   view.StatusRunning,
	})
}

func (s *serviceListCacheImpl) clearResultsForNamespace(namespace string, workspaceId string) {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()

	id := getNamespaceWithWorkspaceId(namespace, workspaceId)

	s.cache.Store(id, &serviceCacheEntry{
		services: []view.Service{},
		status:   view.StatusNone,
	})
}

func (s *serviceListCacheImpl) addService(namespace string, workspaceId string, service view.Service) {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()

	id := getNamespaceWithWorkspaceId(namespace, workspaceId)

	val, exists := s.cache.Peek(id)
	if !exists {
		s.cache.Store(id, &serviceCacheEntry{
			services: []view.Service{service},
		})
		return
	}

	entry := val.(*serviceCacheEntry)
	entry.services = append(entry.services, service)

	sort.Slice(entry.services, func(i, j int) bool {
		return entry.services[i].Name < entry.services[j].Name
	})
}

func (s *serviceListCacheImpl) setResultStatus(namespace string, workspaceId string, status view.StatusEnum, details string) {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()

	id := getNamespaceWithWorkspaceId(namespace, workspaceId)

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

func getNamespaceWithWorkspaceId(namespace string, workspaceId string) string {
	return fmt.Sprintf("%s%s%s", namespace, sep, workspaceId)
}
