import { DASHBOARD_PREFIX } from '@test-data'
import { Dashboard } from '@test-data/props'
import { G_REV_IMM, G_REV_VAR, P_GR_CRUD, VAR_GR } from './groups'
import { P_WS_MAIN_R } from './workspaces'

export const D11 = new Dashboard({
  name: `${DASHBOARD_PREFIX}-11`,
  alias: 'D11',
  parent: P_WS_MAIN_R,
})
export const D12 = new Dashboard({
  name: `${DASHBOARD_PREFIX}-12`,
  alias: 'D12',
  parent: P_WS_MAIN_R,
})
export const D121 = new Dashboard({
  name: `${DASHBOARD_PREFIX}-121`,
  alias: 'D121',
  parent: VAR_GR,
})
export const D122 = new Dashboard({
  name: `${DASHBOARD_PREFIX}-122`,
  alias: 'D122',
  parent: VAR_GR,
})
export const D123 = new Dashboard({
  name: `${DASHBOARD_PREFIX}-123`,
  alias: 'D123',
  parent: VAR_GR,
})

export const D_REV_IMM = new Dashboard({
  name: 'Revisions-reusable',
  alias: 'DREVIMM',
  parent: G_REV_IMM,
}, { kindPrefix: true })
export const D_REV_VAR = new Dashboard({
  name: 'Revisions-non-reusable',
  alias: 'DREVVAR',
  parent: G_REV_VAR,
}, { kindPrefix: true })

export const P_DSH_CREATE = new Dashboard({
  name: `${DASHBOARD_PREFIX}-created`,
  alias: 'DCRT',
  parent: P_GR_CRUD,
})
export const P_DSH_UPDATE = new Dashboard({
  name: `${DASHBOARD_PREFIX}-update`,
  alias: 'DUPDT',
  parent: P_GR_CRUD,
  description: 'For update',
  testMeta: {
    updatedName: 'Updated',
    updatedServiceName: `dash-crud-${process.env.TEST_ID_N}`,
    updatedDescription: 'Updated',
  },
})
export const P_DSH_DELETE = new Dashboard({
  name: `${DASHBOARD_PREFIX}-delete`,
  alias: 'DDEL',
  parent: P_GR_CRUD,
  description: 'For delete',
})

export const P_DSH_FAV_LIST = new Dashboard({
  name: `${DASHBOARD_PREFIX}-favorite-list`,
  alias: 'DFAVL',
  parent: P_GR_CRUD,
  description: 'For add to favorite by list',
})
export const P_DSH_UNFAV_LIST = new Dashboard({
  name: `${DASHBOARD_PREFIX}-unfavorite-list`,
  alias: 'DUFAVL',
  parent: P_GR_CRUD,
  description: 'For remove from favorite by list',
})
export const P_DSH_UNFAV_FAV_PAGE = new Dashboard({
  name: `${DASHBOARD_PREFIX}-unfavorite-fav-page`,
  alias: 'DUFAVP',
  parent: P_GR_CRUD,
  description: 'For remove from favorite by Favorite page',
})
