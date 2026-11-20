package controller

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/agents-backend/client"
	"github.com/Netcracker/qubership-apihub/backend/agents-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/agents-backend/responder"
	"github.com/Netcracker/qubership-apihub/backend/agents-backend/service"
	"github.com/Netcracker/qubership-apihub/backend/agents-backend/view"
	"github.com/gorilla/mux"
	"github.com/shaj13/go-guardian/v2/auth"
)

const (
	snapshotTestPortalURL = "https://apihub.example"
	snapshotDashboardID   = "workspace.RUNENV.CLOUD.NAMESPACE.SNAPSHOT-DASH"
	snapshotTestRevision  = "@1"
)

func TestGetSnapshotDecodesVersionOnce(t *testing.T) {
	for _, version := range []string{"test space", "test+space", "test%20space", "snapshot café"} {
		t.Run(version, func(t *testing.T) {
			apihub := snapshotApihubClient{version: version}
			snapshots := service.NewSnapshotService(snapshotSystemInfo{}, apihub, nil)
			controller := NewSnapshotController(snapshots, snapshotAgentService{}, responder.NewResponder(true))
			router := mux.NewRouter().SkipClean(true).UseEncodedPath()
			router.HandleFunc("/agents/{agentId}/namespaces/{namespace}/workspaces/{workspaceId}/snapshots/{version}", controller.GetSnapshot)
			request := httptest.NewRequest(http.MethodGet, "/agents/agent/namespaces/namespace/workspaces/workspace/snapshots/"+url.PathEscape(version), nil)
			request = auth.RequestWithUser(auth.NewDefaultUser("tester", "tester", nil, nil), request)
			response := httptest.NewRecorder()

			router.ServeHTTP(response, request)

			if response.Code != http.StatusOK {
				t.Fatalf("status = %d, want %d: %s", response.Code, http.StatusOK, response.Body.String())
			}
			var snapshot view.Snapshot
			if err := json.Unmarshal(response.Body.Bytes(), &snapshot); err != nil {
				t.Fatal(err)
			}
			if snapshot.Version != version+snapshotTestRevision {
				t.Errorf("version = %q, want %q", snapshot.Version, version+snapshotTestRevision)
			}
			wantURL := snapshotTestPortalURL + "/portal/packages/" + snapshotDashboardID + "/" + url.PathEscape(version) + "/overview/summary"
			if snapshot.ViewSnapshotUrl != wantURL {
				t.Errorf("snapshot URL = %q, want %q", snapshot.ViewSnapshotUrl, wantURL)
			}
		})
	}
}

func TestGetSnapshotRejectsInvalidVersionEscape(t *testing.T) {
	controller := NewSnapshotController(nil, nil, responder.NewResponder(true))
	request := mux.SetURLVars(httptest.NewRequest(http.MethodGet, "/", nil), map[string]string{"version": "%zz"})
	response := httptest.NewRecorder()

	controller.GetSnapshot(response, request)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d: %s", response.Code, http.StatusBadRequest, response.Body.String())
	}
	var result exception.CustomError
	if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	if result.Code != exception.InvalidParameter {
		t.Errorf("error code = %q, want %q", result.Code, exception.InvalidParameter)
	}
}

type snapshotApihubClient struct {
	client.ApihubClient
	version string
}

func (c snapshotApihubClient) GetVersion(_ context.Context, packageID, version string) (*view.VersionContent, error) {
	if packageID != snapshotDashboardID || version != c.version {
		return nil, nil
	}
	return &view.VersionContent{Version: version + snapshotTestRevision}, nil
}

func (c snapshotApihubClient) GetVersionReferences(_ context.Context, _, _ string) (*view.VersionReferences, error) {
	return &view.VersionReferences{}, nil
}

type snapshotSystemInfo struct {
	service.SystemInfoService
}

func (snapshotSystemInfo) GetApihubUrl() string {
	return snapshotTestPortalURL
}

type snapshotAgentService struct {
	service.AgentService
}

func (snapshotAgentService) GetAgent(_ string) (*view.AgentInstance, error) {
	return &view.AgentInstance{AgentDeploymentCloud: "cloud"}, nil
}
