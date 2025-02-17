import { Package } from '@test-data/props'
import { P_GRP_GROUPING_R } from '../groups'

export const P_PKG_DMGR_PET_R = new Package({
  name: 'Dsh-man-grouping-pet',
  alias: 'DMGRPET',
  parent: P_GRP_GROUPING_R,
  description: 'Reusable. Uses for dashboards.',
}, { kindPrefix: true })

export const P_PKG_DMGR_USER_R = new Package({
  name: 'Dsh-man-grouping-user',
  alias: 'DMGRUSER',
  parent: P_GRP_GROUPING_R,
  description: 'Reusable. Uses for dashboards.',
}, { kindPrefix: true })

export const P_PKG_DMGR_STORE_R = new Package({
  name: 'Dsh-man-grouping-store',
  alias: 'DMGRSTORE',
  parent: P_GRP_GROUPING_R,
  description: 'Reusable. Uses for dashboards.',
}, { kindPrefix: true })
