import { Group } from '@test-data/props'
import { GRP_P_UAC_N } from '../general/groups'
import { TOKEN_EDITOR_GROUP } from './tokens'

export const GRP_P_EDITOR_ROOT_N = new Group({
  name: 'Editor',
  alias: 'GEROOTN',
  parent: GRP_P_UAC_N,
})

export const GRP_P_EDITOR_N = new Group({
  name: 'Editor',
  alias: 'GEDITOR',
  parent: GRP_P_EDITOR_ROOT_N,
  apiKeys: [TOKEN_EDITOR_GROUP],
}, { kindPrefix: true })
