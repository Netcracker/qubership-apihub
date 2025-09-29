package service

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"github.com/Netcracker/qubership-api-linter-service/utils"
	"github.com/Netcracker/qubership-api-linter-service/view"
	log "github.com/sirupsen/logrus"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type SpectralExecutor interface {
	LintLocalDoc(docPath string, rulesetPath string) (string, int64, error)
	GetLinterVersion() string
}

func NewSpectralExecutor(spectralBinPath string) (SpectralExecutor, error) {
	spectralVersion, err := detectSpectralVersion(spectralBinPath)
	if err != nil {
		return nil, err
	}
	return &spectralExecutorImpl{spectralBinPath: spectralBinPath, semaphore: utils.NewSemaphore(1), spectralVersion: spectralVersion}, nil
}

type spectralExecutorImpl struct {
	spectralBinPath string
	semaphore       *utils.Semaphore
	spectralVersion string
}

func (s *spectralExecutorImpl) LintLocalDoc(docPath string, rulesetPath string) (string, int64, error) {
	s.semaphore.Acquire()
	defer s.semaphore.Release()

	resultPath := docPath
	if filepath.Ext(resultPath) != "" {
		resultPath = strings.TrimSuffix(resultPath, "."+filepath.Ext(resultPath))
	}
	resultPath += "-result.json"

	var args []string
	args = append(args, "lint")
	args = append(args, docPath)
	args = append(args, "--ruleset")
	args = append(args, rulesetPath)
	if log.GetLevel() == log.TraceLevel {
		args = append(args, "-v")
	} else {
		args = append(args, "-q")
	}
	args = append(args, "--fail-on-unmatched-globs")
	args = append(args, "-f")
	args = append(args, "json")
	args = append(args, "-o.json")
	args = append(args, resultPath)

	limit := time.Minute * 10
	ctx, _ := context.WithDeadline(context.Background(), time.Now().Add(limit))

	cmd := exec.CommandContext(ctx, s.spectralBinPath, args...)
	var out bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr

	start := time.Now()
	var err error

	wg := sync.WaitGroup{}
	wg.Add(1)
	utils.SafeAsync(func() {
		err = cmd.Run()
		wg.Done()
	})
	wg.Wait()

	log.Tracef("stdout: %s", out.String())
	log.Tracef("stderr: %s", stderr.String())

	calculationTime := time.Since(start)
	if err != nil {
		// in case of timeout err is "exit status 1", so need to distinguish context deadline explicitly
		if errors.Is(ctx.Err(), context.DeadlineExceeded) {
			errStr := fmt.Sprintf("lint time exceeded limit(%v)", limit)
			if stderr.String() != "" {
				errStr += " | stderr: " + stderr.String()
			}
			return "", calculationTime.Milliseconds(), errors.New(errStr)
		}

		//spectral process exits with status 1 if validation contains at least one error...
		if err.Error() != "exit status 1" {
			errStr := err.Error()
			if stderr.String() != "" {
				errStr += " | stderr: " + stderr.String()
			}
			return "", calculationTime.Milliseconds(), fmt.Errorf("failed to get Spectral report: %v", errStr)
		}
	}

	return resultPath, calculationTime.Milliseconds(), nil
}

func (s *spectralExecutorImpl) GetLinterVersion() string {
	return s.spectralVersion
}

func detectSpectralVersion(spectralBinPath string) (string, error) {
	if spectralBinPath == "" {
		return "", fmt.Errorf("spectral executor path is not set (SPECTRAL_BIN_PATH env)")
	}
	var spectralVersion string
	args := []string{"--version"}
	cmd := exec.Command(spectralBinPath, args...)
	var out bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr
	err := cmd.Run()
	if err != nil {
		return "", fmt.Errorf("error getting spectral version: %s", err)
	}
	spectralVersion = out.String()
	spectralVersion = strings.TrimSpace(spectralVersion)
	return spectralVersion, nil
}

func calculateSpectralSummary(report []interface{}) view.SpectralResultSummary {
	summary := view.SpectralResultSummary{}
	for _, resultObj := range report {
		if result, ok := resultObj.(map[string]interface{}); ok {
			if severity, exists := result["severity"]; exists {
				if severityInt, ok := severity.(float64); ok {
					switch severityInt {
					case 0:
						summary.ErrorCount += 1
					case 1:
						summary.WarningCount += 1
					case 2:
						summary.InfoCount += 1
					case 3:
						summary.HintCount += 1
					}
				}
			}
		}
	}
	return summary
}
