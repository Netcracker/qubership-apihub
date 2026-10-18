package entity

type SystemRoleEntity struct {
	tableName struct{} `pg:"system_role"`

	UserId string `pg:"user_id, pk, type:varchar"`
	Role   string `pg:"role, use_zero, type:varchar"`
}
