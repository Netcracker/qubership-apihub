package service

import (
	goctx "context"
	"net/http"
	"sync"

	"github.com/Netcracker/qubership-apihub-agent/exception"
	"github.com/Netcracker/qubership-apihub-agent/utils"
	"github.com/Netcracker/qubership-apihub-agent/view"
	"github.com/netcracker/qubership-core-lib-go-paas-mediation-client/v8/entity"
	"github.com/netcracker/qubership-core-lib-go-paas-mediation-client/v8/filter"
	"github.com/netcracker/qubership-core-lib-go-paas-mediation-client/v8/service"
	log "github.com/sirupsen/logrus"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type ListService interface {
	ListServiceNames(namespace string) ([]view.ServiceNameItem, error)
	ListServiceItems(namespace string) ([]view.ServiceItem, error)
}

func NewListService(cloudName string,
	agentNamespace string,
	excludeWithLabels []string,
	groupingLabels []string,
	paasClient service.PlatformService) ListService {
	groupingLabelsMap := make(map[string]struct{}, len(groupingLabels))
	for _, label := range groupingLabels {
		groupingLabelsMap[label] = struct{}{}
	}
	return listServiceImpl{
		cloudName:         cloudName,
		agentNamespace:    agentNamespace,
		excludeWithLabels: excludeWithLabels,
		groupingLabels:    groupingLabelsMap,
		paasClient:        paasClient,
	}
}

type listServiceImpl struct {
	cloudName         string
	agentNamespace    string
	excludeWithLabels []string
	groupingLabels    map[string]struct{}
	paasClient        service.PlatformService
}

func (l listServiceImpl) ListServiceNames(namespace string) ([]view.ServiceNameItem, error) {
	var result []view.ServiceNameItem
	ctx := goctx.Background()
	list, err := l.paasClient.GetServiceList(ctx, namespace, filter.Meta{})
	if err != nil {
		switch paasErr := err.(type) {
		case *errors.StatusError:
			if paasErr.Status().Reason == v1.StatusReasonForbidden {
				return nil, &exception.CustomError{
					Status:  http.StatusFailedDependency,
					Code:    exception.PaasOperationFailedForbiden,
					Message: exception.PaasOperationFailedForbidenMsg,
					Debug:   err.Error(),
				}
			}
		}
		return nil, &exception.CustomError{
			Status:  http.StatusFailedDependency,
			Code:    exception.PaasOperationFailed,
			Message: exception.PaasOperationFailedMsg,
			Debug:   err.Error(),
		}
	}
	if list == nil {
		return make([]view.ServiceNameItem, 0), nil
	}
	for _, svc := range list {
		annotations := getAllAnnotationsForService(svc)
		result = append(result, view.ServiceNameItem{
			Id:   svc.Name,
			Name: getServiceName(svc.Name, annotations),
		})
	}
	return result, nil
}

func (l listServiceImpl) ListServiceItems(namespace string) ([]view.ServiceItem, error) {
	var result []view.ServiceItem
	ctx := goctx.Background()

	wg := sync.WaitGroup{}

	var services []entity.Service
	var svcErr error

	var pods []entity.Pod
	var podsErr error

	wg.Add(2)

	utils.SafeAsync(func() {
		defer wg.Done()
		services, svcErr = l.paasClient.GetServiceList(ctx, namespace, filter.Meta{})
	})
	utils.SafeAsync(func() {
		defer wg.Done()
		pods, podsErr = l.paasClient.GetPodList(ctx, namespace, filter.Meta{})
	})

	wg.Wait()

	if svcErr != nil {
		log.Errorf("Failed to list k8s services in namespace %s: %s", namespace, svcErr.Error())
		return nil, svcErr
	}

	if podsErr != nil {
		log.Errorf("Failed to list k8s pods in namespace %s: %s", namespace, podsErr.Error())
		return nil, podsErr
	}

	agentId := utils.MakeAgentId(l.cloudName, l.agentNamespace)

	for _, srv := range services {
		log.Infof("Getting pods for service: %s", srv.Name)
		servicePods := getPodsForSelector(pods, srv.Spec.Selector)
		labels := getAllLabelsForService(srv, servicePods)
		log.Infof("Full list of labels for service %s: %+v", srv.Name, labels)
		annotations := getAllAnnotationsForService(srv)
		log.Debugf("Full list of annotations for service %s: %+v", srv.Name, annotations)
		var servicePodNames []string
		for _, servicePod := range servicePods {
			servicePodNames = append(servicePodNames, servicePod.Name)
		}
		// apply skip list for full list of labels
		exclude := false
		for _, label := range l.excludeWithLabels {
			if _, ok := labels[label]; ok {
				log.Infof("Service %s is excluded from discovery", srv.Name)
				exclude = true
				break
			}
		}
		if exclude {
			continue
		}
		serviceId := srv.Name
		serviceName := getServiceName(serviceId, annotations)
		baseUrl := buildBaseurl(srv)

		labelsToAdd := map[string]string{}
		for k, v := range labels {
			if _, ok := l.groupingLabels[k]; ok {
				labelsToAdd[k] = v
				continue
			}
			if k == xApiKindLabel {
				labelsToAdd[k] = v
			}
		}

		serviceItem := view.ServiceItem{
			Id:             serviceId,
			Namespace:      namespace,
			Name:           serviceName,
			Url:            baseUrl,
			Labels:         labels,
			Annotations:    annotations,
			Pods:           servicePodNames,
			ProxyServerUrl: utils.MakeCustomProxyPath(agentId, namespace, serviceId),
		}

		result = append(result, serviceItem)
	}

	return result, nil
}
