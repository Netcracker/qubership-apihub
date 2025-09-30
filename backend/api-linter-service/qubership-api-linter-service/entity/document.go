package entity

import "github.com/Netcracker/qubership-api-linter-service/view"

type LintedDocument struct {
	tableName struct{} `pg:"linted_document"`

	PackageId         string                    `pg:"package_id,pk,type:varchar,notnull"`
	Version           string                    `pg:"version,pk,type:varchar,notnull"`
	Revision          int                       `pg:"revision,pk,type:integer,notnull"`
	FileId            string                    `pg:"file_id,pk,type:varchar,notnull"`
	Slug              string                    `pg:"slug,type:varchar,notnull"`
	SpecificationType view.ApiType              `pg:"specification_type,type:varchar,notnull"`
	RulesetId         string                    `pg:"ruleset_id,pk,type:varchar,notnull"`
	DataHash          string                    `pg:"data_hash,type:varchar"`
	LintStatus        view.LintedDocumentStatus `pg:"lint_status,type:varchar,notnull"`
	LintDetails       string                    `pg:"lint_details,type:varchar"`
}

// TODO: choose linted vs validated term!

func MakeValidatedDocumentView(ent LintedDocument) view.ValidatedDocument {
	return view.ValidatedDocument{
		Slug:    ent.Slug,
		ApiType: ent.SpecificationType,
		DocName: ent.FileId,
	}
}
