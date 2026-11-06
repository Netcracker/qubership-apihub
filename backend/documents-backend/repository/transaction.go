package repository

import (
	"context"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/db"
	"github.com/go-pg/pg/v10"
)

// TransactionRunner runs fn inside one database transaction (import writes articles and files atomically).
type TransactionRunner interface {
	RunInTransaction(ctx context.Context, fn func(tx *pg.Tx) error) error
}

func NewTransactionRunnerPG(cp db.ConnectionProvider) TransactionRunner {
	return &transactionRunnerImpl{cp: cp}
}

type transactionRunnerImpl struct {
	cp db.ConnectionProvider
}

func (t transactionRunnerImpl) RunInTransaction(ctx context.Context, fn func(tx *pg.Tx) error) error {
	return t.cp.GetConnection().RunInTransaction(ctx, fn)
}
