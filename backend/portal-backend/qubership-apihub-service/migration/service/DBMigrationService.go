// Copyright 2024-2025 NetCracker Technology Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package service

import (
	"context"
	"fmt"
	"os"
	"sort"
	"strings"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"

	mEntity "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/entity"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	mRepository "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/repository"
	mView "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/view"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/go-pg/pg/v10"
	log "github.com/sirupsen/logrus"
)

type DBMigrationService interface {
	Migrate(basePath string) (int, int, bool, error)
	SoftMigrateDb(currentVersion int, newVersion int, migrationRequired bool) error
	MigrateOperations(migrationId string, req mView.MigrationRequest) error
	GetMigrationReport(migrationId string, includeBuildSamples bool) (*mView.MigrationReport, error)
	CancelRunningMigrations() error
	GetSuspiciousBuilds(migrationId string, changedField string, limit int, page int) ([]mView.SuspiciousMigrationBuild, error)
}

func NewDBMigrationService(cp db.ConnectionProvider, mRRepo mRepository.MigrationRunRepository,
	bCRepo repository.BuildCleanupRepository, transitionRepository repository.TransitionRepository,
	systemInfoService service.SystemInfoService, minioStorageService service.MinioStorageService) (DBMigrationService, error) {
	service := &dbMigrationServiceImpl{
		cp:                     cp,
		systemInfoService:      systemInfoService,
		repo:                   mRRepo,
		buildCleanupRepository: bCRepo,
		transitionRepository:   transitionRepository,
		migrationsFolder:       systemInfoService.GetBasePath() + "/resources/migrations",
		minioStorageService:    minioStorageService,
	}
	upMigrations, downMigrations, err := service.getMigrationFilenamesMap()
	if err != nil {
		return nil, fmt.Errorf("failed to read migration files: %v", err.Error())
	}
	service.upMigrations = upMigrations
	service.downMigrations = downMigrations
	return service, nil
}

type dbMigrationServiceImpl struct {
	cp                     db.ConnectionProvider
	systemInfoService      service.SystemInfoService
	repo                   mRepository.MigrationRunRepository
	buildCleanupRepository repository.BuildCleanupRepository
	transitionRepository   repository.TransitionRepository
	migrationsFolder       string
	upMigrations           map[int]string
	downMigrations         map[int]string
	minioStorageService    service.MinioStorageService
}

const storedMigrationsTableMigrationVersion = 84

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

func (d *dbMigrationServiceImpl) Migrate(basePath string) (currentMigrationNum int, newMigrationNum int, migrationRequired bool, err error) {
	log.Infof("Schema Migration: start")

	var currentMigrationNumber int
	_, err = d.cp.GetConnection().QueryOne(pg.Scan(&currentMigrationNumber), `SELECT version FROM schema_migrations`)
	if err != nil {
		if strings.Contains(err.Error(), "does not exist") {
			err = d.createSchemaMigrationsTable()
			if err != nil {
				return 0, 0, false, fmt.Errorf("failed to create schema migrations table: %w", err)
			}
			_, err = d.cp.GetConnection().QueryOne(pg.Scan(&currentMigrationNumber), `SELECT version FROM schema_migrations`)
		}
		if err != pg.ErrNoRows {
			return 0, 0, false, err
		}
	}
	if currentMigrationNumber < storedMigrationsTableMigrationVersion {
		err = d.createStoredMigrationsTable()
		if err != nil {
			return 0, 0, false, fmt.Errorf("failed to create stored migrations table: %w", err)
		}
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

	// It's a tricky. Making table creation as a soft migration was a big mistake...
	// Added constraint for the table in the regular migration(#91) will mess empty DB startup, so need to make sure the table is created
	err = d.createMigrationTables()
	if err != nil {
		log.Errorf("Failed to create operations migration table: %s", err)
		return currentMigrationNumber, newMigrationNumber, true, nil
	}

	err = d.applyRequiredMigrations(upMigrations, downMigrations)
	if err != nil {
		return 0, 0, false, err
	}
	log.Infof("Schema Migration: finished successfully")
	return currentMigrationNumber, newMigrationNumber, true, nil
}

func (d *dbMigrationServiceImpl) applyRequiredMigrations(upMigrations []mEntity.SchemaMigrationEntity, downMigrations []mEntity.SchemaMigrationEntity) error {
	if len(upMigrations)+len(downMigrations) == 0 {
		return nil
	}
	sort.Slice(upMigrations, func(i, j int) bool {
		return upMigrations[i].Num < upMigrations[j].Num
	})
	sort.Slice(downMigrations, func(i, j int) bool {
		return downMigrations[i].Num > downMigrations[j].Num
	})
	var latestMigrationNum int
	if len(upMigrations) > 0 {
		latestMigrationNum = upMigrations[len(upMigrations)-1].Num
	} else {
		latestMigrationNum = downMigrations[len(downMigrations)-1].Num - 1
	}
	log.Infof("Schema migration: start applying %v down and %v up migrations", len(downMigrations), len(upMigrations))
	ctx := context.Background()
	err := d.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		for _, downMigration := range downMigrations {
			if downMigration.SqlDown != "" {
				rs, err := tx.Exec(downMigration.SqlDown)
				if err != nil {
					return fmt.Errorf("failed to apply stored down migration %v: %w", downMigration.Num, err)
				}
				log.Infof("successfully applied stored down migration %v: %v rows affected", downMigration.Num, rs.RowsAffected())
			} else {
				log.Infof("down migration %v is empty, nothing to apply", downMigration.Num)
			}
			_, err := tx.Model(&downMigration).WherePK().Delete()
			if err != nil {
				return fmt.Errorf("failed to remove applied down migration %v from stored_schema_migration: %w", downMigration.Num, err)
			}
		}
		for _, upMigration := range upMigrations {
			rs, err := tx.Exec(upMigration.SqlUp)
			if err != nil {
				return fmt.Errorf("failed to apply local up migration %v: %w", upMigration.Num, err)
			}
			if upMigration.SqlDown != "" {
				_, err = tx.Exec(`SAVEPOINT up_migration`)
				if err != nil {
					return fmt.Errorf("failed to validate local down migration %v: failed to create transaction savepoint: %w", upMigration.Num, err)
				}
				_, err = tx.Exec(upMigration.SqlDown)
				if err != nil {
					return fmt.Errorf("failed to execute local down migration %v: %w", upMigration.Num, err)
				}
				_, err = tx.Exec(`ROLLBACK TO SAVEPOINT up_migration`)
				if err != nil {
					return fmt.Errorf("failed to validate local down migration %v: failed to rollback to transaction savepoint: %w", upMigration.Num, err)
				}
				_, err = tx.Exec(`RELEASE SAVEPOINT up_migration`)
				if err != nil {
					return fmt.Errorf("failed to validate local down migration %v: failed to release transaction savepoint: %w", upMigration.Num, err)
				}
			}
			_, err = tx.Model(&upMigration).Insert()
			if err != nil {
				return fmt.Errorf("failed to store local up migration %v: %w", upMigration.Num, err)
			}
			log.Infof("successfully applied local up migration %v: %v rows affected", upMigration.Num, rs.RowsAffected())
		}
		migrationEntity := entity.MigrationEntity{
			Version: latestMigrationNum,
			Dirty:   false,
		}
		_, err := tx.Model(&entity.MigrationEntity{}).
			Where("version is not null").
			Delete()
		if err != nil {
			return fmt.Errorf("failed to update schema_migrations table with latest migration version %v", latestMigrationNum)
		}
		_, err = tx.Model(&migrationEntity).
			Insert()
		if err != nil {
			return fmt.Errorf("failed to update schema_migrations table with latest migration version %v", latestMigrationNum)
		}
		return nil
	})
	if err != nil {
		return err
	}
	return nil
}

func (d *dbMigrationServiceImpl) getRequiredMigrations(currentMigrationNumber int, newMigrationNumber int) ([]mEntity.SchemaMigrationEntity, []mEntity.SchemaMigrationEntity, error) {
	requiredUpMigrations := make([]mEntity.SchemaMigrationEntity, 0)
	requiredDownMigrations := make([]mEntity.SchemaMigrationEntity, 0)
	var latestStoredMigration mEntity.SchemaMigrationEntity
	err := d.cp.GetConnection().Model(&latestStoredMigration).Order("num desc").Limit(1).Select()
	if err != nil {
		if err != pg.ErrNoRows {
			return nil, nil, err
		}
	}
	if newMigrationNumber == 0 && currentMigrationNumber == 0 {
		return requiredUpMigrations, requiredDownMigrations, nil
	}

	if latestStoredMigration.Num == 0 {
		log.Infof("Schema Migration: there are no stored migrations, trying to store already applied migrations")
		if newMigrationNumber < currentMigrationNumber {
			return nil, nil, fmt.Errorf("total number of 'up' migrations (%v) is lower than currently applied version from schema_migrations (%v). Please execute required down migrations and retry", newMigrationNumber, currentMigrationNumber)
		}
		err = d.storeAlreadyAppliedSchemaMigrations(currentMigrationNumber)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to store already applied schema migrations: %w", err)
		}
		if currentMigrationNumber == newMigrationNumber {
			return requiredUpMigrations, requiredDownMigrations, nil
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

	i := currentMigrationNumber
	j := newMigrationNumber
	for i > 0 && j > 0 {
		if i > j {
			//applied migration missing
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
			//new migration
			requiredUpMigrations = append(requiredUpMigrations, *localMigration)
			j--
			continue
		}
		//same migration number (i==j)
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
		//same migration number but different content
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
	schemaMigrationEntities := make([]*mEntity.SchemaMigrationEntity, 0)
	for i := 1; i <= currentMigrationNumber; i++ {
		migrationEnt, err := d.makeLocalMigrationEntity(i)
		if err != nil {
			return err
		}
		schemaMigrationEntities = append(schemaMigrationEntities, migrationEnt)
	}

	ctx := context.Background()
	return d.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		_, err := tx.Model(&schemaMigrationEntities).OnConflict("(num) DO NOTHING").Insert()
		if err != nil {
			return err
		}
		return nil
	})
}

func (d *dbMigrationServiceImpl) makeLocalMigrationEntity(migrationNumber int) (*mEntity.SchemaMigrationEntity, error) {
	upMigrationFile, exists := d.upMigrations[migrationNumber]
	if !exists {
		return nil, fmt.Errorf("failed to read up migration file %v", migrationNumber)
	}
	upMigrationFileData, err := os.ReadFile(upMigrationFile)
	if err != nil {
		return nil, fmt.Errorf("failed to read up migration file %v: %w", upMigrationFile, err)
	}
	var downMigrationFileData []byte
	downMigrationFile, exists := d.downMigrations[migrationNumber]
	if exists {
		downMigrationFileData, err = os.ReadFile(downMigrationFile)
		if err != nil {
			return nil, fmt.Errorf("failed to read down migration file %v: %w", downMigrationFile, err)
		}
	} else {
		downMigrationFileData = []byte{}
	}
	upMigrationHash := calculateMigrationHash(migrationNumber, upMigrationFileData)
	downMigrationHash := calculateMigrationHash(migrationNumber, downMigrationFileData)

	return &mEntity.SchemaMigrationEntity{
		UpHash:   upMigrationHash,
		DownHash: downMigrationHash,
		Num:      migrationNumber,
		SqlUp:    string(upMigrationFileData),
		SqlDown:  string(downMigrationFileData),
	}, nil
}

func (d *dbMigrationServiceImpl) getSchemaMigrationEntity(migrationNumber int) (*mEntity.SchemaMigrationEntity, error) {
	var storedMigration mEntity.SchemaMigrationEntity
	err := d.cp.GetConnection().Model(&storedMigration).Where("num = ?", migrationNumber).Limit(1).Select()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &storedMigration, nil
}

func (d *dbMigrationServiceImpl) CancelRunningMigrations() error {
	_, err := d.cp.GetConnection().Exec(`
	update build set status = ?, details = ? 
	where status in (?) and created_by = 'db migration'`,
		view.StatusError, CancelledMigrationError,
		pg.In([]view.BuildStatusEnum{view.StatusNotStarted, view.StatusRunning}))
	if err != nil {
		return err
	}
	return nil
}
