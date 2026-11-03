package artifact

import (
	"errors"
	"fmt"
	"io"
	"os"
)

const filePermissions = 0o600

// WriteNew never overwrites evidence and removes an incomplete output on failure.
func WriteNew(path string, write func(io.Writer) error) (err error) {
	f, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, filePermissions)
	if err != nil {
		return err
	}
	defer func() {
		err = errors.Join(err, f.Close())
		if err != nil {
			if removeErr := os.Remove(path); removeErr != nil {
				err = errors.Join(err, fmt.Errorf("cannot remove incomplete output: %w", removeErr))
			}
		}
	}()
	return write(f)
}
