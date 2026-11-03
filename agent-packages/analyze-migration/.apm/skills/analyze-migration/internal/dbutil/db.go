package dbutil

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
)

var (
	reHost     = regexp.MustCompile(`^[a-zA-Z0-9.:-]+$`)
	rePort     = regexp.MustCompile(`^[0-9]{1,5}$`)
	reDatabase = regexp.MustCompile(`^[a-zA-Z0-9_.-]+$`)
	reSchema   = regexp.MustCompile(`^[a-zA-Z_][a-zA-Z0-9_]*$`)
	reUUID     = regexp.MustCompile(`(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)
	reRevision = regexp.MustCompile(`^(0|[1-9][0-9]*)$`)
)

// Config holds validated PostgreSQL connection parameters.
type Config struct {
	Host     string
	Port     string
	Database string
	User     string
	Schema   string
	SSLMode  string
	PassFile string
	Password string
}

// LoadConfig reads and validates all required PG* env vars.
func LoadConfig() (*Config, error) {
	c := &Config{
		Host:     os.Getenv("PGHOST"),
		Port:     os.Getenv("PGPORT"),
		Database: os.Getenv("PGDATABASE"),
		User:     os.Getenv("PGUSER"),
		Schema:   os.Getenv("DB_SCHEMA"),
		SSLMode:  os.Getenv("PGSSLMODE"),
		PassFile: os.Getenv("PGPASSFILE"),
		Password: os.Getenv("PGPASSWORD"),
	}
	for _, kv := range [][2]string{
		{"PGHOST", c.Host}, {"PGPORT", c.Port}, {"PGDATABASE", c.Database},
		{"PGUSER", c.User}, {"DB_SCHEMA", c.Schema}, {"PGSSLMODE", c.SSLMode},
	} {
		if err := RequireValue(kv[0], kv[1]); err != nil {
			return nil, err
		}
	}
	if !reHost.MatchString(c.Host) {
		return nil, fmt.Errorf("PGHOST must be a hostname or IP address")
	}
	if !rePort.MatchString(c.Port) {
		return nil, fmt.Errorf("invalid PGPORT")
	}
	port, _ := strconv.Atoi(c.Port)
	if port < 1 || port > 65535 {
		return nil, fmt.Errorf("PGPORT is out of range")
	}
	if !reDatabase.MatchString(c.Database) {
		return nil, fmt.Errorf("PGDATABASE must be a database name, not a connection string")
	}
	if !reSchema.MatchString(c.Schema) {
		return nil, fmt.Errorf("invalid DB_SCHEMA")
	}
	switch c.SSLMode {
	case "disable", "allow", "prefer", "require", "verify-ca", "verify-full":
	default:
		return nil, fmt.Errorf("invalid PGSSLMODE")
	}
	if c.PassFile != "" && c.Password != "" {
		return nil, fmt.Errorf("set PGPASSFILE or PGPASSWORD, not both")
	}
	if c.PassFile != "" {
		info, err := os.Stat(c.PassFile)
		if err != nil || info.IsDir() {
			return nil, fmt.Errorf("PGPASSFILE must name an existing readable password file")
		}
	} else if c.Password == "" {
		return nil, fmt.Errorf("set PGPASSFILE or PGPASSWORD for database authentication")
	}
	return c, nil
}

// ValidateUUID returns an error if value is not a canonical UUID.
func ValidateUUID(name, value string) error {
	if !reUUID.MatchString(value) {
		return fmt.Errorf("invalid %s", name)
	}
	return nil
}

// ValidateRevision returns an error if value is not a canonical non-negative integer of at most nine digits.
func ValidateRevision(value string) error {
	if !reRevision.MatchString(value) || len(value) > 9 {
		return fmt.Errorf("revision must be a canonical non-negative integer of at most nine digits")
	}
	return nil
}

// RequireValue returns an error if value is empty or contains CR/LF.
func RequireValue(name, value string) error {
	if value == "" || strings.ContainsAny(value, "\r\n") {
		return fmt.Errorf("missing or invalid %s", name)
	}
	return nil
}

// RunQuery executes sql via psql in a repeatable-read read-only transaction.
// extraSets are additional --set=name=value arguments inserted before --command=BEGIN.
func (c *Config) RunQuery(sql string, extraSets []string) (string, error) {
	if _, err := exec.LookPath("psql"); err != nil {
		return "", fmt.Errorf("psql is unavailable. Install the PostgreSQL client before using DB diagnostics")
	}
	args := []string{
		"--no-psqlrc", "--no-password", "--quiet", "--no-align", "--tuples-only",
		"--host=" + c.Host, "--port=" + c.Port,
		"--dbname=" + c.Database, "--username=" + c.User,
		"--set=ON_ERROR_STOP=1",
		"--set=db_schema=" + c.Schema,
	}
	args = append(args, extraSets...)
	args = append(args,
		"--command=BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;",
		"--file=-",
		"--command=COMMIT;",
	)
	cmd := exec.Command("psql", args...)
	cmd.Stdin = strings.NewReader(sql)

	// Build environment: inherit current process env, then override PG* values.
	envMap := make(map[string]string, 64)
	for _, e := range os.Environ() {
		if i := strings.IndexByte(e, '='); i > 0 {
			envMap[e[:i]] = e[i+1:]
		}
	}
	delete(envMap, "PGSERVICE")
	delete(envMap, "PGPASSWORD")
	delete(envMap, "PGPASSFILE")
	envMap["PGHOST"] = c.Host
	envMap["PGPORT"] = c.Port
	envMap["PGDATABASE"] = c.Database
	envMap["PGUSER"] = c.User
	envMap["PGSSLMODE"] = c.SSLMode
	envMap["PGOPTIONS"] = "-c default_transaction_read_only=on -c statement_timeout=15000 -c lock_timeout=3000 -c idle_in_transaction_session_timeout=15000"
	envMap["PGCONNECT_TIMEOUT"] = "10"
	envMap["PGAPPNAME"] = "apihub-migration-diagnostics"
	if c.PassFile != "" {
		envMap["PGPASSFILE"] = c.PassFile
	} else {
		envMap["PGPASSWORD"] = c.Password
	}
	for _, k := range []string{"PGSSLROOTCERT", "PGSSLCERT", "PGSSLKEY"} {
		if v := os.Getenv(k); v != "" {
			envMap[k] = v
		}
	}
	env := make([]string, 0, len(envMap))
	for k, v := range envMap {
		env = append(env, k+"="+v)
	}
	cmd.Env = env

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		msg := strings.TrimSpace(stderr.String())
		if msg != "" {
			return "", fmt.Errorf("database query failed: %s", msg)
		}
		return "", fmt.Errorf("database query failed (exit %v); no evidence was returned", err)
	}
	return strings.TrimSpace(stdout.String()), nil
}
