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
	goctx "context"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub-agent/client"
	"github.com/Netcracker/qubership-apihub-agent/secctx"
	"github.com/netcracker/qubership-core-lib-go-paas-mediation-client/v8/entity"
	"github.com/netcracker/qubership-core-lib-go-paas-mediation-client/v8/filter"
	"github.com/netcracker/qubership-core-lib-go-paas-mediation-client/v8/service"

	"github.com/Netcracker/qubership-apihub-agent/exception"
	"github.com/Netcracker/qubership-apihub-agent/utils"
	"github.com/Netcracker/qubership-apihub-agent/view"
	log "github.com/sirupsen/logrus"
)

type DiscoveryService interface {
	StartDiscovery(ctx secctx.SecurityContext, namespace string, workspaceId string) error
	GetServiceUrl(namespace string, serviceId string) (string, error)
}

func NewDiscoveryService(
	cloudName string,
	agentNamespace string,
	apihubUrl string,
	excludeWithLabels []string,
	groupingLabels []string,
	namespaceListCache NamespaceListCache,
	serviceListCache ServiceListCache,
	paasClient service.PlatformService,
	documentsDiscoveryService DocumentsDiscoveryService,
	apihubClient client.ApihubClient) DiscoveryService {
	groupingLabelsMap := make(map[string]struct{}, len(groupingLabels))
	for _, label := range groupingLabels {
		groupingLabelsMap[label] = struct{}{}
	}

	return &discoveryServiceImpl{
		cloudName:                 cloudName,
		agentNamespace:            agentNamespace,
		apihubUrl:                 apihubUrl,
		excludeWithLabels:         excludeWithLabels,
		groupingLabels:            groupingLabelsMap,
		namespaceListCache:        namespaceListCache,
		serviceListCache:          serviceListCache,
		paasClient:                paasClient,
		documentsDiscoveryService: documentsDiscoveryService,
		apihubClient:              apihubClient}
}

type discoveryServiceImpl struct {
	cloudName         string
	agentNamespace    string
	apihubUrl         string
	excludeWithLabels []string
	groupingLabels    map[string]struct{}

	namespaceListCache NamespaceListCache
	serviceListCache   ServiceListCache

	paasClient                service.PlatformService
	documentsDiscoveryService DocumentsDiscoveryService
	apihubClient              client.ApihubClient
}

func (d discoveryServiceImpl) StartDiscovery(ctx secctx.SecurityContext, namespace string, workspaceId string) error {
	exists, err := d.namespaceListCache.NamespaceExists(namespace)
	if err != nil {
		return err
	}

	if !exists {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.NamespaceDoesntExist,
			Message: exception.NamespaceDoesntExistMsg,
			Params:  map[string]interface{}{"namespace": namespace},
		}
	}

	d.serviceListCache.handleDiscoveryStart(namespace, workspaceId)
	utils.SafeAsync(func() {
		d.runDiscovery(ctx, namespace, workspaceId)
	})
	return nil
}

func (d discoveryServiceImpl) runDiscovery(secCtx secctx.SecurityContext, namespace string, workspaceId string) {
	log.Infof("Starting discovery for namespace %s", namespace)
	start := time.Now()
	ctx := goctx.Background()

	wg := sync.WaitGroup{}

	var services []entity.Service
	var svcErr error

	var pods []entity.Pod
	var podsErr error

	wg.Add(2)

	utils.SafeAsync(func() {
		defer wg.Done()
		services, svcErr = d.paasClient.GetServiceList(ctx, namespace, filter.Meta{})
	})
	utils.SafeAsync(func() {
		defer wg.Done()
		pods, podsErr = d.paasClient.GetPodList(ctx, namespace, filter.Meta{})
	})

	wg.Wait()

	if svcErr != nil {
		d.serviceListCache.setResultStatus(namespace, workspaceId, view.StatusError, svcErr.Error())
		log.Errorf("Failed to list k8s services in namespace %s: %s", namespace, svcErr.Error())
		return
	}

	if podsErr != nil {
		d.serviceListCache.setResultStatus(namespace, workspaceId, view.StatusError, podsErr.Error())
		log.Errorf("Failed to list k8s pods in namespace %s: %s", namespace, podsErr.Error())
		return
	}

	agentId := utils.MakeAgentId(d.cloudName, d.agentNamespace)

	for _, srv := range services {
		log.Infof("Getting pods for service: %s", srv.Name)
		servicePods := getPodsForSelector(pods, srv.Spec.Selector)
		labels := getAllLabelsForService(srv, servicePods)
		log.Infof("Full list of labels for service %s: %+v", srv.Name, labels)
		annotations := getAllAnnotationsForService(srv)
		log.Debugf("Full list of annotations for service %s: %+v", srv.Name, annotations)

		// apply skip list for full list of labels
		exclude := false
		for _, label := range d.excludeWithLabels {
			if _, ok := labels[label]; ok {
				log.Infof("Service %s is excluded from discovery", srv.Name)
				exclude = true
				break
			}
		}
		if exclude {
			continue
		}

		discoveryUrls := view.MakeDocDiscoveryUrls(annotations)

		srvTmp := srv
		wg.Add(1)

		utils.SafeAsync(func() {
			serviceId := srvTmp.Name
			serviceName := getServiceName(serviceId, annotations)
			baseUrl := buildBaseurl(srvTmp)

			var documents []view.Document
			var docErr error

			// search for documents and for baseline in parallel
			srvWg := sync.WaitGroup{}
			srvWg.Add(2)

			utils.SafeAsync(func() {
				defer srvWg.Done()

				documents, docErr = d.documentsDiscoveryService.RetrieveDocuments(baseUrl, serviceName, discoveryUrls)
				if docErr != nil {
					log.Errorf("Service %s have errors during discovery: %s", serviceName, docErr)
				}
			})

			var baselineObj *view.Baseline

			utils.SafeAsync(func() {
				defer srvWg.Done()
				baselinePackage, err := d.apihubClient.GetPackageByServiceName(secCtx, workspaceId, serviceName) // name here, not id!
				if err != nil {
					log.Errorf("failed to get baseline for %s: %s", serviceName, err)
				}

				if baselinePackage != nil {
					versions := make([]string, 0)

					defaultVersion := baselinePackage.DefaultReleaseVersion
					versionsResp, err := d.apihubClient.GetVersions(secCtx, baselinePackage.Id, 0, 100)
					if err != nil {
						log.Warnf("failed to get baseline %s versions: %s", baselinePackage.Id, err)
					} else {
						if versionsResp != nil {
							for _, v := range versionsResp.Versions {
								versions = append(versions, v.Version)

								if defaultVersion == "" {
									defaultVersion = v.Version
								}
							}
						}
					}

					baselineObj = &view.Baseline{
						PackageId: baselinePackage.Id,
						Name:      baselinePackage.Name,
						Url:       fmt.Sprintf("%s/portal/packages/%s/%s?mode=overview&item=summary", d.apihubUrl, baselinePackage.Id, url.PathEscape(defaultVersion)),
						Versions:  versions,
					}
				}
			})

			srvWg.Wait()

			labelsToAdd := map[string]string{}
			for k, v := range labels {
				if _, ok := d.groupingLabels[k]; ok {
					labelsToAdd[k] = v
					continue
				}
				if k == xApiKindLabel {
					labelsToAdd[k] = v
				}
			}

			errorStr := ""
			if docErr != nil {
				errorStr = docErr.Error()
			}

			srvToAdd := view.Service{
				Id:             serviceId,
				Name:           serviceName,
				Url:            baseUrl,
				Documents:      documents,
				Baseline:       baselineObj,
				Labels:         labelsToAdd,
				ProxyServerUrl: utils.MakeCustomProxyPath(agentId, namespace, serviceId),
				Error:          errorStr,
			}
			d.serviceListCache.addService(namespace, workspaceId, srvToAdd)
			wg.Done()
		})
	}

	wg.Wait()

	log.Infof("Discovery for namespace %s took %dms", namespace, time.Since(start).Milliseconds())

	d.serviceListCache.setResultStatus(namespace, workspaceId, view.StatusComplete, "")
}

func getPodsForSelector(allPods []entity.Pod, selector map[string]string) []entity.Pod {
	var result []entity.Pod
	if len(selector) == 0 {
		return result
	}
	for _, pod := range allPods {
		matchSelectors := 0
		for k, v := range selector {
			if pod.Labels[k] == v {
				matchSelectors++
			}
		}
		if matchSelectors == len(selector) {
			log.Infof("Got pod for selectors %+v. Name = %s", selector, pod.Name)
			result = append(result, pod)
		}
	}
	return result
}

func getAllLabelsForService(service entity.Service, pods []entity.Pod) map[string]string {
	result := map[string]string{}
	for k, v := range service.Labels {
		result[k] = v
	}
	for _, pod := range pods {
		for k, v := range pod.Labels {
			result[k] = v
		}
	}
	return result
}

func getAllAnnotationsForService(service entity.Service) map[string]string {
	result := map[string]string{}
	for k, v := range service.Annotations {
		result[k] = v
	}
	return result
}

var bgRegexp = regexp.MustCompile(`(.*?)-v\d+$`)

// Extract service name from blue-green name
func getServiceName(nameFromKuber string, annotations map[string]string) string {
	if bgRegexp.MatchString(nameFromKuber) {
		res := bgRegexp.FindStringSubmatch(nameFromKuber)
		if len(res) < 2 {
			return nameFromKuber
		} else {
			return res[1]
		}
	} else {
		return nameFromKuber
	}
}

func buildBaseurl(srv entity.Service) string {
	// TODO: https support
	baseUrl := "http://" + srv.Name + "." + srv.Namespace + ".svc.cluster.local" + ":"
	for _, port := range srv.Spec.Ports {
		if port.Name == "web" || port.Name == "http" || port.Port == 8080 || port.Port == 80 || port.Port == 443 || port.Port == 8443 {
			baseUrl += strconv.Itoa(int(port.Port))
			break
		}
	}
	return baseUrl
}

const xApiKindLabel = "apihub/x-api-kind"

func (d discoveryServiceImpl) GetServiceUrl(namespace string, serviceId string) (string, error) {
	ctx := goctx.Background()
	list, err := d.paasClient.GetServiceList(ctx, namespace, filter.Meta{})
	if err != nil {
		log.Errorf("Failed to get k8s services list in namespace %s: %s", namespace, err.Error())
		return "", err
	}
	for _, namespaceService := range list {
		if namespaceService.Name == serviceId {
			return buildBaseurl(namespaceService), nil
		}
	}
	return "", &exception.CustomError{
		Status:  http.StatusBadRequest,
		Code:    exception.NamespaceServiceDoesntExist,
		Message: exception.NamespaceServiceDoesntExistMsg,
		Params:  map[string]interface{}{"service": serviceId, "namespace": namespace},
	}
}
