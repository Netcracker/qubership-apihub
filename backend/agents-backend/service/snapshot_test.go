package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/agents-backend/client"
	"github.com/Netcracker/qubership-apihub/backend/agents-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/agents-backend/utils"
	"github.com/Netcracker/qubership-apihub/backend/agents-backend/view"
)

func TestServiceWithChangesErrorFlagsFromVersionContent(t *testing.T) {
	tests := []struct {
		name                       string
		payload                    string
		expectedHasErrors          bool
		expectedChangelogHasErrors *bool // nil means the key must be absent from the response
	}{
		{"both true", `{"hasErrors":true,"changelogHasErrors":true}`, true, boolPtr(true)},
		{"build error only", `{"hasErrors":true,"changelogHasErrors":false}`, true, boolPtr(false)},
		{"changelog error only", `{"hasErrors":false,"changelogHasErrors":true}`, false, boolPtr(true)},
		{"changelog flag omitted", `{"hasErrors":true}`, true, nil},
		{"changelog flag null", `{"hasErrors":false,"changelogHasErrors":null}`, false, nil},
		{"older apihub payload", `{"packageId":"pkg","version":"v1"}`, false, nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var v view.VersionContent
			if err := json.Unmarshal([]byte(tt.payload), &v); err != nil {
				t.Fatalf("unmarshal failed: %v", err)
			}
			data, err := json.Marshal(view.ServiceWithChanges{
				HasErrors:          v.HasErrors,
				ChangelogHasErrors: v.ChangelogHasErrors,
			})
			if err != nil {
				t.Fatalf("marshal failed: %v", err)
			}
			var m map[string]interface{}
			if err := json.Unmarshal(data, &m); err != nil {
				t.Fatalf("unmarshal response failed: %v", err)
			}
			if got, ok := m["hasErrors"]; !ok || got != tt.expectedHasErrors {
				t.Errorf("hasErrors = %v (present=%v), want %v", got, ok, tt.expectedHasErrors)
			}
			got, ok := m["changelogHasErrors"]
			if tt.expectedChangelogHasErrors == nil {
				if ok {
					t.Errorf("changelogHasErrors = %v, want key absent: %s", got, data)
				}
				return
			}
			if !ok || got != *tt.expectedChangelogHasErrors {
				t.Errorf("changelogHasErrors = %v (present=%v), want %v", got, ok, *tt.expectedChangelogHasErrors)
			}
		})
	}
}

func boolPtr(b bool) *bool { return &b }

type systemInfoApihubClient struct {
	client.ApihubClient
	info  *view.ApihubSystemInfo
	err   error
	calls int
}

func (c *systemInfoApihubClient) GetSystemInfo(ctx context.Context) (*view.ApihubSystemInfo, error) {
	c.calls++
	return c.info, c.err
}

func TestGetValidationRulesSeverity(t *testing.T) {
	t.Run("server build does not call system info", func(t *testing.T) {
		apihubClient := &systemInfoApihubClient{err: errors.New("must not be called")}
		s := &snapshotServiceImpl{apihubClient: apihubClient}
		severity, err := s.getValidationRulesSeverity(context.Background(), false)
		if err != nil || severity != nil {
			t.Errorf("got (%+v, %v), want (nil, nil)", severity, err)
		}
		if apihubClient.calls != 0 {
			t.Errorf("GetSystemInfo calls = %d, want 0", apihubClient.calls)
		}
	})
	t.Run("client build fails when system info fails", func(t *testing.T) {
		apihubClient := &systemInfoApihubClient{err: errors.New("connection refused")}
		s := &snapshotServiceImpl{apihubClient: apihubClient}
		severity, err := s.getValidationRulesSeverity(context.Background(), true)
		customErr := assertCustomError(t, err, exception.ApihubSystemInfoUnavailable)
		if customErr.Debug != "connection refused" {
			t.Errorf("debug = %q, want the cause", customErr.Debug)
		}
		if severity != nil {
			t.Errorf("severity = %+v, want nil", severity)
		}
	})

	tests := []struct {
		name               string
		info               *view.ApihubSystemInfo
		expectedBrokenRefs string // empty means an InvalidValidationRulesSeverity error is expected
	}{
		{"error", &view.ApihubSystemInfo{ValidationRulesSeverity: &view.ValidationRulesSeverity{BrokenRefs: view.BrokenRefsSeverityError}}, view.BrokenRefsSeverityError},
		{"warning", &view.ApihubSystemInfo{ValidationRulesSeverity: &view.ValidationRulesSeverity{BrokenRefs: view.BrokenRefsSeverityWarning}}, view.BrokenRefsSeverityWarning},
		{"nil system info", nil, ""},
		{"older apihub without severity", &view.ApihubSystemInfo{}, ""},
		{"empty value", &view.ApihubSystemInfo{ValidationRulesSeverity: &view.ValidationRulesSeverity{}}, ""},
		{"unsupported value", &view.ApihubSystemInfo{ValidationRulesSeverity: &view.ValidationRulesSeverity{BrokenRefs: "info"}}, ""},
	}
	for _, tt := range tests {
		t.Run("client build, "+tt.name, func(t *testing.T) {
			apihubClient := &systemInfoApihubClient{info: tt.info}
			s := &snapshotServiceImpl{apihubClient: apihubClient}
			severity, err := s.getValidationRulesSeverity(context.Background(), true)
			if apihubClient.calls != 1 {
				t.Errorf("GetSystemInfo calls = %d, want 1", apihubClient.calls)
			}
			if tt.expectedBrokenRefs == "" {
				assertCustomError(t, err, exception.InvalidValidationRulesSeverity)
				if severity != nil {
					t.Errorf("severity = %+v, want nil", severity)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if severity == nil || severity.BrokenRefs != tt.expectedBrokenRefs {
				t.Errorf("severity = %+v, want brokenRefs %q", severity, tt.expectedBrokenRefs)
			}
		})
	}
}

// snapshotApihubClient finds every package startSnapshot looks up, so no package is created.
type snapshotApihubClient struct {
	systemInfoApihubClient
	kinds map[string]view.PackageKind // packages that are not groups, by id
}

func (c *snapshotApihubClient) GetPackageById(ctx context.Context, id string) (*view.SimplePackage, error) {
	kind, ok := c.kinds[id]
	if !ok {
		kind = view.KindGroup
	}
	return &view.SimplePackage{Id: id, Kind: string(kind)}, nil
}

func (c *snapshotApihubClient) Publish(ctx context.Context, config view.BuildConfig, src []byte, clientBuild bool, builderId string, saveSources bool, dependencies []string) (string, error) {
	return config.PublishId, nil
}

// failingAgentClient ends each service publishing worker of startSnapshot at its first call. The dashboard
// publish that follows goes through the no-op Publish of snapshotApihubClient.
type failingAgentClient struct {
	client.AgentClient
}

func (c failingAgentClient) GetServiceSpecification(ctx context.Context, namespace string, workspaceId string, serviceId string, fileId string, agentUrl string, discoveryServices string) ([]byte, error) {
	return nil, errors.New("agent is not available in tests")
}

type fixedUrlSystemInfoService struct {
	SystemInfoService
}

func (s fixedUrlSystemInfoService) GetApihubUrl() string {
	return "https://apihub.example.com"
}

func TestStartSnapshotPropagatesValidationRulesSeverity(t *testing.T) {
	const (
		namespace   = "ns"
		workspaceId = "ws"
		cloudName   = "cloud"
	)
	services := []view.Service{
		{Id: "svc-a", Documents: []view.Document{{FileId: "a.json"}}, Baseline: &view.Baseline{PackageId: "ws.svc-a"}},
		{Id: "svc-b", Documents: []view.Document{{FileId: "b.json"}}, Baseline: &view.Baseline{PackageId: "ws.svc-b"}},
		{Id: "svc-c", Documents: []view.Document{{FileId: "c.json"}}, Baseline: &view.Baseline{PackageId: "ws.svc-c"}},
	}
	groupId := fmt.Sprintf("%s.%s.%s.%s", workspaceId, view.DefaultSnapshotsGroupAlias, utils.ToId(cloudName), utils.ToId(namespace))
	kinds := map[string]view.PackageKind{view.MakeSnapshotDashboardIdByGroupId(groupId): view.KindDashbord}
	for _, svc := range services {
		kinds[groupId+"."+utils.ToId(svc.Id)] = view.KindPackage
	}

	tests := []struct {
		name               string
		promote            bool
		clientBuild        bool
		expectedBrokenRefs string // empty means the configs must not carry a severity
	}{
		{"promote, client build", true, true, view.BrokenRefsSeverityError},
		{"snapshot, client build", false, true, view.BrokenRefsSeverityError},
		{"snapshot, server build", false, false, ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			apihubClient := &snapshotApihubClient{
				systemInfoApihubClient: systemInfoApihubClient{info: &view.ApihubSystemInfo{
					ValidationRulesSeverity: &view.ValidationRulesSeverity{BrokenRefs: view.BrokenRefsSeverityError},
				}},
				kinds: kinds,
			}
			s := &snapshotServiceImpl{
				systemInfoService: fixedUrlSystemInfoService{},
				apihubClient:      apihubClient,
				agentClient:       failingAgentClient{},
			}
			snapshotDTO := view.CreateSnapshotDTO{
				CloudName:     cloudName,
				Promote:       tt.promote,
				ClientBuild:   tt.clientBuild,
				VersionStatus: string(view.DraftStatus),
			}
			resp, err := s.startSnapshot(context.Background(), namespace, workspaceId, "v1", services, snapshotDTO)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(resp.Services) != len(services) {
				t.Fatalf("services = %d, want %d", len(resp.Services), len(services))
			}
			for _, config := range resp.Services {
				if tt.expectedBrokenRefs == "" {
					if config.ValidationRulesSeverity != nil {
						t.Errorf("%s: validationRulesSeverity = %+v, want nil", config.ServiceId, config.ValidationRulesSeverity)
					}
					continue
				}
				if config.ValidationRulesSeverity == nil || config.ValidationRulesSeverity.BrokenRefs != tt.expectedBrokenRefs {
					t.Errorf("%s: validationRulesSeverity = %+v, want brokenRefs %q", config.ServiceId, config.ValidationRulesSeverity, tt.expectedBrokenRefs)
				}
			}
			expectedCalls := 0
			if tt.clientBuild {
				expectedCalls = 1
			}
			if apihubClient.calls != expectedCalls {
				t.Errorf("GetSystemInfo calls = %d, want %d", apihubClient.calls, expectedCalls)
			}
		})
	}
}

func TestBuildConfigValidationRulesSeverityJSON(t *testing.T) {
	tests := []struct {
		name     string
		severity *view.ValidationRulesSeverity
	}{
		{"server build omits the key", nil},
		{"client build carries brokenRefs", &view.ValidationRulesSeverity{BrokenRefs: view.BrokenRefsSeverityError}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data, err := json.Marshal(view.BuildConfig{ValidationRulesSeverity: tt.severity})
			if err != nil {
				t.Fatalf("marshal failed: %v", err)
			}
			var m map[string]interface{}
			if err := json.Unmarshal(data, &m); err != nil {
				t.Fatalf("unmarshal failed: %v", err)
			}
			got, ok := m["validationRulesSeverity"]
			if tt.severity == nil {
				if ok {
					t.Errorf("validationRulesSeverity = %v, want key absent: %s", got, data)
				}
				return
			}
			gotMap, isMap := got.(map[string]interface{})
			if !isMap || gotMap["brokenRefs"] != tt.severity.BrokenRefs {
				t.Errorf("validationRulesSeverity = %v, want brokenRefs %q", got, tt.severity.BrokenRefs)
			}
		})
	}
}

func assertCustomError(t *testing.T, err error, expectedCode string) *exception.CustomError {
	t.Helper()
	var customErr *exception.CustomError
	if !errors.As(err, &customErr) {
		t.Fatalf("error = %v, want *exception.CustomError", err)
	}
	if customErr.Code != expectedCode {
		t.Errorf("code = %q, want %q", customErr.Code, expectedCode)
	}
	if customErr.Status != http.StatusFailedDependency {
		t.Errorf("status = %d, want %d", customErr.Status, http.StatusFailedDependency)
	}
	return customErr
}

type getSnapshotApihubClient struct {
	client.ApihubClient
	versionContent *view.VersionContent
	versionErr     error
	references     *view.VersionReferences
	referencesErr  error
	packagesById   map[string]*view.SimplePackage

	mu                 sync.Mutex
	requestedVersionOf []string
}

func (c *getSnapshotApihubClient) GetVersion(_ context.Context, id string, _ string) (*view.VersionContent, error) {
	c.mu.Lock()
	c.requestedVersionOf = append(c.requestedVersionOf, id)
	c.mu.Unlock()
	return c.versionContent, c.versionErr
}

func (c *getSnapshotApihubClient) GetVersionReferences(context.Context, string, string) (*view.VersionReferences, error) {
	return c.references, c.referencesErr
}

func (c *getSnapshotApihubClient) GetPackageById(_ context.Context, id string) (*view.SimplePackage, error) {
	if pkg, ok := c.packagesById[id]; ok {
		return pkg, nil
	}
	return nil, nil // 404 from APIHUB: the package does not exist
}

// Regression for issue #1027: GetVersionReferences returns (nil, nil) on 404
// and GetSnapshot read len(references.References) without a nil check, so the
// request ended in a recovered panic (500) instead of a not-found answer.
func TestGetSnapshotReturnsNilWhenReferencesAreNil(t *testing.T) {
	s := &snapshotServiceImpl{
		systemInfoService: fixedUrlSystemInfoService{},
		apihubClient: &getSnapshotApihubClient{
			versionContent: &view.VersionContent{Version: "1.0.0"},
			references:     nil,
		},
	}

	snapshot, err := s.GetSnapshot(context.Background(), "ns", "ws", "1.0.0", "cloud")
	if err != nil {
		t.Fatalf("err = %v, want nil", err)
	}
	if snapshot != nil {
		t.Fatalf("snapshot = %+v, want nil", snapshot)
	}
}

// Regression for issue #1027: when a package referenced by the snapshot has
// been deleted, GetPackageById returns (nil, nil), and the goroutine went on to
// request the package version and dereference pkg.Name. utils.SafeAsync
// recovered the panic, so the response looked the same. The missing package is
// now skipped before its version is requested, the same way as a missing
// version, and the rest of the snapshot is returned.
func TestGetSnapshotSkipsReferencedPackageNotFound(t *testing.T) {
	references := &view.VersionReferences{
		References: []view.VersionReference{{PackageRef: "ref-1"}},
		Packages: map[string]view.PackageVersionRef{
			"ref-1": {RefPackageId: "deleted-package", RefPackageVersion: "1.0.0"},
		},
	}
	apihubClient := &getSnapshotApihubClient{
		versionContent: &view.VersionContent{Version: "1.0.0"},
		references:     references,
	}
	s := &snapshotServiceImpl{
		systemInfoService: fixedUrlSystemInfoService{},
		apihubClient:      apihubClient,
	}

	snapshot, err := s.GetSnapshot(context.Background(), "ns", "ws", "1.0.0", "cloud")
	if err != nil {
		t.Fatalf("err = %v, want nil", err)
	}
	if snapshot == nil {
		t.Fatal("snapshot = nil, want the snapshot without the missing package")
	}
	for _, id := range apihubClient.requestedVersionOf {
		if id == "deleted-package" {
			t.Fatal("GetVersion was called for 'deleted-package', want the package skipped first")
		}
	}
	for _, service := range snapshot.Services {
		if service.PackageId == "deleted-package" {
			t.Fatalf("snapshot.Services = %+v, want no entry for 'deleted-package'", snapshot.Services)
		}
	}
}

type nilListServicesAgentClient struct {
	client.AgentClient
}

func (c nilListServicesAgentClient) ListServices(context.Context, string, string, string, string) (*view.ServiceListResponse, error) {
	return nil, nil // 404 from the agent
}

// Regression for issue #1027: ListServices returns (nil, nil) on 404 and
// CreateSnapshot read serviceListResponse.Status without a nil check, so the
// request ended in a recovered panic (500).
func TestCreateSnapshotFailsWhenAgentReturnsNoServices(t *testing.T) {
	s := &snapshotServiceImpl{
		apihubClient: &getSnapshotApihubClient{
			packagesById: map[string]*view.SimplePackage{
				"ws": {Id: "ws", Kind: string(view.KindWorkspace)},
			},
		},
		agentClient: nilListServicesAgentClient{},
	}

	resp, err := s.CreateSnapshot(context.Background(), "ns", "ws", "1.0.0", view.CreateSnapshotDTO{})
	if err == nil {
		t.Fatal("err = nil, want an error when the agent returns no services")
	}
	if !strings.Contains(err.Error(), "agent returned no services") {
		t.Fatalf("err = %v, want it to say that the agent returned no services", err)
	}
	if resp != nil {
		t.Fatalf("resp = %+v, want nil", resp)
	}
}
