package artifact

import (
	"errors"
	"io"
	"os"
	"path/filepath"
	"testing"
)

func TestWriteNewPreservesEvidenceAndRemovesPartialOutput(t *testing.T) {
	path := filepath.Join(t.TempDir(), "report.json")
	write := func(w io.Writer) error { _, err := io.WriteString(w, "original"); return err }
	if err := WriteNew(path, write); err != nil {
		t.Fatal(err)
	}
	if err := WriteNew(path, write); !errors.Is(err, os.ErrExist) {
		t.Fatalf("expected existing file error: %v", err)
	}
	data, err := os.ReadFile(path)
	if err != nil || string(data) != "original" {
		t.Fatal("existing evidence was modified")
	}
	partial := filepath.Join(t.TempDir(), "partial.json")
	if err := WriteNew(partial, func(w io.Writer) error {
		if _, err := io.WriteString(w, "partial"); err != nil {
			return err
		}
		return errors.New("simulated encoding failure")
	}); err == nil {
		t.Fatal("write failure was swallowed")
	}
	if _, err := os.Stat(partial); !errors.Is(err, os.ErrNotExist) {
		t.Fatal("partial output remains")
	}
}
