package entity

type ExternalIdentityEntity struct {
	tableName struct{} `pg:"external_identity"`

	Provider   string `pg:"provider, pk, type:varchar"`
	ProviderId string `pg:"provider_id, pk, type:varchar"`
	ExternalId string `pg:"external_id, pk, type:varchar"`
	InternalId string `pg:"internal_id, type:varchar"`
}
