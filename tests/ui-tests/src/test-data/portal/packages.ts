import { PACKAGE_PREFIX } from '@test-data'
import { Package } from '@test-data/props'
import {
  G_PUBLISH_IMM,
  G_PUBLISH_VAR,
  G_REV_IMM,
  G_REV_VAR,
  G_SETTINGS_VAR,
  IMM_GR,
  P_GR_CRUD,
  VAR_GR,
} from './groups'
import { RV_PATTERN_NEW } from './other'
import { P_WS_MAIN_R } from './workspaces'

export const PK11 = new Package({
  name: `${PACKAGE_PREFIX}-11`,
  alias: 'PK11',
  parent: P_WS_MAIN_R,
})
export const PK12 = new Package({
  name: `${PACKAGE_PREFIX}-12`,
  alias: 'PK12',
  parent: P_WS_MAIN_R,
})
export const PK13 = new Package({
  name: `${PACKAGE_PREFIX}-13`,
  alias: 'PK13',
  parent: P_WS_MAIN_R,
})
export const PK14 = new Package({
  name: `${PACKAGE_PREFIX}-14`,
  alias: 'PK14',
  parent: P_WS_MAIN_R,
})
export const PK15 = new Package({
  name: `${PACKAGE_PREFIX}-15`,
  alias: 'PK15',
  parent: P_WS_MAIN_R,
  description: 'Reusable. Additional cases.',
})
export const PK_GS = new Package({
  name: 'Global-Search',
  alias: 'PKGS',
  parent: VAR_GR,
  description: 'atuiPackageDescription',
  serviceName: `atuiServiceName${process.env.TEST_ID_N}`,
})
export const PK_REV_IMM = new Package({
  name: 'Revisions-reusable',
  alias: 'PKREVIMM',
  parent: G_REV_IMM,
}, { kindPrefix: true })
export const PK_REV_VAR = new Package({
  name: 'Revisions-non-reusable',
  alias: 'PKREVVAR',
  parent: G_REV_VAR,
}, { kindPrefix: true })
export const PK_PUB_IMM_1 = new Package({
  name: 'Publish-reusable-1',
  alias: 'PKPUBIMM1',
  parent: G_PUBLISH_IMM,
}, { kindPrefix: true })
export const PK_PUB_IMM_2 = new Package({
  name: 'Publish-reusable-2',
  alias: 'PKPUBIMM2',
  parent: G_PUBLISH_IMM,
  releaseVersionPattern: RV_PATTERN_NEW,
}, { kindPrefix: true })
export const PK_PUB_IMM_3 = new Package({
  name: 'Publish-reusable-3',
  alias: 'PKPUBIMM3',
  parent: G_PUBLISH_IMM,
}, { kindPrefix: true })
export const PK_PUB_VAR_1 = new Package({
  name: 'Publish-non-reusable-1',
  alias: 'PKPUBVAR1',
  parent: G_PUBLISH_VAR,
}, { kindPrefix: true })
export const PK_PUB_VAR_2 = new Package({
  name: 'Publish-non-reusable-2',
  alias: 'PKPUBVAR2',
  parent: G_PUBLISH_VAR,
}, { kindPrefix: true })
export const PK_SETTINGS_1 = new Package({
  name: 'Settings-1',
  alias: 'PKSETVAR1',
  parent: G_SETTINGS_VAR,
}, { kindPrefix: true })
export const PK_SETTINGS_2 = new Package({
  name: 'Settings-2',
  alias: 'PKSETVAR2',
  parent: G_SETTINGS_VAR,
  description: 'settings description',
  serviceName: `settings-${process.env.TEST_ID_N}`,
}, { kindPrefix: true })
export const PK_SETTINGS_3 = new Package({
  name: 'Settings-3',
  alias: 'PKSETVAR3',
  parent: G_SETTINGS_VAR,
}, { kindPrefix: true })
export const P_PK_CREATE = new Package({
  name: `${PACKAGE_PREFIX}-created`,
  alias: 'PKCRT',
  parent: P_GR_CRUD,
})
export const P_PK_DELETE = new Package({
  name: `${PACKAGE_PREFIX}-delete`,
  alias: 'PKDEL',
  parent: P_GR_CRUD,
  description: 'For delete',
})
export const P_PK_FAV_LIST = new Package({
  name: `${PACKAGE_PREFIX}-favorite-list`,
  alias: 'PKFAVL',
  parent: P_GR_CRUD,
  description: 'For add to favorite by list',
})
export const P_PK_UNFAV_LIST = new Package({
  name: `${PACKAGE_PREFIX}-unfavorite-list`,
  alias: 'PKUFAVL',
  parent: P_GR_CRUD,
  description: 'For remove from favorite by list',
})
export const P_PK_UNFAV_FAV_PAGE = new Package({
  name: `${PACKAGE_PREFIX}-unfavorite-fav-page`,
  alias: 'PKUFAVP',
  parent: P_GR_CRUD,
  description: 'For remove from favorite by Favorite page',
})
export const P_PK_SAME_ALIAS = new Package({
  name: `${PACKAGE_PREFIX}-same-alias`,
  alias: P_PK_FAV_LIST.alias,
  parent: P_GR_CRUD,
})
export const P_PK_ALIAS_MORE_10 = new Package({
  name: `${PACKAGE_PREFIX}-alias-more-than-10-symbols`,
  alias: '12345678910',
  parent: P_GR_CRUD,
})
export const P_PK_PGND = new Package({
  name: 'Playground',
  alias: 'PPGND',
  parent: IMM_GR,
  serviceName: 'test-service',
}, { kindPrefix: true })
