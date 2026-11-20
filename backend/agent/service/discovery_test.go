package service

import (
	goctx "context"
	"slices"
	"testing"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/agent/client"
	"github.com/Netcracker/qubership-apihub/backend/agent/config"
	"github.com/Netcracker/qubership-apihub/backend/agent/secctx"
	"github.com/Netcracker/qubership-apihub/backend/agent/view"
	"github.com/netcracker/qubership-core-lib-go-paas-mediation-client/v8/entity"
	"github.com/netcracker/qubership-core-lib-go-paas-mediation-client/v8/filter"
	"github.com/netcracker/qubership-core-lib-go-paas-mediation-client/v8/service"
)

type fakePlatformService struct {
	service.PlatformService
	services    []entity.Service
	pods        []entity.Pod
	deployments []entity.Deployment
}

func (f fakePlatformService) GetServiceList(goctx.Context, string, filter.Meta) ([]entity.Service, error) {
	return f.services, nil
}

func (f fakePlatformService) GetPodList(goctx.Context, string, filter.Meta) ([]entity.Pod, error) {
	return f.pods, nil
}

func (f fakePlatformService) GetDeploymentList(goctx.Context, string, filter.Meta) ([]entity.Deployment, error) {
	return f.deployments, nil
}

type fakeDocumentsDiscoveryService struct{}

func (fakeDocumentsDiscoveryService) RetrieveDocuments(string, string, view.DocumentDiscoveryUrls) (*view.DiscoveryResult, error) {
	return &view.DiscoveryResult{Documents: []view.Document{}}, nil
}

type fakeApihubClient struct {
	client.ApihubClient
}

func (fakeApihubClient) GetPackageByServiceName(secctx.SecurityContext, string, string) (*view.SimplePackage, error) {
	return nil, nil
}

func TestRunDiscoveryIncludeLabels(t *testing.T) {
	const namespace = "ns"
	const workspaceId = "workspace"
	replicas := int32(1)

	tests := []struct {
		name              string
		includeLabels     []string
		excludeLabels     []string
		requestedServices []string
		services          []entity.Service
		pods              []entity.Pod
		deployments       []entity.Deployment
		want              []string
	}{
		{
			name:     "empty filter keeps every service",
			services: []entity.Service{{Metadata: entity.Metadata{Name: "a"}}, {Metadata: entity.Metadata{Name: "b"}}},
			want:     []string{"a", "b"},
		},
		{
			name:          "match by a Service label",
			includeLabels: []string{"app.kubernetes.io/part-of=abc"},
			services: []entity.Service{
				{Metadata: entity.Metadata{Name: "a", Labels: map[string]string{"app.kubernetes.io/part-of": "abc"}}},
				{Metadata: entity.Metadata{Name: "b", Labels: map[string]string{"app.kubernetes.io/part-of": "xyz"}}},
			},
			want: []string{"a"},
		},
		{
			name:          "entries combine with OR",
			includeLabels: []string{"app.kubernetes.io/part-of=abc", "tier=backend"},
			services: []entity.Service{
				{Metadata: entity.Metadata{Name: "a", Labels: map[string]string{"app.kubernetes.io/part-of": "abc"}}},
				{Metadata: entity.Metadata{Name: "b", Labels: map[string]string{"tier": "backend"}}},
				{Metadata: entity.Metadata{Name: "c", Labels: map[string]string{"tier": "frontend"}}},
			},
			want: []string{"a", "b"},
		},
		{
			name:          "pod label overrides the Service label with the same key",
			includeLabels: []string{"app.kubernetes.io/part-of=abc"},
			services: []entity.Service{
				{
					Metadata: entity.Metadata{Name: "a", Labels: map[string]string{"app.kubernetes.io/part-of": "abc"}},
					Spec:     entity.ServiceSpec{Selector: map[string]string{"app": "a"}},
				},
			},
			pods: []entity.Pod{
				{Metadata: entity.Metadata{Name: "a-pod", Labels: map[string]string{"app": "a", "app.kubernetes.io/part-of": "xyz"}}},
			},
			want: []string{},
		},
		{
			name:          "match only through the second selected pod on an empty value",
			includeLabels: []string{"track="},
			services: []entity.Service{
				{Metadata: entity.Metadata{Name: "a"}, Spec: entity.ServiceSpec{Selector: map[string]string{"app": "a"}}},
			},
			pods: []entity.Pod{
				{Metadata: entity.Metadata{Name: "a-pod-1", Labels: map[string]string{"app": "a"}}},
				{Metadata: entity.Metadata{Name: "a-pod-2", Labels: map[string]string{"app": "a", "track": ""}}},
			},
			want: []string{"a"},
		},
		{
			name:          "pod not selected by the service does not count",
			includeLabels: []string{"app.kubernetes.io/part-of=abc"},
			services: []entity.Service{
				{Metadata: entity.Metadata{Name: "a"}, Spec: entity.ServiceSpec{Selector: map[string]string{"app": "a", "track": ""}}},
			},
			pods: []entity.Pod{
				{Metadata: entity.Metadata{Name: "other-pod", Labels: map[string]string{"app": "a", "app.kubernetes.io/part-of": "abc"}}},
			},
			want: []string{},
		},
		{
			name:          "excluded service is not discovered although it matches an include entry",
			includeLabels: []string{"tier=api"},
			excludeLabels: []string{"skip"},
			services: []entity.Service{
				{Metadata: entity.Metadata{Name: "a", Labels: map[string]string{"tier": "api", "skip": "true"}}},
			},
			want: []string{},
		},
		{
			name:              "requested service that fails the filter does not abort the run on its not-ready deployment",
			includeLabels:     []string{"track="},
			requestedServices: []string{"not-ready"},
			services: []entity.Service{
				{Metadata: entity.Metadata{Name: "not-ready"}, Spec: entity.ServiceSpec{Selector: map[string]string{"app": "not-ready"}}},
			},
			pods: []entity.Pod{
				{Metadata: entity.Metadata{Name: "not-ready-pod", Labels: map[string]string{"app": "not-ready"}}},
			},
			deployments: []entity.Deployment{
				{Metadata: entity.Metadata{Name: "not-ready", Labels: map[string]string{"app": "not-ready"}}, Spec: entity.DeploymentSpec{Replicas: &replicas}},
			},
			want: []string{},
		},
		{
			name: "deployment without a selector key is not the service's deployment",
			services: []entity.Service{
				{Metadata: entity.Metadata{Name: "a"}, Spec: entity.ServiceSpec{Selector: map[string]string{"app": "a", "track": ""}}},
			},
			deployments: []entity.Deployment{
				{Metadata: entity.Metadata{Name: "untracked", Labels: map[string]string{"app": "a"}}, Spec: entity.DeploymentSpec{Replicas: &replicas}},
			},
			want: []string{"a"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			paasClient := fakePlatformService{services: tt.services, pods: tt.pods, deployments: tt.deployments}
			serviceListCache := NewServiceListCache(time.Hour)
			d := NewDiscoveryService("cloud", "agent-ns", "", tt.excludeLabels, tt.includeLabels, nil, nil, serviceListCache,
				paasClient, fakeDocumentsDiscoveryService{}, fakeApihubClient{}, config.ApiTypeUrlsConfig{}).(*discoveryServiceImpl)
			serviceListCache.handleDiscoveryStart(namespace, workspaceId, tt.requestedServices)

			d.runDiscovery(nil, namespace, workspaceId, true, tt.requestedServices)

			result := serviceListCache.GetServicesList(namespace, workspaceId, tt.requestedServices)
			if result.Status != view.StatusComplete {
				t.Fatalf("status = %s (%s), want %s", result.Status, result.Details, view.StatusComplete)
			}
			got := make([]string, 0, len(result.Services))
			for _, srv := range result.Services {
				got = append(got, srv.Id)
			}
			slices.Sort(got)
			if !slices.Equal(got, tt.want) {
				t.Errorf("services = %v, want %v", got, tt.want)
			}
		})
	}
}
