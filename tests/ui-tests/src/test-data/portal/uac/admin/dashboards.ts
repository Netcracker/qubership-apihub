import { Dashboard } from '@test-data/props'
import { GRP_P_ADMIN_CRUD_N, GRP_P_ADMIN_ROOT_N } from './groups'
import { TOKEN_ADMIN_DASHBOARD } from './tokens'

export const DSH_P_ADMIN_N = new Dashboard({
  name: 'Admin',
  alias: 'DADMIN',
  parent: GRP_P_ADMIN_ROOT_N,
  apiKeys: [TOKEN_ADMIN_DASHBOARD],
}, { kindPrefix: true })

export const DSH_P_ADMIN_EDITING_N = new Dashboard({
  name: 'Admin-editing',
  alias: 'DADMINE',
  parent: GRP_P_ADMIN_CRUD_N,
  apiKeys: [TOKEN_ADMIN_DASHBOARD],
}, { kindPrefix: true })

export const DSH_P_ADMIN_DELETING_N = new Dashboard({
  name: 'Admin-deleting',
  alias: 'DADMIND',
  parent: GRP_P_ADMIN_CRUD_N,
}, { kindPrefix: true })
