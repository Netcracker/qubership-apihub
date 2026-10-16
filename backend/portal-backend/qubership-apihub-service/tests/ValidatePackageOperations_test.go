package tests

import (
	"errors"
	"fmt"
	"slices"
	"strings"
	"testing"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

func TestValidateObjectErrors(t *testing.T) {
	t.Run("UpdateOperationGroupReq with nil operations", func(t *testing.T) {
		var req view.UpdateOperationGroupReq
		assertMissingParams(t, req, nil)
	})

	t.Run("UpdateOperationGroupReq", func(t *testing.T) {
		var req view.UpdateOperationGroupReq
		groupOperations := make([]view.GroupOperations, 2)
		req.Operations = &groupOperations
		assertMissingParams(t, req, indexedParams("operations", 2, "operationId"))
	})

	t.Run("PackageOperationsFile", func(t *testing.T) {
		var file view.PackageOperationsFile
		file.Operations = make([]view.Operation, 2)
		assertMissingParams(t, file, indexedParams("operations", 2,
			"operationId", "title", "apiType", "apiKind", "metadata", "apiAudience", "documentId", "versionInternalDocumentId"))
	})

	t.Run("ChangelogInfoFile", func(t *testing.T) {
		info := view.MakeChangelogInfoFileView(view.PackageInfoFile{})
		assertMissingParams(t, info, []string{"packageId", "version", "previousVersionPackageId", "previousVersion"})
	})

	t.Run("PackageComparisonsFile", func(t *testing.T) {
		var file view.PackageComparisonsFile
		comparisons := make([]view.VersionComparison, 2)
		for i := range comparisons {
			comparisons[i].OperationTypes = make([]view.OperationType, 2)
		}
		file.Comparisons = comparisons
		var expected []string
		for i := range comparisons {
			expected = append(expected, indexedParams(fmt.Sprintf("comparisons[%d].operationTypes", i), 2, "apiType")...)
		}
		assertMissingParams(t, file, expected)
	})

	t.Run("BuilderNotificationsFile has no required fields", func(t *testing.T) {
		var file view.BuilderNotificationsFile
		file.Notifications = make([]view.BuilderNotification, 2)
		assertMissingParams(t, file, nil)
	})

	t.Run("PackageDocumentsFile", func(t *testing.T) {
		var file view.PackageDocumentsFile
		file.Documents = make([]view.PackageDocument, 2)
		assertMissingParams(t, file, indexedParams("documents", 2,
			"fileId", "type", "slug", "title", "operationIds", "filename"))
	})
}

func indexedParams(prefix string, count int, fields ...string) []string {
	result := make([]string, 0, count*len(fields))
	for i := 0; i < count; i++ {
		for _, field := range fields {
			result = append(result, fmt.Sprintf("%s[%d].%s", prefix, i, field))
		}
	}
	return result
}

func assertMissingParams(t *testing.T, object interface{}, expected []string) {
	t.Helper()
	err := utils.ValidateObject(object)
	if len(expected) == 0 {
		if err != nil {
			t.Fatalf("expected no validation error, got: %v", err)
		}
		return
	}
	if err == nil {
		t.Fatalf("expected missing params %v, got no error", expected)
	}
	var customErr *exception.CustomError
	if !errors.As(err, &customErr) || customErr.Code != exception.RequiredParamsMissing {
		t.Fatalf("expected %s error, got: %v", exception.RequiredParamsMissing, err)
	}
	params, _ := customErr.Params["params"].(string)
	actual := strings.Split(params, ", ")

	var missing, unexpected []string
	for _, p := range expected {
		if !slices.Contains(actual, p) {
			missing = append(missing, p)
		}
	}
	for _, p := range actual {
		if !slices.Contains(expected, p) {
			unexpected = append(unexpected, p)
		}
	}
	if len(missing) > 0 || len(unexpected) > 0 {
		t.Fatalf("missing params mismatch\n  expected but not reported: %v\n  reported but not expected: %v", missing, unexpected)
	}
}
