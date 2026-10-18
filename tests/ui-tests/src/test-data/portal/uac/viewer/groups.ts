import { Group } from '@test-data/props'
import { GRP_P_UAC_R } from '../general/groups'
import { TOKEN_VIEWER_GROUP } from './tokens'

export const GRP_P_VIEWER_ROOT_R = new Group({
  name: 'Viewer',
  alias: 'GVROOT',
  parent: GRP_P_UAC_R,
})

export const GRP_P_VIEWER_R = new Group({
  name: 'Viewer',
  alias: 'GVIEWER',
  parent: GRP_P_VIEWER_ROOT_R,
  apiKeys: [TOKEN_VIEWER_GROUP],
}, { kindPrefix: true })
