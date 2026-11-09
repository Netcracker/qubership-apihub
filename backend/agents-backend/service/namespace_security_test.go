package service

import (
	"context"
	"errors"
	"net/http"
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/agents-backend/client"
	"github.com/Netcracker/qubership-apihub/backend/agents-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/agents-backend/view"
)

type stubAgentService struct {
	AgentService
	agent *view.AgentInstance
	err   error
}

func (s *stubAgentService) GetAgent(string) (*view.AgentInstance, error) {
	return s.agent, s.err
}

type nilNamespacesAgentClient struct {
	client.AgentClient
}

func (c nilNamespacesAgentClient) GetNamespaces(context.Context, string) (*view.AgentNamespaces, error) {
	return nil, nil // 404 from the agent
}

// Regression for issue #1027: GetNamespaces returns (nil, nil) on 404 and
// StartAuthSecurityCheckProcess iterated namespaces.Namespaces without a nil
// check, so the request ended in a recovered panic (500) instead of a
// namespace-not-found answer.
func TestStartAuthSecurityCheckProcessReturnsNotFoundWhenAgentHasNoNamespaces(t *testing.T) {
	s := &namespaceSecurityServiceImpl{
		agentService: &stubAgentService{agent: &view.AgentInstance{AgentId: "agent-1", AgentUrl: "http://agent"}},
		agentClient:  nilNamespacesAgentClient{},
	}

	processId, err := s.StartAuthSecurityCheckProcess(context.Background(), view.StartNamespaceSecurityCheckReq{
		AgentId:     "agent-1",
		Namespace:   "ns",
		WorkspaceId: "ws",
	})
	if processId != "" {
		t.Fatalf("processId = %q, want empty", processId)
	}
	var customErr *exception.CustomError
	if !errors.As(err, &customErr) {
		t.Fatalf("err = %v, want *exception.CustomError", err)
	}
	if customErr.Status != http.StatusNotFound {
		t.Errorf("status = %d, want %d", customErr.Status, http.StatusNotFound)
	}
	if customErr.Code != exception.NamespaceNotFound {
		t.Errorf("code = %q, want %q", customErr.Code, exception.NamespaceNotFound)
	}
}
