import { Group } from '@test-data/props'
import { GRP_P_UAC_N } from '../general/groups'
import { TOKEN_ADMIN_GROUP } from './tokens'

export const GRP_P_ADMIN_ROOT_N = new Group({
  name: 'Admin',
  alias: 'GAROOTN',
  parent: GRP_P_UAC_N,
})

export const GRP_P_ADMIN_N = new Group({
  name: 'Admin',
  alias: 'GADMIN',
  parent: GRP_P_ADMIN_ROOT_N,
  apiKeys: [TOKEN_ADMIN_GROUP],
}, { kindPrefix: true })

export const GRP_P_ADMIN_CRUD_N = new Group({
  name: 'Admin-crud',
  alias: 'GADMINCRD',
  parent: GRP_P_ADMIN_ROOT_N,
}, { kindPrefix: true })

export const GRP_P_ADMIN_EDITING_N = new Group({
  name: 'Admin-editing',
  alias: 'GADMINE',
  parent: GRP_P_ADMIN_CRUD_N,
  apiKeys: [TOKEN_ADMIN_GROUP],
}, { kindPrefix: true })

export const GRP_P_ADMIN_DELETING_N = new Group({
  name: 'Admin-deleting',
  alias: 'GADMIND',
  parent: GRP_P_ADMIN_CRUD_N,
}, { kindPrefix: true })
