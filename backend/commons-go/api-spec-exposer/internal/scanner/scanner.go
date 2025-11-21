package scanner

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/Netcracker/qubership-apihub-commons-go/api-spec-exposer/config"
)

// Scanner handles directory scanning and file discovery
type Scanner struct {
	config          config.DiscoveryConfig
	identifierChain *IdentifierChain
}

// New creates a new scanner instance
func New(cfg config.DiscoveryConfig) *Scanner {
	return &Scanner{
		config: cfg,
		identifierChain: &IdentifierChain{
			identifiers: []Identifier{
				&RestIdentifier{},
				&GraphQLIdentifier{},
				&MarkdownIdentifier{},
				&BasicIdentifier{},
			},
		},
	}
}

// Scan scans the directory and returns discovered specs, warnings, and errors
func (s *Scanner) Scan() ([]config.SpecMetadata, []string, []error) {
	var specs []config.SpecMetadata
	var warnings []string
	var errors []error

	if s.config.ScanDirectory == "" {
		return nil, warnings, []error{fmt.Errorf("scan directory property is empty")}
	}

	info, err := os.Stat(s.config.ScanDirectory)
	if err != nil {
		return nil, warnings, []error{fmt.Errorf("cannot access scan directory: %w", err)}
	}

	if !info.IsDir() {
		return nil, warnings, []error{fmt.Errorf("scan directory is not a directory")}
	}

	err = filepath.WalkDir(s.config.ScanDirectory, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			errors = append(errors, fmt.Errorf("error accessing path %s: %v", path, err))
			return nil // Continue walking
		}

		if d.IsDir() {
			// Check if directory should be excluded
			if s.shouldExclude(path) {
				return filepath.SkipDir
			}
			return nil
		}

		// Check if file should be excluded
		if s.shouldExclude(path) {
			return nil
		}

		content, err := s.readFile(path)
		if err != nil {
			errors = append(errors, fmt.Errorf("cannot read file %s: %w", path, err))
			return nil
		}

		spec, specWarnings, specErrors := s.identifierChain.Identify(path, content)

		warnings = append(warnings, specWarnings...)
		errors = append(errors, specErrors...)

		if spec != nil {
			specs = append(specs, *spec)
		}

		return nil
	})

	if err != nil {
		errors = append(errors, fmt.Errorf("error walking directory: %w", err))
	}

	return specs, warnings, errors
}

func (s *Scanner) shouldExclude(path string) bool {
	// Skip hidden files/directories (starting with .)
	base := filepath.Base(path)
	if strings.HasPrefix(base, ".") {
		return true
	}

	for _, pattern := range s.config.ExcludePatterns {
		matched, err := filepath.Match(pattern, path)
		if err == nil && matched {
			return true
		}

		relPath, err := filepath.Rel(s.config.ScanDirectory, path)
		if err == nil {
			matched, err := filepath.Match(pattern, relPath)
			if err == nil && matched {
				return true
			}
		}
	}

	return false
}

func (s *Scanner) readFile(path string) ([]byte, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("cannot open file: %w", err)
	}
	defer file.Close()

	content, err := io.ReadAll(file)
	if err != nil {
		return nil, fmt.Errorf("cannot read file: %w", err)
	}

	return content, nil
}
