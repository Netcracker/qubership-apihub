package utils

import (
	"context"
	"errors"
	"fmt"
)

// WrapContextError keeps a context failure reachable through errors.Is when the aborted call reports
// something else. The original error stays in the message, because it names the operation that actually broke.
func WrapContextError(ctx context.Context, err error) error {
	if err == nil {
		return nil
	}
	ctxErr := ctx.Err()
	if ctxErr == nil || errors.Is(err, ctxErr) {
		return err
	}
	return fmt.Errorf("%v: %w", err, ctxErr)
}
