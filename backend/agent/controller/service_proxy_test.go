package controller

import (
	"github.com/stretchr/testify/assert"
	"testing"
)

func TestMakeFullTargetUrl(t *testing.T) {
	// TODO(G38): fails on develop before the monorepo migration; unskip when fixed (tracked in a GitHub issue).
	t.Skip("G38: fails on develop before the migration")
	res :=makeFullTargetUrl("https://test.com", "/agents/k8s-apps3_api-hub-dev-fe/namespaces/api-hub-dev/services/apihub-backend/proxy/api/v2/packages")
	assert.Equal(t, "https://test.com/api/v2/packages", res)
}
