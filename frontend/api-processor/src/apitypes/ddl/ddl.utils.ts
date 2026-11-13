import { Realm } from '@netcracker/qubership-apihub-ddlapi'
import { normalize } from '@netcracker/qubership-apihub-api-unifier'
import { VersionDocument } from '../../types'
import { createSerializedInternalDocument } from '../../utils'
import { DDL_EFFECTIVE_NORMALIZE_OPTIONS } from './ddl.consts'

/**
 * Build the version-internal document for a DDL document the same way REST does (AD3):
 * normalize the Realm → denormalize → serialize, and attach the serialized form to the
 * document's `versionInternalDocument` (which must already exist via `createVersionInternalDocument`).
 *
 * `createSerializedInternalDocument` performs the `denormalize(effectiveDocument) → serializeDocument`
 * half, so we pass it the already-normalized Realm as the effective document.
 */
export function serializeDdlInternalDocument(document: VersionDocument, realm: Realm): void {
  const effectiveRealm = normalize(realm, { ...DDL_EFFECTIVE_NORMALIZE_OPTIONS, source: realm }) as Realm
  createSerializedInternalDocument(document, effectiveRealm, DDL_EFFECTIVE_NORMALIZE_OPTIONS)
}
