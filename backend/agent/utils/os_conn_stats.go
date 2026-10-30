package utils

import (
	"bufio"
	"fmt"
	"os"
	"runtime"
	"strconv"
	"strings"
	"sync"

	log "github.com/sirupsen/logrus"
)

const establishedTCPState = "01"

var osStatsUnsupportedLogOnce sync.Once

// OSConnStats holds process-level open file descriptor and established TCP connection counts.
type OSConnStats struct {
	OpenFDs        int
	FDLimitSoft    uint64
	FDLimitHard    uint64
	EstablishedTCP int
}

// GetOSConnStatsSnapshot reads process-level open file descriptor and established TCP
// connection counts from /proc. This is Linux-specific; the agent always runs as a Linux
// container in production, so on other platforms it returns a zero-value snapshot without
// an error.
func GetOSConnStatsSnapshot() (OSConnStats, error) {
	if runtime.GOOS != "linux" {
		osStatsUnsupportedLogOnce.Do(func() {
			log.Debug("OS-level connection stats are only available on Linux; skipping")
		})
		return OSConnStats{}, nil
	}

	fdCount, err := openFDCount()
	if err != nil {
		return OSConnStats{}, fmt.Errorf("failed to read open file descriptor count: %w", err)
	}
	softLimit, hardLimit, err := fdLimit()
	if err != nil {
		return OSConnStats{}, fmt.Errorf("failed to read file descriptor limit: %w", err)
	}
	establishedCount, err := establishedTCPCount()
	if err != nil {
		return OSConnStats{}, fmt.Errorf("failed to read established TCP connection count: %w", err)
	}

	return OSConnStats{
		OpenFDs:        fdCount,
		FDLimitSoft:    softLimit,
		FDLimitHard:    hardLimit,
		EstablishedTCP: establishedCount,
	}, nil
}

func openFDCount() (int, error) {
	entries, err := os.ReadDir("/proc/self/fd")
	if err != nil {
		return 0, err
	}
	return len(entries), nil
}

func fdLimit() (soft, hard uint64, err error) {
	f, err := os.Open("/proc/self/limits")
	if err != nil {
		return 0, 0, err
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "Max open files") {
			continue
		}
		fields := strings.Fields(strings.TrimPrefix(line, "Max open files"))
		if len(fields) < 2 {
			return 0, 0, fmt.Errorf("unexpected format of Max open files line: %q", line)
		}
		soft, err = parseLimitValue(fields[0])
		if err != nil {
			return 0, 0, err
		}
		hard, err = parseLimitValue(fields[1])
		if err != nil {
			return 0, 0, err
		}
		return soft, hard, nil
	}
	if err := scanner.Err(); err != nil {
		return 0, 0, err
	}
	return 0, 0, fmt.Errorf("Max open files line not found in /proc/self/limits")
}

func parseLimitValue(v string) (uint64, error) {
	if v == "unlimited" {
		return 0, nil
	}
	return strconv.ParseUint(v, 10, 64)
}

func establishedTCPCount() (int, error) {
	total := 0
	for _, path := range []string{"/proc/net/tcp", "/proc/net/tcp6"} {
		count, err := countEstablishedInFile(path)
		if err != nil {
			if os.IsNotExist(err) {
				continue
			}
			return 0, err
		}
		total += count
	}
	return total, nil
}

func countEstablishedInFile(path string) (int, error) {
	f, err := os.Open(path)
	if err != nil {
		return 0, err
	}
	defer f.Close()

	count := 0
	scanner := bufio.NewScanner(f)
	scanner.Scan() // skip header line
	for scanner.Scan() {
		fields := strings.Fields(scanner.Text())
		if len(fields) < 4 {
			continue
		}
		if fields[3] == establishedTCPState {
			count++
		}
	}
	return count, scanner.Err()
}
