import { Package } from '@test-data/props'
import { GRP_P_HIERARCHY_R } from './groups'
import process from 'node:process'

export const PKG_P_HIERARCHY_BREAKING_R = new Package({
  name: 'Breaking',
  alias: 'PBWCBR',
  parent: GRP_P_HIERARCHY_R,
  serviceName: `hierarchy-${process.env.TEST_ID_R}`,
}, { testPrefix: true, kindPrefix: true })

export const PKG_P_HIERARCHY_NON_BREAKING_R = new Package({
  name: 'Non-breaking',
  alias: 'PBWCNR',
  parent: GRP_P_HIERARCHY_R,
}, { testPrefix: true, kindPrefix: true })

export const PKG_P_HIERARCHY_NO_CHANGES_R = new Package({
  name: 'No-changes',
  alias: 'PBWCNCR',
  parent: GRP_P_HIERARCHY_R,
}, { testPrefix: true, kindPrefix: true })
