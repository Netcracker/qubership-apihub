package main

import (
	"archive/zip"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"analyze-migration/internal/apiutil"
	"analyze-migration/internal/artifact"
)

func main() {
	if err := run(os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(args []string) (err error) {
	const argumentCount = 3
	if len(args) != argumentCount {
		return errors.New("usage: download-archive BUILD_ID sources|result OUTPUT.zip (APIHUB_URL and APIHUB_API_KEY from environment)")
	}
	output := args[2]
	if _, err := os.Lstat(output); err == nil {
		return fmt.Errorf("output already exists: %s", output)
	} else if !errors.Is(err, os.ErrNotExist) {
		return err
	}
	resp, err := apiutil.GetArchive(args[0], args[1])
	if err != nil {
		return err
	}
	defer func() { err = errors.Join(err, resp.Body.Close()) }()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("archive request returned HTTP %d; no archive saved", resp.StatusCode)
	}
	temp, err := os.CreateTemp(filepath.Dir(output), ".archive-*.zip")
	if err != nil {
		return err
	}
	defer func() {
		err = errors.Join(err, temp.Close())
		err = errors.Join(err, os.Remove(temp.Name()))
	}()
	size, err := io.Copy(temp, resp.Body)
	if err != nil {
		return err
	}
	if _, err := zip.NewReader(temp, size); err != nil {
		return fmt.Errorf("response is not a valid ZIP archive: %w", err)
	}
	if _, err := temp.Seek(0, io.SeekStart); err != nil {
		return err
	}
	return artifact.WriteNew(output, func(w io.Writer) error {
		_, err := io.Copy(w, temp)
		return err
	})
}
