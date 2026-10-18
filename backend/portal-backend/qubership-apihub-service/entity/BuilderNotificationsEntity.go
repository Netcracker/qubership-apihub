package entity

type BuilderNotificationsEntity struct {
	tableName struct{} `pg:"builder_notifications"`

	BuildId  string `pg:"build_id, type:varchar"`
	Severity int    `pg:"severity, type:integer"`
	Message  string `pg:"message, type:varchar"`
	FileId   string `pg:"file_id, type:varchar"`
}
