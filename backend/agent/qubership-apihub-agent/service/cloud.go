package service

import (
	"fmt"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub-agent/secctx"
	"github.com/Netcracker/qubership-apihub-agent/utils"
	"github.com/Netcracker/qubership-apihub-agent/view"
	log "github.com/sirupsen/logrus"
)

type CloudService interface {
	StartAllDiscovery_deprecated(ctx secctx.SecurityContext, workspaceId string) error
	GetAllServicesList_deprecated(workspaceId string) view.AllServiceListResponse_deprecated
}

func NewCloudService(discoveryService DiscoveryService, serviceListCache ServiceListCache, namespaceListCache NamespaceListCache) CloudService {
	return &cloudServiceImpl{
		discoveryService:   discoveryService,
		serviceListCache:   serviceListCache,
		namespaceListCache: namespaceListCache,
		status:             view.StatusNone,
		startMutex:         sync.RWMutex{},
		started:            time.Time{},
		finished:           time.Time{},
	}
}

type cloudServiceImpl struct {
	discoveryService   DiscoveryService
	serviceListCache   ServiceListCache
	namespaceListCache NamespaceListCache

	status     view.StatusEnum
	startMutex sync.RWMutex
	errors     []string
	started    time.Time
	finished   time.Time
}

func (c *cloudServiceImpl) StartAllDiscovery_deprecated(ctx secctx.SecurityContext, workspaceId string) error {
	c.startMutex.Lock()
	defer c.startMutex.Unlock()

	switch c.status {
	case view.StatusNone:
		log.Infof("Starting all namespaces discovery")
	case view.StatusRunning:
		log.Infof("Do not start all discovery since it's already running")
		return nil
	case view.StatusComplete, view.StatusError:
		log.Infof("Restarting all namespaces discovery")
	}

	c.status = view.StatusRunning
	c.started = time.Now()
	// Unfortunately need to run one by one because multithreading cause not discovered documents due to increased networks delays.
	// Tried to run all discoveries in parallel and result is incorrect.
	utils.SafeAsync(func() {
		c.runAllDiscoveryOneByOne(ctx, workspaceId)
	})
	return nil
}

func (c *cloudServiceImpl) runAllDiscoveryOneByOne(ctx secctx.SecurityContext, workspaceId string) {
	namespaces, err := c.namespaceListCache.ListNamespaces()
	if err != nil {
		c.startMutex.Lock()
		defer c.startMutex.Unlock()
		c.status = view.StatusError
		c.errors = append(c.errors, fmt.Sprintf("Unable to start all discovery: failed to list namespace: %s", err))
		log.Errorf("Unable to start all discovery: failed to list namespace: %s", err)
		return
	}

	log.Infof("Clearing services cache")
	for _, ns := range namespaces {
		c.serviceListCache.clearResultsForNamespace(ns, workspaceId)
	}

	log.Infof("Namespaces to discover: %+v", namespaces)
	for _, ns := range namespaces {
		err := c.discoveryService.StartDiscovery(ctx, ns, workspaceId, false)
		if err != nil {
			log.Errorf("Failed to start discovery for namespace %s: %s", ns, err)
			c.errors = append(c.errors, fmt.Sprintf("failed to start discovery for namespace %s: %s", ns, err))
			continue
		}
		c.waitForNamespace(ns, workspaceId)
	}
	c.startMutex.Lock()
	defer c.startMutex.Unlock()
	if len(c.errors) > 0 {
		c.status = view.StatusError
	} else {
		c.status = view.StatusComplete
	}
	c.finished = time.Now()
}

func (c *cloudServiceImpl) waitForNamespace(ns string, workspaceId string) {
	ticker := time.NewTicker(time.Second * 5)
	defer ticker.Stop()
	stop := make(chan struct{})
	for {
		select {
		case <-ticker.C:
			log.Debugf("waitForNamespace %s check", ns)
			_, status, details := c.serviceListCache.GetServicesList(ns, workspaceId)
			if status == view.StatusRunning || status == view.StatusNone {
				log.Debugf("waitForNamespace %s running", ns)
				continue
			}
			if status == view.StatusError {
				log.Debugf("waitForNamespace %s error", ns)
				c.errors = append(c.errors, fmt.Sprintf("failed discovery for namespace %s: %s", ns, details))
				utils.SafeAsync(func() {
					stop <- struct{}{}
				})
			}
			if status == view.StatusComplete {
				log.Debugf("waitForNamespace %s complete", ns)
				utils.SafeAsync(func() {
					stop <- struct{}{}
				})
			}
		case <-stop:
			log.Debugf("waitForNamespace %s done", ns)
			return
		default:
			log.Debugf("waitForNamespace %s sleep", ns)
			time.Sleep(time.Second * 1)
		}
	}
}

func (c *cloudServiceImpl) GetAllServicesList_deprecated(workspaceId string) view.AllServiceListResponse_deprecated {
	result := view.AllServiceListResponse_deprecated{}
	result.Status = c.status

	if c.status == view.StatusNone {
		return result
	}

	namespaces, err := c.namespaceListCache.ListNamespaces()
	if err != nil {
		result.Status = view.StatusError
		result.Debug = fmt.Sprintf("Unable to get all discovery status: failed to list namespaces: %s", err)
		return result
	}
	namespacesData := map[string]view.ServiceListResponse_deprecated{}
	for _, ns := range namespaces {
		services, status, details := c.serviceListCache.GetServicesList(ns, workspaceId)
		servicesDeprecated := make([]view.Service_deprecated, len(services))
		for i, svc := range services {
			servicesDeprecated[i] = svc.ToDeprecated()
		}
		namespacesData[ns] = view.ServiceListResponse_deprecated{Services: servicesDeprecated, Status: status, Debug: details}
	}
	result.NamespaceData = namespacesData

	resultDetails := ""
	for _, errStr := range c.errors {
		resultDetails += "|" + errStr
	}
	if resultDetails != "" {
		resultDetails += "|"
	}

	result.TotalNamespaces = len(namespacesData)
	completed := 0
	for _, svcs := range namespacesData {
		if svcs.Status == view.StatusComplete || svcs.Status == view.StatusError {
			completed += 1
		}
		result.TotalServices += len(svcs.Services)
		for _, svc := range svcs.Services {
			if svc.Baseline != nil {
				result.TotalServicesWithBaselines += 1
			}
			result.TotalDocuments += len(svc.Documents)
		}
	}
	result.Progress = fmt.Sprintf("%d/%d", completed, result.TotalNamespaces)

	var elapsedSec int
	if c.finished.IsZero() {
		elapsedSec = int(time.Since(c.started).Seconds())
	} else {
		elapsedSec = int(c.finished.Sub(c.started).Seconds())
	}
	result.ElapsedSec = elapsedSec

	return result
}
