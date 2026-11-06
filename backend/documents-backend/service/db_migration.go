package service

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/db"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/utils"
	"github.com/go-pg/pg/v10"
	log "github.com/sirupsen/logrus"
)

// DBMigrationService is a trimmed port of APIHUB's schema migration: numbered N_name.up.sql / N_name.down.sql files,
// a schema_migrations version row and a stored_schema_migration table holding the applied SQL and its hash, so a
// changed or removed local migration is rolled back with the stored down script.
type DBMigrationService interface {
	Migrate(basePath string) (currentMigrationNum int, newMigrationNum int, migrationRequired bool, err error)
}

func NewDBMigrationService(cp db.ConnectionProvider, systemInfoService SystemInfoService) (DBMigrationService, error) {
	s := &dbMigrationServiceImpl{
		cp:               cp,
		migrationsFolder: filepath.Join(systemInfoService.GetBasePath(), "resources", "migrations"),
	}
	up, down, err := s.getMigrationFilenamesMap()
	if err != nil {
		return nil, fmt.Errorf("failed to read migration files: %w", err)
	}
	s.upMigrations, s.downMigrations = up, down
	return s, nil
}

type dbMigrationServiceImpl struct {
	cp               db.ConnectionProvider
	migrationsFolder string
	upMigrations     map[int]string
	downMigrations   map[int]string
}

var (
	upMigrationFileRegexp   = regexp.MustCompile(`^[0-9]+_.+\.up\.sql$`)
	downMigrationFileRegexp = regexp.MustCompile(`^[0-9]+_.+\.down\.sql$`)
)

func (d *dbMigrationServiceImpl) createSchemaMigrationsTable() error {
	_, err := d.cp.GetConnection().Exec(`
		create table if not exists schema_migrations
		(
			version integer not null,
			dirty boolean not null,
			PRIMARY KEY(version)
		)`)
	return err
}

func (d *dbMigrationServiceImpl) createStoredMigrationsTable() error {
	_, err := d.cp.GetConnection().Exec(`
		create table if not exists stored_schema_migration
		(
			num integer not null,
			up_hash varchar not null,
			sql_up varchar not null,
			down_hash varchar null,
			sql_down varchar null,
			PRIMARY KEY(num)
		)`)
	return err
}

func (d *dbMigrationServiceImpl) Migrate(basePath string) (int, int, bool, error) {
	log.Infof("Schema Migration: start")
	if err := d.createSchemaMigrationsTable(); err != nil {
		return 0, 0, false, fmt.Errorf("failed to create schema migrations table: %w", err)
	}
	if err := d.createStoredMigrationsTable(); err != nil {
		return 0, 0, false, fmt.Errorf("failed to create stored migrations table: %w", err)
	}
	currentMigrationNumber := 0
	_, err := d.cp.GetConnection().QueryOne(pg.Scan(&currentMigrationNumber), `SELECT version FROM schema_migrations`)
	if err != nil && !errors.Is(err, pg.ErrNoRows) {
		return 0, 0, false, err
	}
	newMigrationNumber := len(d.upMigrations)
	log.Infof("Schema Migration: calculating migrations to execute")
	upMigrations, downMigrations, err := d.getRequiredMigrations(currentMigrationNumber, newMigrationNumber)
	if err != nil {
		return 0, 0, false, fmt.Errorf("failed to calculate required migrations to execute: %w", err)
	}
	if len(upMigrations)+len(downMigrations) == 0 {
		log.Infof("Schema Migration: no migrations required")
		return currentMigrationNumber, newMigrationNumber, false, nil
	}
	if err := d.applyRequiredMigrations(upMigrations, downMigrations); err != nil {
		return 0, 0, false, err
	}
	log.Infof("Schema Migration: finished successfully")
	return currentMigrationNumber, newMigrationNumber, true, nil
}

func (d *dbMigrationServiceImpl) applyRequiredMigrations(upMigrations []entity.SchemaMigrationEntity, downMigrations []entity.SchemaMigrationEntity) error {
	sort.Slice(upMigrations, func(i, j int) bool { return upMigrations[i].Num < upMigrations[j].Num })
	sort.Slice(downMigrations, func(i, j int) bool { return downMigrations[i].Num > downMigrations[j].Num })
	var latestMigrationNum int
	if len(upMigrations) > 0 {
		latestMigrationNum = upMigrations[len(upMigrations)-1].Num
	} else {
		latestMigrationNum = downMigrations[len(downMigrations)-1].Num - 1
	}
	log.Infof("Schema migration: start applying %v down and %v up migrations", len(downMigrations), len(upMigrations))
	ctx := context.Background()
	return d.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		for _, downMigration := range downMigrations {
			downMigration := downMigration
			if downMigration.SqlDown != "" {
				if _, err := tx.Exec(downMigration.SqlDown); err != nil {
					return fmt.Errorf("failed to apply stored down migration %v: %w", downMigration.Num, err)
				}
			}
			if _, err := tx.Model(&downMigration).WherePK().Delete(); err != nil {
				return fmt.Errorf("failed to remove applied down migration %v from stored_schema_migration: %w", downMigration.Num, err)
			}
			log.Infof("successfully applied stored down migration %v", downMigration.Num)
		}
		for _, upMigration := range upMigrations {
			upMigration := upMigration
			if _, err := tx.Exec(upMigration.SqlUp); err != nil {
				return fmt.Errorf("failed to apply local up migration %v: %w", upMigration.Num, err)
			}
			if upMigration.SqlDown != "" {
				// Validate the down script inside a savepoint so a broken one is caught now, not at rollback time.
				if _, err := tx.Exec(`SAVEPOINT up_migration`); err != nil {
					return fmt.Errorf("failed to validate local down migration %v: failed to create transaction savepoint: %w", upMigration.Num, err)
				}
				if _, err := tx.Exec(upMigration.SqlDown); err != nil {
					return fmt.Errorf("failed to execute local down migration %v: %w", upMigration.Num, err)
				}
				if _, err := tx.Exec(`ROLLBACK TO SAVEPOINT up_migration`); err != nil {
					return fmt.Errorf("failed to validate local down migration %v: failed to rollback to transaction savepoint: %w", upMigration.Num, err)
				}
				if _, err := tx.Exec(`RELEASE SAVEPOINT up_migration`); err != nil {
					return fmt.Errorf("failed to validate local down migration %v: failed to release transaction savepoint: %w", upMigration.Num, err)
				}
			}
			if _, err := tx.Model(&upMigration).Insert(); err != nil {
				return fmt.Errorf("failed to store local up migration %v: %w", upMigration.Num, err)
			}
			log.Infof("successfully applied local up migration %v", upMigration.Num)
		}
		if _, err := tx.Model(&entity.MigrationEntity{}).Where("version is not null").Delete(); err != nil {
			return fmt.Errorf("failed to delete schema_migrations table with latest migration version %v", latestMigrationNum)
		}
		if _, err := tx.Model(&entity.MigrationEntity{Version: latestMigrationNum, Dirty: false}).Insert(); err != nil {
			return fmt.Errorf("failed to insert schema_migrations table with latest migration version %v", latestMigrationNum)
		}
		return nil
	})
}

func (d *dbMigrationServiceImpl) getRequiredMigrations(currentMigrationNumber int, newMigrationNumber int) ([]entity.SchemaMigrationEntity, []entity.SchemaMigrationEntity, error) {
	requiredUpMigrations := make([]entity.SchemaMigrationEntity, 0)
	requiredDownMigrations := make([]entity.SchemaMigrationEntity, 0)
	var latestStoredMigration entity.SchemaMigrationEntity
	err := d.cp.GetConnection().Model(&latestStoredMigration).Order("num desc").Limit(1).Select()
	if err != nil && !errors.Is(err, pg.ErrNoRows) {
		return nil, nil, err
	}
	if newMigrationNumber == 0 && currentMigrationNumber == 0 {
		return requiredUpMigrations, requiredDownMigrations, nil
	}
	if latestStoredMigration.Num == 0 {
		log.Infof("Schema Migration: there are no stored migrations, trying to store already applied migrations")
		if newMigrationNumber < currentMigrationNumber {
			return nil, nil, fmt.Errorf("total number of 'up' migrations (%v) is lower than currently applied version from schema_migrations (%v). Please execute required down migrations and retry", newMigrationNumber, currentMigrationNumber)
		}
		if err := d.storeAlreadyAppliedSchemaMigrations(currentMigrationNumber); err != nil {
			return nil, nil, fmt.Errorf("failed to store already applied schema migrations: %w", err)
		}
		for i := currentMigrationNumber + 1; i <= newMigrationNumber; i++ {
			migrationEnt, err := d.makeLocalMigrationEntity(i)
			if err != nil {
				return nil, nil, err
			}
			requiredUpMigrations = append(requiredUpMigrations, *migrationEnt)
		}
		return requiredUpMigrations, requiredDownMigrations, nil
	}
	i, j := currentMigrationNumber, newMigrationNumber
	for i > 0 && j > 0 {
		if i > j {
			// applied migration missing locally
			storedMigration, err := d.getSchemaMigrationEntity(i)
			if err != nil {
				return nil, nil, fmt.Errorf("failed to read stored migration %v: %w", i, err)
			}
			if storedMigration == nil {
				return nil, nil, fmt.Errorf("stored migration %v not found", i)
			}
			requiredDownMigrations = append(requiredDownMigrations, *storedMigration)
			i--
			continue
		}
		localMigration, err := d.makeLocalMigrationEntity(j)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to read local migration %v: %w", j, err)
		}
		if j > i {
			// new migration
			requiredUpMigrations = append(requiredUpMigrations, *localMigration)
			j--
			continue
		}
		// same migration number (i==j)
		storedMigration, err := d.getSchemaMigrationEntity(i)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to read stored migration %v: %w", i, err)
		}
		if storedMigration == nil {
			return nil, nil, fmt.Errorf("stored migration %v not found", i)
		}
		if localMigration.UpHash == storedMigration.UpHash {
			break
		}
		// same migration number but different content
		requiredUpMigrations = append(requiredUpMigrations, *localMigration)
		requiredDownMigrations = append(requiredDownMigrations, *storedMigration)
		i--
		j--
	}
	return requiredUpMigrations, requiredDownMigrations, nil
}

func (d *dbMigrationServiceImpl) storeAlreadyAppliedSchemaMigrations(currentMigrationNumber int) error {
	if currentMigrationNumber == 0 {
		return nil
	}
	schemaMigrationEntities := make([]*entity.SchemaMigrationEntity, 0, currentMigrationNumber)
	for i := 1; i <= currentMigrationNumber; i++ {
		migrationEnt, err := d.makeLocalMigrationEntity(i)
		if err != nil {
			return err
		}
		schemaMigrationEntities = append(schemaMigrationEntities, migrationEnt)
	}
	_, err := d.cp.GetConnection().Model(&schemaMigrationEntities).OnConflict("(num) DO NOTHING").Insert()
	return err
}

func (d *dbMigrationServiceImpl) makeLocalMigrationEntity(migrationNumber int) (*entity.SchemaMigrationEntity, error) {
	upMigrationFile, exists := d.upMigrations[migrationNumber]
	if !exists {
		return nil, fmt.Errorf("failed to read up migration file %v", migrationNumber)
	}
	upMigrationFileData, err := os.ReadFile(upMigrationFile)
	if err != nil {
		return nil, fmt.Errorf("failed to read up migration file %v: %w", upMigrationFile, err)
	}
	downMigrationFileData := []byte{}
	if downMigrationFile, exists := d.downMigrations[migrationNumber]; exists {
		downMigrationFileData, err = os.ReadFile(downMigrationFile)
		if err != nil {
			return nil, fmt.Errorf("failed to read down migration file %v: %w", downMigrationFile, err)
		}
	}
	return &entity.SchemaMigrationEntity{
		UpHash:   calculateMigrationHash(migrationNumber, upMigrationFileData),
		DownHash: calculateMigrationHash(migrationNumber, downMigrationFileData),
		Num:      migrationNumber,
		SqlUp:    string(upMigrationFileData),
		SqlDown:  string(downMigrationFileData),
	}, nil
}

func (d *dbMigrationServiceImpl) getSchemaMigrationEntity(migrationNumber int) (*entity.SchemaMigrationEntity, error) {
	var storedMigration entity.SchemaMigrationEntity
	err := d.cp.GetConnection().Model(&storedMigration).Where("num = ?", migrationNumber).Limit(1).Select()
	if errors.Is(err, pg.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &storedMigration, nil
}

func (d *dbMigrationServiceImpl) getMigrationFilenamesMap() (map[int]string, map[int]string, error) {
	entries, err := os.ReadDir(d.migrationsFolder)
	if err != nil {
		return nil, nil, err
	}
	upMigrations := make(map[int]string)
	downMigrations := make(map[int]string)
	maxUpMigrationNumber := 0
	for _, e := range entries {
		file := e.Name()
		num, _ := strconv.Atoi(strings.SplitN(file, "_", 2)[0])
		if upMigrationFileRegexp.MatchString(file) {
			if _, exists := upMigrations[num]; exists {
				return nil, nil, fmt.Errorf("found duplicate migration number, migration is not possible: %v", file)
			}
			upMigrations[num] = filepath.Join(d.migrationsFolder, file)
			if maxUpMigrationNumber < num {
				maxUpMigrationNumber = num
			}
		}
		if downMigrationFileRegexp.MatchString(file) {
			if _, exists := downMigrations[num]; exists {
				return nil, nil, fmt.Errorf("found duplicate migration number, migration is not possible: %v", file)
			}
			downMigrations[num] = filepath.Join(d.migrationsFolder, file)
		}
	}
	if maxUpMigrationNumber != len(upMigrations) {
		return nil, nil, fmt.Errorf("up migrations must be numbered 1..N without gaps, found max %d of %d files", maxUpMigrationNumber, len(upMigrations))
	}
	return upMigrations, downMigrations, nil
}

func calculateMigrationHash(migrationNum int, data []byte) string {
	return utils.Sha256Hex([]byte(strconv.Itoa(migrationNum)), data)
}
