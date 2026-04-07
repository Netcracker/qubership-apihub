package service

import (
	goctx "context"
	"time"

	"github.com/netcracker/qubership-core-lib-go-paas-mediation-client/v8/filter"
	"github.com/netcracker/qubership-core-lib-go-paas-mediation-client/v8/service"
	"github.com/shaj13/libcache"
	_ "github.com/shaj13/libcache/lru"
)

type NamespaceListCache interface {
	ListNamespaces() ([]string, error)
	GetCloudName() string
	NamespaceExists(namespace string) (bool, error)
	retrieveNamespaces() ([]string, error)
}

func NewNamespaceListCache(cloudName string, paasClient service.PlatformService, ttl time.Duration) NamespaceListCache {
	cache := libcache.LRU.New(1)
	cache.SetTTL(ttl)
	cache.RegisterOnExpired(func(key, _ interface{}) {
		cache.Delete(key)
	})
	return &namespaceListCacheImpl{cloudName: cloudName, cache: cache, paasClient: paasClient}
}

type namespaceListCacheImpl struct {
	cloudName string
	cache     libcache.Cache

	paasClient service.PlatformService
}

const namespacesKey = "namespaces"

func (n *namespaceListCacheImpl) NamespaceExists(namespace string) (bool, error) {
	namespaces, err := n.ListNamespaces()
	if err != nil {
		return false, err
	}

	for _, ns := range namespaces {
		if ns == namespace {
			return true, nil
		}
	}
	return false, nil
}

func (n *namespaceListCacheImpl) ListNamespaces() ([]string, error) {
	val, exists := n.cache.Peek(namespacesKey)
	if exists {
		return val.([]string), nil
	}

	namespaces, err := n.retrieveNamespaces()
	if err != nil {
		return nil, err
	}
	n.cache.Store(namespacesKey, namespaces)
	return namespaces, nil
}

func (n *namespaceListCacheImpl) GetCloudName() string {
	return n.cloudName
}

func (n *namespaceListCacheImpl) retrieveNamespaces() ([]string, error) {
	var result []string
	ctx := goctx.Background()
	nss, err := n.paasClient.GetNamespaces(ctx, filter.Meta{})
	if err != nil {
		return nil, err
	}
	for _, ns := range nss {
		result = append(result, ns.GetMetadata().Name) // TODO: not sure about ns.GetMetadata().Name!!!
	}
	return result, nil
}
