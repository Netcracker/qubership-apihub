package view

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseVersionStatuses(t *testing.T) {
	t.Run("empty list returns nil", func(t *testing.T) {
		statuses, err := ParseVersionStatuses(nil)
		require.NoError(t, err)
		assert.Nil(t, statuses)
	})

	t.Run("single valid status", func(t *testing.T) {
		statuses, err := ParseVersionStatuses([]string{"release"})
		require.NoError(t, err)
		assert.Equal(t, []string{"release"}, statuses)
	})

	t.Run("normalises status to lowercase", func(t *testing.T) {
		statuses, err := ParseVersionStatuses([]string{"Release", "DRAFT"})
		require.NoError(t, err)
		assert.Equal(t, []string{"release", "draft"}, statuses)
	})

	t.Run("multiple valid statuses", func(t *testing.T) {
		statuses, err := ParseVersionStatuses([]string{"draft", "release"})
		require.NoError(t, err)
		assert.Equal(t, []string{"draft", "release"}, statuses)
	})

	t.Run("unknown status returns error", func(t *testing.T) {
		_, err := ParseVersionStatuses([]string{"draft", "invalid"})
		require.Error(t, err)
		var invalidStatusErr *InvalidVersionStatusError
		require.ErrorAs(t, err, &invalidStatusErr)
		assert.Equal(t, "invalid", invalidStatusErr.Value)
	})
}
