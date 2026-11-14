package entity

import (
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"
)

type LibraryClassDataEntity struct {
	tableName struct{} `pg:"library_class_data,alias:library_class_data"`

	DataHash    string                 `pg:"data_hash,pk,type:varchar"`
	Data        []byte                 `pg:"data,type:bytea,notnull"`
	SearchScope map[string]interface{} `pg:"search_scope,type:jsonb"`
}

type LibraryClassEntity struct {
	tableName struct{} `pg:"library_class,alias:library_class"`

	LibraryId     string   `pg:"library_id,pk,type:varchar"`
	Version       string   `pg:"version,pk,type:varchar"`
	ClassId       string   `pg:"class_id,pk,type:varchar"`
	DataHash      string   `pg:"data_hash,type:varchar,notnull"`
	Kind          string   `pg:"kind,type:varchar,notnull"`
	QualifiedName string   `pg:"qualified_name,type:varchar,notnull"`
	PackageName   string   `pg:"package_name,type:varchar"`
	Modifiers     []string `pg:"modifiers,type:varchar[],array"`
	Deprecated    bool     `pg:"deprecated,type:boolean,use_zero"`
}

type LibraryMethodDataEntity struct {
	tableName struct{} `pg:"library_method_data,alias:library_method_data"`

	DataHash string `pg:"data_hash,pk,type:varchar"`
	Data     []byte `pg:"data,type:bytea,notnull"`
}

type LibraryMethodEntity struct {
	tableName struct{} `pg:"library_method,alias:library_method"`

	LibraryId  string   `pg:"library_id,pk,type:varchar"`
	Version    string   `pg:"version,pk,type:varchar"`
	ClassId    string   `pg:"class_id,pk,type:varchar"`
	MethodId   string   `pg:"method_id,pk,type:varchar"`
	DataHash   string   `pg:"data_hash,type:varchar,notnull"`
	Name       string   `pg:"name,type:varchar,notnull"`
	Signature  string   `pg:"signature,type:varchar,notnull"`
	Modifiers  []string `pg:"modifiers,type:varchar[],array"`
	Deprecated bool     `pg:"deprecated,type:boolean,use_zero"`
}

// ClassSearchResultEntity is the shape the class and method search query returns: a class row, plus the
// method columns when the match was on a method rather than on the class itself.
type ClassSearchResultEntity struct {
	LibraryId     string `pg:"library_id"`
	Version       string `pg:"version"`
	ClassId       string `pg:"class_id"`
	QualifiedName string `pg:"qualified_name"`
	PackageName   string `pg:"package_name"`
	Kind          string `pg:"kind"`
	MethodId      string `pg:"method_id"`
	Signature     string `pg:"signature"`
}

func MakeClassSearchResultView(ent ClassSearchResultEntity) view.SearchResultClass {
	return view.SearchResultClass{
		LibraryId:     ent.LibraryId,
		Version:       ent.Version,
		ClassId:       ent.ClassId,
		QualifiedName: ent.QualifiedName,
		PackageName:   ent.PackageName,
		Kind:          view.ClassKind(ent.Kind),
		MethodId:      ent.MethodId,
		Signature:     ent.Signature,
	}
}
