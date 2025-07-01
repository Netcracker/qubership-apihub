import { Package } from '@test-data/props'
import { GRP_P_OWNER_CRUD_N, GRP_P_OWNER_ROOT_N } from './groups'
import { TOKEN_OWNER_PACKAGE } from './tokens'
import { DEF_PREFIX_GROUP } from '@test-data/portal'

export const PKG_P_OWNER_N = new Package({
  name: 'Owner',
  alias: 'POWNER',
  parent: GRP_P_OWNER_ROOT_N,
  restGroupingPrefix: DEF_PREFIX_GROUP,
  apiKeys: [TOKEN_OWNER_PACKAGE],
}, { kindPrefix: true })

export const PKG_P_OWNER_EDITING_N = new Package({
  name: 'Owner-editing',
  alias: 'POWNERE',
  parent: GRP_P_OWNER_CRUD_N,
}, { kindPrefix: true })

export const PKG_P_OWNER_DELETING_N = new Package({
  name: 'Owner-deleting',
  alias: 'POWNERD',
  parent: GRP_P_OWNER_CRUD_N,
}, { kindPrefix: true })
