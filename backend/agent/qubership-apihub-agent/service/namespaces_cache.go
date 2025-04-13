package service

import (
	goctx "context"
	"sync"

	"github.com/netcracker/qubership-core-lib-go-paas-mediation-client/v8/filter"
	"github.com/netcracker/qubership-core-lib-go-paas-mediation-client/v8/service"
)

type NamespaceListCache interface {
	ListNamespaces() ([]string, error)
	GetCloudName() string
	NamespaceExists(namespace string) (bool, error)
	retrieveNamespaces() ([]string, error)
}

func NewNamespaceListCache(cloudName string, paasClient service.PlatformService) NamespaceListCache {
	return &namespaceListCacheImpl{cloudName: cloudName, cache: []string{}, cacheMutex: sync.RWMutex{}, paasClient: paasClient}
}

type namespaceListCacheImpl struct {
	cloudName  string
	cache      []string
	cacheMutex sync.RWMutex

	paasClient service.PlatformService
}

func (n *namespaceListCacheImpl) NamespaceExists(namespace string) (bool, error) {
	n.cacheMutex.Lock()
	defer n.cacheMutex.Unlock()

	var err error
	if len(n.cache) == 0 {
		n.cache, err = n.retrieveNamespaces()
		if err != nil {
			return false, err
		}
	}

	for _, ns := range n.cache {
		if ns == namespace {
			return true, nil
		}
	}
	return false, nil
}

func (n *namespaceListCacheImpl) ListNamespaces() ([]string, error) {
	n.cacheMutex.Lock()
	defer n.cacheMutex.Unlock()

	var err error
	if len(n.cache) == 0 {
		n.cache, err = n.retrieveNamespaces()
		if err != nil {
			return nil, err
		}
	}

	return n.cache, nil
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
