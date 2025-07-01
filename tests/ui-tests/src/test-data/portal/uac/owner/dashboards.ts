import { Dashboard } from '@test-data/props'
import { GRP_P_OWNER_CRUD_N, GRP_P_OWNER_ROOT_N } from './groups'
import { TOKEN_OWNER_DASHBOARD } from './tokens'

export const DSH_P_OWNER_N = new Dashboard({
  name: 'Owner',
  alias: 'DOWNER',
  parent: GRP_P_OWNER_ROOT_N,
  apiKeys: [TOKEN_OWNER_DASHBOARD],
}, { kindPrefix: true })

export const DSH_P_OWNER_EDITING_N = new Dashboard({
  name: 'Owner-editing',
  alias: 'DOWNERE',
  parent: GRP_P_OWNER_CRUD_N,
}, { kindPrefix: true })

export const DSH_P_OWNER_DELETING_N = new Dashboard({
  name: 'Owner-deleting',
  alias: 'DOWNERD',
  parent: GRP_P_OWNER_CRUD_N,
}, { kindPrefix: true })
