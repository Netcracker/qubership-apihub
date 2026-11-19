package entity

import (
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/portal-backend/view"
	"github.com/stretchr/testify/require"
)

func TestMakeDdlChangedEntityViewParsesBareChangesArray(t *testing.T) {
	ent := &DDLContractComparisonEntity{
		DdlEntityId: "t1",
		Changes: []interface{}{
			map[string]interface{}{"action": "add", "description": "Column added", "severity": "breaking"},
			map[string]interface{}{"description": "Comment updated", "severity": "non-breaking"},
		},
	}

	result := MakeDdlChangedEntityView(ent, true)
	require.Len(t, result.Changes, 2)

	//the changes must come out as typed structs: GetSingleOperationChangeCommon only type-asserts,
	//so a raw map would silently render as empty cells in the report
	added := view.GetSingleOperationChangeCommon(result.Changes[0])
	require.Equal(t, "Column added", added.Description)
	require.Equal(t, "breaking", added.Severity)
	require.Equal(t, "add", added.Action)

	//a change without an action still has to carry its description and severity
	noAction := view.GetSingleOperationChangeCommon(result.Changes[1])
	require.Equal(t, "Comment updated", noAction.Description)
	require.Equal(t, "non-breaking", noAction.Severity)
	require.Empty(t, noAction.Action)
}

func TestMakeDdlChangedEntityViewOmitsChangesUnlessRequested(t *testing.T) {
	ent := &DDLContractComparisonEntity{
		DdlEntityId: "t1",
		Changes: []interface{}{
			map[string]interface{}{"action": "add", "description": "Column added", "severity": "breaking"},
		},
	}

	require.Nil(t, MakeDdlChangedEntityView(ent, false).Changes)
}

func TestMakeDdlChangedEntityViewHandlesUnreadableChanges(t *testing.T) {
	tests := []struct {
		name    string
		changes interface{}
	}{
		{name: "nil changes", changes: nil},
		{name: "changes is not an array", changes: map[string]interface{}{"changes": []interface{}{}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ent := &DDLContractComparisonEntity{
				DdlEntityId:    "t1",
				Changes:        tt.changes,
				ChangesSummary: view.ChangeSummary{Annotation: 1},
			}

			result := MakeDdlChangedEntityView(ent, true)
			require.Empty(t, result.Changes)
			//the entity itself and its counts must survive so the report can still report it
			require.Equal(t, 1, result.ChangeSummary.Annotation)
			require.NotNil(t, result.DdlEntityData)
		})
	}
}
