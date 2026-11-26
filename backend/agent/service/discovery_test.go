package service

import (
	goctx "context"
	"encoding/json"
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

func TestRunDiscoveryScopeLabels(t *testing.T) {
	const namespace = "ns"
	const workspaceId = "workspace"
	replicas := int32(1)

	tests := []struct {
		name          string
		scope         view.DiscoveryRequest
		excludeLabels []string
		services      []entity.Service
		pods          []entity.Pod
		deployments   []entity.Deployment
		want          []string
	}{
		{
			name:     "empty filter keeps every service",
			services: []entity.Service{{Metadata: entity.Metadata{Name: "a"}}, {Metadata: entity.Metadata{Name: "b"}}},
			want:     []string{"a", "b"},
		},
		{
			name:  "match by a Service label",
			scope: view.DiscoveryRequest{Labels: []string{"app.kubernetes.io/part-of=abc"}},
			services: []entity.Service{
				{Metadata: entity.Metadata{Name: "a", Labels: map[string]string{"app.kubernetes.io/part-of": "abc"}}},
				{Metadata: entity.Metadata{Name: "b", Labels: map[string]string{"app.kubernetes.io/part-of": "xyz"}}},
			},
			want: []string{"a"},
		},
		{
			name:  "entries combine with OR",
			scope: view.DiscoveryRequest{Labels: []string{"app.kubernetes.io/part-of=abc", "tier=backend"}},
			services: []entity.Service{
				{Metadata: entity.Metadata{Name: "a", Labels: map[string]string{"app.kubernetes.io/part-of": "abc"}}},
				{Metadata: entity.Metadata{Name: "b", Labels: map[string]string{"tier": "backend"}}},
				{Metadata: entity.Metadata{Name: "c", Labels: map[string]string{"tier": "frontend"}}},
			},
			want: []string{"a", "b"},
		},
		{
			name:  "service label overrides non-matching pod label",
			scope: view.DiscoveryRequest{Labels: []string{"app.kubernetes.io/part-of=abc"}},
			services: []entity.Service{
				{
					Metadata: entity.Metadata{Name: "a", Labels: map[string]string{"app.kubernetes.io/part-of": "abc"}},
					Spec:     entity.ServiceSpec{Selector: map[string]string{"app": "a"}},
				},
			},
			pods: []entity.Pod{
				{Metadata: entity.Metadata{Name: "a-pod", Labels: map[string]string{"app": "a", "app.kubernetes.io/part-of": "xyz"}}},
			},
			want: []string{"a"},
		},
		{
			name:  "non-matching service label overrides matching pod label",
			scope: view.DiscoveryRequest{Labels: []string{"app.kubernetes.io/part-of=abc"}},
			services: []entity.Service{
				{
					Metadata: entity.Metadata{Name: "a", Labels: map[string]string{"app.kubernetes.io/part-of": "xyz"}},
					Spec:     entity.ServiceSpec{Selector: map[string]string{"app": "a"}},
				},
			},
			pods: []entity.Pod{
				{Metadata: entity.Metadata{Name: "a-pod", Labels: map[string]string{"app": "a", "app.kubernetes.io/part-of": "abc"}}},
			},
			want: []string{},
		},
		{
			name:  "empty service label overrides matching pod label",
			scope: view.DiscoveryRequest{Labels: []string{"app.kubernetes.io/part-of=abc"}},
			services: []entity.Service{
				{
					Metadata: entity.Metadata{Name: "a", Labels: map[string]string{"app.kubernetes.io/part-of": ""}},
					Spec:     entity.ServiceSpec{Selector: map[string]string{"app": "a"}},
				},
			},
			pods: []entity.Pod{
				{Metadata: entity.Metadata{Name: "a-pod", Labels: map[string]string{"app": "a", "app.kubernetes.io/part-of": "abc"}}},
			},
			want: []string{},
		},
		{
			name:  "pod label matches when service omits that key",
			scope: view.DiscoveryRequest{Labels: []string{"track="}},
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
			name:  "multiple pods merge deterministically by pod name regardless of input order",
			scope: view.DiscoveryRequest{Labels: []string{"tier=new"}},
			services: []entity.Service{
				{Metadata: entity.Metadata{Name: "a"}, Spec: entity.ServiceSpec{Selector: map[string]string{"app": "a"}}},
			},
			pods: []entity.Pod{
				{Metadata: entity.Metadata{Name: "a-pod-2", Labels: map[string]string{"app": "a", "tier": "new"}}},
				{Metadata: entity.Metadata{Name: "a-pod-1", Labels: map[string]string{"app": "a", "tier": "old"}}},
			},
			want: []string{"a"},
		},
		{
			name:  "pod not selected by the service does not count",
			scope: view.DiscoveryRequest{Labels: []string{"app.kubernetes.io/part-of=abc"}},
			services: []entity.Service{
				{Metadata: entity.Metadata{Name: "a"}, Spec: entity.ServiceSpec{Selector: map[string]string{"app": "a", "track": ""}}},
			},
			pods: []entity.Pod{
				{Metadata: entity.Metadata{Name: "other-pod", Labels: map[string]string{"app": "a", "app.kubernetes.io/part-of": "abc"}}},
			},
			want: []string{},
		},
		{
			name:          "excluded service is not discovered although it matches a requested label",
			scope:         view.DiscoveryRequest{Labels: []string{"tier=api"}},
			excludeLabels: []string{"skip"},
			services: []entity.Service{
				{Metadata: entity.Metadata{Name: "a", Labels: map[string]string{"tier": "api", "skip": "true"}}},
			},
			want: []string{},
		},
		{
			name:  "combined services and labels filters blue-green variants with AND",
			scope: view.DiscoveryRequest{Services: []string{"svc"}, Labels: []string{"tier=api"}},
			services: []entity.Service{
				{Metadata: entity.Metadata{Name: "svc-v1", Labels: map[string]string{"tier": "api"}}},
				{Metadata: entity.Metadata{Name: "svc-v2", Labels: map[string]string{"tier": "batch"}}},
				{Metadata: entity.Metadata{Name: "other-v1", Labels: map[string]string{"tier": "api"}}},
			},
			want: []string{"svc-v1"},
		},
		{
			name:  "requested service that fails the label filter does not abort the run on its not-ready deployment",
			scope: view.DiscoveryRequest{Services: []string{"not-ready"}, Labels: []string{"track="}},
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
		{
			name:  "selectorless service matching labels does not fail on unrelated not-ready deployment",
			scope: view.DiscoveryRequest{Labels: []string{"tier=api"}},
			services: []entity.Service{
				{Metadata: entity.Metadata{Name: "selectorless", Labels: map[string]string{"tier": "api"}}},
			},
			deployments: []entity.Deployment{
				{Metadata: entity.Metadata{Name: "unrelated", Labels: map[string]string{"app": "other"}}, Spec: entity.DeploymentSpec{Replicas: &replicas}},
			},
			want: []string{"selectorless"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			paasClient := fakePlatformService{services: tt.services, pods: tt.pods, deployments: tt.deployments}
			serviceListCache := NewServiceListCache(time.Hour)
			d := NewDiscoveryService("cloud", "agent-ns", "", tt.excludeLabels, nil, nil, serviceListCache,
				paasClient, fakeDocumentsDiscoveryService{}, fakeApihubClient{}, config.ApiTypeUrlsConfig{}).(*discoveryServiceImpl)
			serviceListCache.handleDiscoveryStart(namespace, workspaceId, tt.scope)

			d.runDiscovery(nil, namespace, workspaceId, true, tt.scope)

			result := serviceListCache.GetServicesList(namespace, workspaceId, tt.scope)
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

func TestServiceListCacheScopeIsolation(t *testing.T) {
	const namespace = "ns"
	const workspaceId = "ws"

	cache := NewServiceListCache(time.Hour)

	miss := cache.GetServicesList(namespace, workspaceId, view.DiscoveryRequest{Services: []string{"a"}, Labels: []string{"k=v"}})
	if miss.Status != view.StatusNone || len(miss.RequestedServices) != 0 || len(miss.RequestedLabels) != 0 {
		t.Fatalf("cache miss = %+v, want status none and empty requested fields", miss)
	}

	unscoped := view.DiscoveryRequest{}
	servicesOnly := view.DiscoveryRequest{Services: []string{"svc-a", "svc-b"}}
	labelsOnly := view.DiscoveryRequest{Labels: []string{"tier=api", "app.kubernetes.io/part-of=abc"}}
	combined := view.DiscoveryRequest{Services: []string{"svc-a"}, Labels: []string{"tier=api"}}

	cache.handleDiscoveryStart(namespace, workspaceId, unscoped)
	cache.addService(namespace, workspaceId, unscoped, view.Service{Id: "unscoped-svc", Name: "unscoped-svc"})
	cache.setResultStatus(namespace, workspaceId, unscoped, view.StatusComplete, "")

	cache.handleDiscoveryStart(namespace, workspaceId, servicesOnly)
	cache.addService(namespace, workspaceId, servicesOnly, view.Service{Id: "svc-only", Name: "svc-only"})
	cache.setResultStatus(namespace, workspaceId, servicesOnly, view.StatusComplete, "")

	cache.handleDiscoveryStart(namespace, workspaceId, labelsOnly)
	cache.addService(namespace, workspaceId, labelsOnly, view.Service{Id: "labels-only", Name: "labels-only"})
	cache.setResultStatus(namespace, workspaceId, labelsOnly, view.StatusComplete, "")

	cache.handleDiscoveryStart(namespace, workspaceId, combined)
	cache.addService(namespace, workspaceId, combined, view.Service{Id: "combined-svc", Name: "combined-svc"})
	cache.setResultStatus(namespace, workspaceId, combined, view.StatusComplete, "")

	gotUnscoped := cache.GetServicesList(namespace, workspaceId, view.DiscoveryRequest{Services: []string{}, Labels: []string{}})
	if len(gotUnscoped.Services) != 1 || gotUnscoped.Services[0].Id != "unscoped-svc" {
		t.Errorf("unscoped services = %+v, want [unscoped-svc]", gotUnscoped.Services)
	}
	rawResp, err := json.Marshal(view.ServiceListResponse{
		Services:          gotUnscoped.Services,
		Status:            gotUnscoped.Status,
		RequestedServices: gotUnscoped.RequestedServices,
		RequestedLabels:   gotUnscoped.RequestedLabels,
	})
	if err != nil {
		t.Fatal(err)
	}
	var decoded map[string]interface{}
	if err := json.Unmarshal(rawResp, &decoded); err != nil {
		t.Fatal(err)
	}
	if _, ok := decoded["requestedServices"]; ok {
		t.Errorf("unscoped response unexpectedly includes requestedServices: %s", rawResp)
	}
	if _, ok := decoded["requestedLabels"]; ok {
		t.Errorf("unscoped response unexpectedly includes requestedLabels: %s", rawResp)
	}

	gotServices := cache.GetServicesList(namespace, workspaceId, view.DiscoveryRequest{Services: []string{"svc-b", "svc-a", "svc-a"}})
	if len(gotServices.Services) != 1 || gotServices.Services[0].Id != "svc-only" {
		t.Errorf("services-only = %+v, want [svc-only]", gotServices.Services)
	}
	if !slices.Equal(gotServices.RequestedServices, servicesOnly.Services) || len(gotServices.RequestedLabels) != 0 {
		t.Errorf("services-only echoed scope = (%v, %v), want (%v, nil)", gotServices.RequestedServices, gotServices.RequestedLabels, servicesOnly.Services)
	}

	gotLabels := cache.GetServicesList(namespace, workspaceId, view.DiscoveryRequest{Labels: []string{"app.kubernetes.io/part-of=abc", "tier=api", "tier=api"}})
	if len(gotLabels.Services) != 1 || gotLabels.Services[0].Id != "labels-only" {
		t.Errorf("labels-only = %+v, want [labels-only]", gotLabels.Services)
	}
	if len(gotLabels.RequestedServices) != 0 || !slices.Equal(gotLabels.RequestedLabels, labelsOnly.Labels) {
		t.Errorf("labels-only echoed scope = (%v, %v), want (nil, %v)", gotLabels.RequestedServices, gotLabels.RequestedLabels, labelsOnly.Labels)
	}

	gotCombined := cache.GetServicesList(namespace, workspaceId, combined)
	if len(gotCombined.Services) != 1 || gotCombined.Services[0].Id != "combined-svc" {
		t.Errorf("combined = %+v, want [combined-svc]", gotCombined.Services)
	}
	if !slices.Equal(gotCombined.RequestedServices, combined.Services) || !slices.Equal(gotCombined.RequestedLabels, combined.Labels) {
		t.Errorf("combined echoed scope = (%v, %v), want (%v, %v)", gotCombined.RequestedServices, gotCombined.RequestedLabels, combined.Services, combined.Labels)
	}
}
