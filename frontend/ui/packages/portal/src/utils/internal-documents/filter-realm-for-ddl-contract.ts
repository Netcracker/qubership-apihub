import { calculateDdlEntityId } from '@netcracker/qubership-apihub-api-processor'
import type { Realm, Schema } from '@netcracker/qubership-apihub-ddlapi'
import {
  DDL_ENTITY_KIND_TABLE,
  type DdlContractEntityDetails,
} from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl'

type DdlContractIdentity = Pick<DdlContractEntityDetails, 'ddlEntityId' | 'schemaName' | 'name' | 'kind'>

export function filterRealmForDdlContract(
  realm: Realm,
  ddlContract: DdlContractIdentity,
): Realm | undefined {
  if (ddlContract.kind !== DDL_ENTITY_KIND_TABLE) {
    return undefined
  }

  for (const schema of realm.schemas ?? []) {
    for (const table of schema.tables ?? []) {
      const entityId = calculateDdlEntityId(schema.name, DDL_ENTITY_KIND_TABLE, table.name)
      const matchedById = entityId === ddlContract.ddlEntityId
      const matchedByName = schema.name === ddlContract.schemaName && table.name === ddlContract.name
      if (!matchedById && !matchedByName) {
        continue
      }

      const singleTableSchema: Schema = {
        name: schema.name,
        tables: [table],
      }
      if (schema.attrs !== undefined) {
        singleTableSchema.attrs = schema.attrs
      }
      if (schema.objects !== undefined) {
        singleTableSchema.objects = schema.objects
      }

      const singleTableRealm: Realm = {
        ddlapi: realm.ddlapi,
        schemas: [singleTableSchema],
      }
      if (realm.attrs !== undefined) {
        singleTableRealm.attrs = realm.attrs
      }
      if (realm.objects !== undefined) {
        singleTableRealm.objects = realm.objects
      }

      return singleTableRealm
    }
  }

  return undefined
}
