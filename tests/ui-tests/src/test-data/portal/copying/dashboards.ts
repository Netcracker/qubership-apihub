import { Dashboard } from '@test-data/props'
import { P_GR_COPYING_IMM, P_GR_COPYING_VAR } from './groups'
import { RV_PATTERN_NEW } from '../other'

export const P_DSH_CP_SOURCE = new Dashboard({
  name: 'Copying-source',
  alias: 'DCPSRC',
  parent: P_GR_COPYING_IMM,
  description: 'Reusable source dashboard for "copying versions"',
}, { kindPrefix: true })
export const P_DSH_CP_EMPTY = new Dashboard({
  name: 'Copying-empty',
  alias: 'DCPEMPT',
  parent: P_GR_COPYING_VAR,
  description: 'Non-reusable target dashboard for "copy to empty versions"',
}, { kindPrefix: true })
export const P_DSH_CP_RELEASE = new Dashboard({
  name: 'Copying-release',
  alias: 'DCPRLSE',
  parent: P_GR_COPYING_VAR,
  description: 'Non-reusable target dashboard for "copy with previous version"',
}, { kindPrefix: true })
export const P_DSH_CP_PATTERN = new Dashboard({
  name: 'Copying-pattern',
  alias: 'DCPPTRN',
  parent: P_GR_COPYING_IMM,
  releaseVersionPattern: RV_PATTERN_NEW,
  description: 'Reusable target dashboard for "copy with wrong pattern"',
}, { kindPrefix: true })
