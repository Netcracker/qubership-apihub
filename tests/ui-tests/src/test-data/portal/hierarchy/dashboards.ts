import { Dashboard } from '@test-data/props'
import { GRP_P_HIERARCHY_R } from './groups'

export const DSH_P_HIERARCHY_BREAKING_R = new Dashboard({
  name: 'Breaking',
  alias: 'DBWCBR',
  parent: GRP_P_HIERARCHY_R,
}, { testPrefix: true, kindPrefix: true })

export const DSH_P_HIERARCHY_NON_BREAKING_R = new Dashboard({
  name: 'Non-breaking',
  alias: 'DBWCNR',
  parent: GRP_P_HIERARCHY_R,
}, { testPrefix: true, kindPrefix: true })

export const DSH_P_HIERARCHY_NO_CHANGES_R = new Dashboard({
  name: 'No-changes',
  alias: 'DBWCNCR',
  parent: GRP_P_HIERARCHY_R,
}, { testPrefix: true, kindPrefix: true })
