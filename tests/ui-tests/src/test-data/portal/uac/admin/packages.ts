import { Package } from '@test-data/props'
import { GRP_P_ADMIN_CRUD_N, GRP_P_ADMIN_ROOT_N } from './groups'
import { TOKEN_ADMIN_PACKAGE } from './tokens'
import { DEF_PREFIX_GROUP } from '@test-data/portal'

export const PKG_P_ADMIN_N = new Package({
  name: 'Admin',
  alias: 'PADMIN',
  parent: GRP_P_ADMIN_ROOT_N,
  restGroupingPrefix: DEF_PREFIX_GROUP,
  apiKeys: [TOKEN_ADMIN_PACKAGE],
}, { kindPrefix: true })

export const PKG_P_ADMIN_EDITING_N = new Package({
  name: 'Admin-editing',
  alias: 'PADMINE',
  parent: GRP_P_ADMIN_CRUD_N,
  apiKeys: [TOKEN_ADMIN_PACKAGE],
}, { kindPrefix: true })

export const PKG_P_ADMIN_DELETING_N = new Package({
  name: 'Admin-deleting',
  alias: 'PADMIND',
  parent: GRP_P_ADMIN_CRUD_N,
}, { kindPrefix: true })
