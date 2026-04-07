package controller

import (
	"github.com/stretchr/testify/assert"
	"testing"
)

func TestMakeFullTargetUrl(t *testing.T) {
	res := makeFullTargetUrl("https://test.com", "/agents/k8s-apps3_api-hub-dev-fe/namespaces/api-hub-dev/services/apihub-backend/proxy/api/v2/packages")
	assert.Equal(t, "https://test.com/api/v2/packages", res)
}
