import { Group } from '@test-data/props'
import { GRP_P_UAC_N } from '../general/groups'
import { TOKEN_OWNER_GROUP } from './tokens'

export const GRP_P_OWNER_ROOT_N = new Group({
  name: 'Owner',
  alias: 'GOROOTN',
  parent: GRP_P_UAC_N,
})

export const GRP_P_OWNER_N = new Group({
  name: 'Owner',
  alias: 'GOWNER',
  parent: GRP_P_OWNER_ROOT_N,
  apiKeys: [TOKEN_OWNER_GROUP],
}, { kindPrefix: true })

export const GRP_P_OWNER_CRUD_N = new Group({
  name: 'Owner-crud',
  alias: 'GOWNERCRD',
  parent: GRP_P_OWNER_ROOT_N,
}, { kindPrefix: true })

export const GRP_P_OWNER_EDITING_N = new Group({
  name: 'Owner-editing',
  alias: 'GOWNERE',
  parent: GRP_P_OWNER_CRUD_N,
}, { kindPrefix: true })

export const GRP_P_OWNER_DELETING_N = new Group({
  name: 'Owner-deleting',
  alias: 'GOWNERD',
  parent: GRP_P_OWNER_CRUD_N,
}, { kindPrefix: true })
