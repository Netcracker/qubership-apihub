package cleanup

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestTestPackageIdLikeFilter(t *testing.T) {
	assert.Equal(t, "QS%-STATIC-TEST-1%", testPackageIdLikeFilter("STATIC-TEST-1"))
	assert.Equal(t, `QS%-100\_percent%`, testPackageIdLikeFilter("100_percent"))
}

func TestTestUserIdLikeFilter(t *testing.T) {
	assert.Equal(t, "%user1atopenmail-com%", testUserIdLikeFilter("user1atopenmail-com"))
	assert.Equal(t, `%foo\_bar%`, testUserIdLikeFilter("foo_bar"))
}

func TestNonemptyStrings(t *testing.T) {
	assert.Equal(t, []string{"a", "b"}, nonemptyStrings([]string{"", "a", "", "b"}))
	assert.Empty(t, nonemptyStrings(nil))
}
