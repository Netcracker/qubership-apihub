import { Package } from '@test-data/props'
import { P_GRP_GROUPING_N, P_GRP_GROUPING_R } from '../groups'

export const P_PKG_PMGR_R = new Package({
  name: 'Man-grouping',
  alias: 'PMGRR',
  parent: P_GRP_GROUPING_R,
  description: 'Reusable. Filtering.',
}, { kindPrefix: true })

export const P_PKG_PMGR1_N = new Package({
  name: 'Man-grouping-1',
  alias: 'PMGRN1',
  parent: P_GRP_GROUPING_N,
  description: 'Non-reusable. CRUD.',
}, { kindPrefix: true })

export const P_PKG_PMGR2_N = new Package({
  name: 'Man-grouping-2',
  alias: 'PMGRN2',
  parent: P_GRP_GROUPING_N,
  description: 'Non-reusable. Propagation; Activity history.',
}, { kindPrefix: true })

export const P_PKG_PPGR_REST_R = new Package({
  name: 'Prefix-grouping-rest',
  alias: 'PPGRREST',
  parent: P_GRP_GROUPING_R,
  restGroupingPrefix: '/api/{group}/',
  description: 'Reusable. Filtering by group; Comparison groups.',
}, { kindPrefix: true })

export const P_PKG_PPGR_GQL_R = new Package({
  name: 'Prefix-grouping-gql',
  alias: 'PPGRGQL',
  parent: P_GRP_GROUPING_R,
  restGroupingPrefix: '/api/{group}/',
  description: 'Reusable. Filtering by group; Comparison groups.',
}, { kindPrefix: true })

export const P_PKG_PPGR_SETTINGS_R = new Package({
  name: 'Prefix-grouping-settings',
  alias: 'PPGRSET',
  parent: P_GRP_GROUPING_R,
  description: 'Reusable. Prefix settings.',
}, { kindPrefix: true })

export const P_PKG_PPGR_EDIT_N = new Package({
  name: 'Prefix-grouping-editing',
  alias: 'PPGREDIT',
  parent: P_GRP_GROUPING_N,
  restGroupingPrefix: '/api/{group}/',
  description: 'Reusable. Prefix group editing.',
}, { kindPrefix: true })
